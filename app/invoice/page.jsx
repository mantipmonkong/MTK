'use client';
import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThaiBahtText } from '../../lib/thaiBahtText';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [invoice, setInvoice] = useState(null);
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef(null);

    useEffect(() => {
        if (id) {
            fetchInvoice(id);
        } else {
            setLoading(false);
        }
    }, [id]);

    const fetchInvoice = async (invoiceId) => {
        try {
            const { data: billData, error: billError } = await supabase
                .from('billings')
                .select('*')
                .eq('id', invoiceId)
                .single();
            if (billError) throw billError;
            
            const { data: quoteData, error: quoteError } = await supabase
                .from('quotations')
                .select('*, projects(*, contacts(*))')
                .eq('id', billData.quotation_id)
                .single();
            if (quoteError) throw quoteError;

            setInvoice(billData);
            setQuote(quoteData);
        } catch (error) {
            console.error('Error fetching invoice:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (num) => {
        return Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Calculate invoice parts based on quote's VAT and WHT rates
    let invSubTotal = invoice?.total_amount || 0;
    let invVatAmount = 0;
    let invWhtAmount = 0;
    let invGrossTotal = invoice?.total_amount || 0;
    let invWhtRate = quote?.wht_rate || 0;
    
    if (invoice && quote) {
        if (invoice.type === 'receipt' && invoice.status && invoice.status.includes('WHT:')) {
            const match = invoice.status.match(/WHT:(\d+)/);
            if (match) invWhtRate = Number(match[1]);
        }

        if (quote.vat_rate > 0 || invWhtRate > 0) {
            const factor = 1 + (quote.vat_rate / 100);
            invSubTotal = Number((invoice.total_amount / factor).toFixed(2));
            invVatAmount = Number((invSubTotal * (quote.vat_rate / 100)).toFixed(2));
            invWhtAmount = Number((invSubTotal * (invWhtRate / 100)).toFixed(2));
            invGrossTotal = invSubTotal + invVatAmount;
        }
    }

    const handleDownloadPdf = async () => {
        const element = printRef.current;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            
            // A4 size in mm
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            
            const margin = 0; // No margin in PDF as A4 container handles it
            const width = pdfWidth - (margin * 2);
            const height = (imgProps.height * width) / imgProps.width;

            pdf.addImage(imgData, 'PNG', margin, margin, width, height);
            pdf.save('quotation.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('เกิดข้อผิดพลาดในการสร้าง PDF');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="quotation-container">
            <style jsx>{`
                .quotation-container {
                    min-height: 100vh;
                    background: var(--background, #f1f5f9);
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-family: 'Sarabun', 'Inter', sans-serif; /* Recommended Thai font */
                }

                .actions-bar {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    padding: 16px 32px;
                    background: var(--surface, #ffffff);
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    z-index: 10;
                }

                .btn {
                    padding: 10px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-primary {
                    background: var(--primary, #6366f1);
                    color: white;
                }
                .btn-primary:hover {
                    background: var(--primary-hover, #4f46e5);
                    transform: translateY(-2px);
                }

                .btn-outline {
                    background: transparent;
                    border: 2px solid var(--primary, #6366f1);
                    color: var(--primary, #6366f1);
                }
                .btn-outline:hover {
                    background: rgba(99, 102, 241, 0.05);
                    transform: translateY(-2px);
                }

                /* A4 Paper Styling */
                .a4-paper {
                    background: white;
                    width: 210mm;
                    height: 297mm;
                    padding: 12mm 15mm;
                    box-sizing: border-box;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border-radius: 4px; /* subtle curve in web, straight in print */
                    position: relative;
                    color: #000;
                    font-size: 13px;
                    line-height: 1.4;
                    display: flex;
                    flex-direction: column;
                }

                /* Modern Header */
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                }

                .company-info {
                    flex: 1;
                }

                .company-name {
                    font-size: 18px;
                    font-weight: 700;
                    color: #000;
                    margin-bottom: 6px;
                }
                
                .doc-type {
                    text-align: right;
                }

                .doc-tag {
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                }

                .doc-title {
                    font-size: 20px;
                    font-weight: 700;
                    padding: 4px 16px;
                    border: 2px solid #000;
                    color: #000;
                    display: inline-block;
                    border-radius: 4px;
                    margin-top: 12px;
                }

                /* Customer Info */
                .customer-info-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: -1px;
                    margin-bottom: 12px;
                    border: 1px solid #000;
                    border-radius: 0;
                    overflow: hidden;
                }

                .info-box {
                    border: 1px solid #000;
                    padding: 6px 12px;
                }
                .info-label {
                    font-weight: 600;
                    color: #000;
                    margin-right: 8px;
                }
                .info-value {
                    color: #000;
                }

                /* Table Styling */
                .quote-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 12px;
                }
                
                .quote-table th {
                    background: #f1f5f9;
                    color: #000;
                    padding: 6px 8px;
                    font-weight: 700;
                    border: 1px solid #000;
                    text-align: center;
                }
                
                .quote-table td {
                    padding: 6px 8px;
                    border: 1px solid #000;
                    vertical-align: top;
                }

                .col-no { width: 8%; text-align: center; }
                .col-desc { width: 45%; }
                .col-qty { width: 12%; text-align: center; }
                .col-price { width: 15%; text-align: right; }
                .col-amount { width: 20%; text-align: right; }

                .item-main {
                    font-weight: 700;
                    margin-bottom: 2px;
                    font-size: 13px;
                }
                .item-sub {
                    color: #334155;
                    font-size: 11px;
                }

                /* Summary Section */
                .summary-container {
                    display: flex;
                    border: 1px solid #000;
                    margin-top: -12px; /* overlap table border */
                }

                .amount-in-words {
                    flex: 1;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-style: italic;
                    border-right: 1px solid #000;
                }

                .summary-totals {
                    width: 35%; /* matches col-price + col-amount roughly */
                }

                .summary-row {
                    display: flex;
                    border-bottom: 1px solid #000;
                }
                .summary-row:last-child {
                    border-bottom: none;
                    background: #f1f5f9;
                    font-weight: 700;
                }
                
                .summary-label {
                    flex: 1;
                    padding: 8px 8px;
                    border-right: 1px solid #000;
                }
                .summary-value {
                    width: 57%; /* roughly col-amount width */
                    padding: 8px 8px;
                    text-align: right;
                }

                /* Signatures */
                .signatures {
                    display: flex;
                    justify-content: space-around;
                    margin-top: auto;
                    padding-top: 16px;
                }

                .signature-box {
                    width: 200px;
                    text-align: center;
                    border: 1px solid #000;
                    padding: 24px 20px 10px;
                    border-radius: 0;
                }

                .signature-line {
                    border-bottom: 1px dashed #000;
                    margin-bottom: 8px;
                    height: 30px;
                }

                /* Print Styles */
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .quotation-container {
                        background: white;
                        padding: 0;
                    }
                    .actions-bar {
                        display: none;
                    }
                    .a4-paper, .a4-paper * {
                        visibility: visible;
                    }
                    .a4-paper {
                        position: absolute;
                        left: 0;
                        top: 0;
                        margin: 0;
                        padding: 20mm;
                        box-shadow: none;
                        border-radius: 0;
                        width: 100%;
                    }
                    
                    /* Force background colors for print */
                    .quote-table th {
                        background-color: #f1f5f9 !important;
                        color: #000 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .summary-row:last-child {
                        background-color: #f1f5f9 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div className="actions-bar">
                <button className="btn btn-outline" onClick={handlePrint}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    พิมพ์เอกสาร (Print)
                </button>
                <button className="btn btn-primary" onClick={handleDownloadPdf}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    บันทึกเป็น PDF
                </button>
            </div>

            <div className="a4-paper" ref={printRef}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>กำลังโหลดข้อมูลใบแจ้งหนี้...</div>
                ) : !invoice || !quote ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>ไม่พบข้อมูลใบแจ้งหนี้ หรือคุณยังไม่ได้ระบุ ID</div>
                ) : (
                <>
                <div className="header-section">
                    <div className="company-info">
                        <div className="company-name">ม่านทิพย์มั่นคง (สำนักงานใหญ่)</div>
                        <div>เลขที่ 58/50 หมู่บ้านเสนานิเวศน์ ซ.118</div>
                        <div>ถนนหมู่บ้านเสนานิคม แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230</div>
                        <div style={{ marginTop: '8px' }}>
                            TEL. 02 015 4697 FAX. 02 015 4697 Mobile. 092 929 4424
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            เลขประจำตัวผู้เสียภาษี 3100602293948
                        </div>
                    </div>
                    <div className="doc-type">
                        <div className="doc-tag" style={{ color: '#000' }}>ต้นฉบับ</div>
                        <div className="doc-title">{invoice.type === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จรับเงิน'}</div>
                        <div style={{ marginTop: '8px', fontWeight: 700, color: '#000' }}>
                            เลขที่: {invoice.id}
                        </div>
                        {quote.po_number && (
                            <div style={{ marginTop: '4px', fontWeight: 700, color: '#000' }}>
                                อ้างอิง PO: {quote.po_number}
                            </div>
                        )}
                    </div>
                </div>

                <div className="customer-info-grid">
                    <div className="info-box" style={{ gridColumn: '1 / 2' }}>
                        <span className="info-label">นามลูกค้า:</span>
                        <span className="info-value">{quote.customer_name || quote.projects?.contacts?.name || '-'}</span>
                    </div>
                    <div className="info-box" style={{ gridColumn: '2 / 3' }}>
                        <span className="info-label">วันที่:</span>
                        <span className="info-value">{new Date(invoice.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="info-box" style={{ gridColumn: '1 / 3' }}>
                        <span className="info-label">เลขประจำตัวผู้เสียภาษี:</span>
                        <span className="info-value">{quote.customer_tax_id || quote.projects?.contacts?.tax_id || '-'}</span>
                    </div>
                    <div className="info-box" style={{ gridColumn: '1 / 3' }}>
                        <span className="info-label">ที่อยู่:</span>
                        <span className="info-value">{quote.customer_address || quote.projects?.contacts?.address || '-'}</span>
                    </div>
                </div>

                <table className="quote-table">
                    <thead>
                        <tr>
                            <th className="col-no">ลำดับที่<br/>NO.</th>
                            <th className="col-desc">ชื่อสินค้า/บริการ<br/>DESCRIPTION</th>
                            <th className="col-qty">จำนวน<br/>QTY.</th>
                            <th className="col-price">ราคา/หน่วย<br/>UNIT PRICE</th>
                            <th className="col-amount">จำนวนเงิน/บาท<br/>AMOUNT/THB</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="col-no">1.</td>
                            <td className="col-desc">
                                <div className="item-main">เรียกเก็บเงินตามใบเสนอราคาอ้างอิง: {quote.id}</div>
                                {invoice.total_amount < quote.total_amount && (
                                    <div className="item-sub">
                                        (แบ่งชำระจากยอดเต็ม ฿{formatMoney(quote.total_amount)})
                                    </div>
                                )}
                            </td>
                            <td className="col-qty">1</td>
                            <td className="col-price">{formatMoney(invSubTotal)}</td>
                            <td className="col-amount">{formatMoney(invSubTotal)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="summary-container">
                    <div className="amount-in-words">
                        ({ThaiBahtText(invoice.type === 'invoice' ? invGrossTotal : invoice.total_amount)})
                    </div>
                    <div className="summary-totals">
                        <div className="summary-row">
                            <div className="summary-label">รวมเป็นเงิน</div>
                            <div className="summary-value">{formatMoney(invSubTotal)}</div>
                        </div>
                        {quote.vat_rate > 0 && (
                            <div className="summary-row">
                                <div className="summary-label">ภาษีมูลค่าเพิ่ม {quote.vat_rate}%</div>
                                <div className="summary-value">{formatMoney(invVatAmount)}</div>
                            </div>
                        )}
                        
                        {invoice.type !== 'invoice' && invWhtRate > 0 && (
                            <>
                            <div className="summary-row">
                                <div className="summary-label">จำนวนเงินทั้งสิ้น</div>
                                <div className="summary-value">{formatMoney(invGrossTotal)}</div>
                            </div>
                            <div className="summary-row">
                                <div className="summary-label">หัก ณ ที่จ่าย {invWhtRate}%</div>
                                <div className="summary-value">-{formatMoney(invWhtAmount)}</div>
                            </div>
                            </>
                        )}
                        
                        <div className="summary-row">
                            <div className="summary-label" style={{ fontWeight: 700 }}>
                                {invoice.type !== 'invoice' && invWhtRate > 0 ? 'ยอดรับชำระสุทธิ' : 'จำนวนเงินทั้งสิ้น'}
                            </div>
                            <div className="summary-value" style={{ fontWeight: 700 }}>
                                {formatMoney(invoice.type === 'invoice' ? invGrossTotal : invGrossTotal - invWhtAmount)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="signatures">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <div style={{ fontWeight: 700 }}>ผู้รับเงิน</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>วันที่ ........./........./.........</div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <div style={{ fontWeight: 700 }}>ผู้จ่ายเงิน</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>วันที่ ........./........./.........</div>
                    </div>
                </div>
                </>
                )}
            </div>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div>กำลังโหลด...</div>}>
            <InvoiceContent />
        </Suspense>
    );
}
