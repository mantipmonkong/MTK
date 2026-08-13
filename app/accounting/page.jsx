"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function AccountingDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Data
  const [billings, setBillings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [quotations, setQuotations] = useState([]);
  
  const [activeTab, setActiveTab] = useState('sales_tax'); // sales_tax, purchase_tax, wht

  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const fetchAccountingData = async () => {
    setIsLoading(true);
    
    // 1. Fetch Receipts (Sales Tax basis)
    const { data: bData } = await supabase
      .from('billings')
      .select('*, projects(id, objective, contacts(name))')
      .eq('type', 'receipt');
      
    if (bData) setBillings(bData);

    // 2. Fetch all approved quotations to match VAT/WHT data to receipts
    const { data: qData } = await supabase
      .from('quotations')
      .select('*')
      .eq('status', 'อนุมัติแล้ว');
      
    if (qData) setQuotations(qData);

    // 3. Fetch Expenses (Purchase Tax basis)
    const { data: eData } = await supabase
      .from('project_expenses')
      .select('*, projects(id, objective), contacts(name)')
      .eq('is_tax_invoice', true)
      .order('created_at', { ascending: false });
      
    if (eData) setExpenses(eData);

    setIsLoading(false);
  };

  // --- Calculate Sales Tax Data ---
  // A receipt matches a quotation. If quotation has vat_rate > 0, then we have sales tax.
  // The receipt might be for a partial amount, but assuming full amount for simplicity right now.
  const salesTaxItems = billings.map(bill => {
    const quote = quotations.find(q => q.id === bill.quotation_id);
    if (!quote) return null;
    
    // For simplicity, assuming the receipt amount is the quote total_amount.
    // So VAT of this receipt = quote.vat_amount
    const isFullPayment = bill.total_amount >= quote.total_amount;
    const vat = isFullPayment ? quote.vat_amount : (bill.total_amount * 7 / 107); // rough estimate if partial
    const subTotal = isFullPayment ? quote.sub_total : (bill.total_amount * 100 / 107);
    const wht = isFullPayment ? quote.wht_amount : 0;
    
    return {
      ...bill,
      quote_id: quote.id,
      customer: bill.projects?.contacts?.name || 'ลูกค้าทั่วไป',
      subTotal: quote.vat_rate > 0 ? subTotal : bill.total_amount,
      vatAmount: quote.vat_rate > 0 ? vat : 0,
      whtAmount: wht,
      hasVat: quote.vat_rate > 0
    };
  }).filter(Boolean);

  const totalSalesRevenue = salesTaxItems.reduce((sum, item) => sum + Number(item.subTotal), 0);
  const totalSalesVat = salesTaxItems.reduce((sum, item) => sum + Number(item.vatAmount), 0);
  const totalWhtDeducted = salesTaxItems.reduce((sum, item) => sum + Number(item.whtAmount), 0);

  // --- Calculate Purchase Tax Data ---
  const totalPurchaseExpenses = expenses.reduce((sum, e) => sum + Number(e.sub_total || e.amount), 0);
  const totalPurchaseVat = expenses.reduce((sum, e) => sum + Number(e.vat_amount || 0), 0);
  const totalWhtWithheld = expenses.reduce((sum, e) => sum + Number(e.wht_amount || 0), 0);

  // --- Net Tax ---
  const netVatPayable = totalSalesVat - totalPurchaseVat;

  if (isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูลทางบัญชี...</div>;

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', marginBottom: '24px' }}>
        <h1 style={{ color: 'white', fontSize: '32px', marginBottom: '8px' }}>
          <i className="fa-solid fa-building-columns"></i> บัญชีบริษัท (ส่งสรรพากร)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>สรุปรายการภาษีซื้อ ภาษีขาย และหัก ณ ที่จ่าย สำหรับยื่นภาษีประจำเดือน</p>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>ภาษีขายรวม (Sales Tax)</div>
          <div className="stat-value" style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>฿{formatMoney(totalSalesVat)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>จากฐานรายได้: ฿{formatMoney(totalSalesRevenue)}</div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: '4px solid #f43f5e' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>ภาษีซื้อรวม (Purchase Tax)</div>
          <div className="stat-value" style={{ fontSize: '28px', fontWeight: 'bold', color: '#f43f5e' }}>฿{formatMoney(totalPurchaseVat)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>จากฐานค่าใช้จ่าย: ฿{formatMoney(totalPurchaseExpenses)}</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: '4px solid #10b981' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>ภาษีมูลค่าเพิ่มที่ต้องชำระ (นำส่ง)</div>
          <div className="stat-value" style={{ fontSize: '28px', fontWeight: 'bold', color: netVatPayable > 0 ? '#f43f5e' : '#10b981' }}>
            {netVatPayable > 0 ? 'นำส่ง: ' : 'ขอคืน: '} ฿{formatMoney(Math.abs(netVatPayable))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>ภาษีขาย - ภาษีซื้อ</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>ภาษีถูกหัก ณ ที่จ่าย (รอขอคืน)</div>
          <div className="stat-value" style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>฿{formatMoney(totalWhtDeducted)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>จากการรับชำระเงินลูกค้า</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)' }}>
        <button onClick={() => setActiveTab('sales_tax')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'sales_tax' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'sales_tax' ? '#3b82f6' : 'var(--text-muted)', fontWeight: activeTab === 'sales_tax' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer' }}>
          รายงานภาษีขาย (ภ.พ.30)
        </button>
        <button onClick={() => setActiveTab('purchase_tax')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'purchase_tax' ? '3px solid #f43f5e' : '3px solid transparent', color: activeTab === 'purchase_tax' ? '#f43f5e' : 'var(--text-muted)', fontWeight: activeTab === 'purchase_tax' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer' }}>
          รายงานภาษีซื้อ (ภ.พ.30)
        </button>
      </div>

      {/* SALES TAX TAB */}
      {activeTab === 'sales_tax' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>รายการภาษีขาย (จากใบเสร็จรับเงินที่มี VAT)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '14px' }}>
                <th style={{ padding: '12px' }}>วันที่รับเงิน</th>
                <th>เลขที่เอกสาร</th>
                <th>ลูกค้า</th>
                <th style={{ textAlign: 'right' }}>มูลค่าสินค้า/บริการ</th>
                <th style={{ textAlign: 'right' }}>จำนวนภาษี (VAT)</th>
                <th style={{ textAlign: 'right' }}>ถูกหัก ณ ที่จ่าย</th>
              </tr>
            </thead>
            <tbody>
              {salesTaxItems.filter(i => i.hasVat).length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการภาษีขาย</td></tr> : null}
              {salesTaxItems.filter(i => i.hasVat).map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <td style={{ padding: '16px 12px' }}>{new Date(item.created_at).toLocaleDateString('th-TH')}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 500 }}>
                    <Link href={`/projects/${item.project_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {item.id} <br/><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>อ้างอิง: {item.quote_id}</span>
                    </Link>
                  </td>
                  <td>{item.customer}</td>
                  <td style={{ textAlign: 'right' }}>฿{formatMoney(item.subTotal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: '#3b82f6' }}>฿{formatMoney(item.vatAmount)}</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b' }}>{item.whtAmount > 0 ? `฿${formatMoney(item.whtAmount)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PURCHASE TAX TAB */}
      {activeTab === 'purchase_tax' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>รายการภาษีซื้อ (จากค่าใช้จ่ายที่เป็นใบกำกับภาษี)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '14px' }}>
                <th style={{ padding: '12px' }}>วันที่บันทึก</th>
                <th>รายละเอียด/ผู้ขาย</th>
                <th>โปรเจกต์</th>
                <th style={{ textAlign: 'right' }}>มูลค่าสินค้า/บริการ</th>
                <th style={{ textAlign: 'right' }}>จำนวนภาษี (VAT)</th>
                <th style={{ textAlign: 'right' }}>หัก ณ ที่จ่าย (พ.ง.ด.)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการภาษีซื้อ</td></tr> : null}
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <td style={{ padding: '16px 12px' }}>{new Date(e.created_at).toLocaleDateString('th-TH')}</td>
                  <td>
                    <div>{e.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><i className="fa-solid fa-store"></i> {e.contacts?.name || 'ไม่ระบุซัพพลายเออร์'}</div>
                  </td>
                  <td>
                    <Link href={`/projects/${e.project_id}`} style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                      {e.project_id}
                    </Link>
                  </td>
                  <td style={{ textAlign: 'right' }}>฿{formatMoney(e.sub_total || e.amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: '#f43f5e' }}>฿{formatMoney(e.vat_amount)}</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b' }}>{e.wht_amount > 0 ? `฿${formatMoney(e.wht_amount)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
