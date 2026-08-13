"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id;

  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // UI State
  const [activeTab, setActiveTab] = useState('quotations');

  // Mock Data State
  const [project, setProject] = useState({
    id: projectId,
    customer: 'บจก. ก่อสร้างพัฒนา',
    objective: 'ทำคู่เทียบ',
    internalAccount: 'บริษัท แมนทิป จำกัด',
    status: 'รออนุมัติ', // รอเสนอราคา, อนุมัติแล้ว, เสร็จสิ้น
  });

  const [quotations, setQuotations] = useState([
    { id: 'QT-2608-01', total: 150000, status: 'รอพิจารณา', date: '2026-08-10' },
    { id: 'QT-2608-02', total: 145000, status: 'อนุมัติแล้ว', date: '2026-08-12' },
  ]);

  const [billings, setBillings] = useState([
    { id: 'INV-2608-01', refQuote: 'QT-2608-02', total: 145000, status: 'รอชำระเงิน', type: 'invoice' }
  ]);

  const [expenses, setExpenses] = useState([
    { id: 1, desc: 'ค่าวัสดุเบื้องต้น', amount: 50000, date: '2026-08-13' }
  ]);

  const isApproved = quotations.some(q => q.status === 'อนุมัติแล้ว');
  
  const totalIncome = billings.filter(b => b.type === 'receipt').reduce((s, b) => s + b.total, 0); // Only count actual receipts as income, or use invoice for accrued income
  const totalAccruedIncome = billings.filter(b => b.type === 'invoice').reduce((s, b) => s + b.total, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const expectedProfit = totalAccruedIncome - totalExpense;

  const handleApproveQuote = (id) => {
    setQuotations(quotations.map(q => q.id === id ? { ...q, status: 'อนุมัติแล้ว' } : { ...q, status: 'ยกเลิก' }));
    setProject({ ...project, status: 'อนุมัติแล้ว' });
  };

  const handleCreateInvoice = (quoteId, amount) => {
    const newInv = { id: `INV-2608-0${billings.length + 2}`, refQuote: quoteId, total: amount, status: 'รอชำระเงิน', type: 'invoice' };
    setBillings([...billings, newInv]);
  };

  const handleReceivePayment = (invId) => {
    setBillings(billings.map(b => b.id === invId ? { ...b, status: 'ชำระแล้ว' } : b));
    const inv = billings.find(b => b.id === invId);
    if(inv) {
      setBillings(prev => [...prev, { id: `REC-2608-0${prev.length + 1}`, refQuote: inv.refQuote, total: inv.total, status: 'รับเงินแล้ว', type: 'receipt' }]);
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Link href="/projects" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i> กลับ</Link>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
          <span style={{ background: isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isApproved ? '#a7f3d0' : '#fde68a', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            {project.status}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '32px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{project.id}</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', marginTop: '4px', display: 'flex', gap: '16px' }}>
              <span><i className="fa-solid fa-building"></i> ลูกค้า: {project.customer}</span>
              <span><i className="fa-solid fa-bullseye"></i> จุดประสงค์: {project.objective}</span>
              <span><i className="fa-solid fa-wallet"></i> บัญชี: {project.internalAccount}</span>
            </p>
          </div>
          {isApproved && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '24px', backdropFilter: 'blur(4px)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>มูลค่าโครงการ</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>฿{formatMoney(totalAccruedIncome)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>กำไร/ขาดทุน (คาดการณ์)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: expectedProfit >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                  ฿{formatMoney(expectedProfit)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)' }}>
        <button onClick={() => setActiveTab('quotations')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'quotations' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'quotations' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'quotations' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer' }}>
          <i className="fa-solid fa-file-contract"></i> ใบเสนอราคา
        </button>
        <button onClick={() => setActiveTab('billing')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'billing' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'billing' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'billing' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer', opacity: isApproved ? 1 : 0.5 }}>
          <i className="fa-solid fa-file-invoice-dollar"></i> เรียกเก็บเงิน (Billing) {isApproved ? '' : <i className="fa-solid fa-lock" style={{ fontSize: '12px', marginLeft: '4px' }}></i>}
        </button>
        <button onClick={() => setActiveTab('expenses')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'expenses' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'expenses' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer', opacity: isApproved ? 1 : 0.5 }}>
          <i className="fa-solid fa-receipt"></i> ค่าใช้จ่ายโปรเจกต์ {isApproved ? '' : <i className="fa-solid fa-lock" style={{ fontSize: '12px', marginLeft: '4px' }}></i>}
        </button>
      </div>

      {/* TAB CONTENT: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>ใบเสนอราคาที่เกี่ยวข้อง (Quotations)</h3>
            <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer' }}>
              <i className="fa-solid fa-plus"></i> สร้างใบเสนอราคา
            </button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>เลขที่เอกสาร</th>
                <th>วันที่สร้าง</th>
                <th style={{ textAlign: 'right' }}>ยอดรวม</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--primary)' }}>{q.id}</td>
                  <td>{q.date}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{formatMoney(q.total)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ 
                      background: q.status === 'อนุมัติแล้ว' ? 'rgba(16, 185, 129, 0.1)' : q.status === 'ยกเลิก' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                      color: q.status === 'อนุมัติแล้ว' ? 'var(--secondary)' : q.status === 'ยกเลิก' ? 'var(--danger)' : 'var(--warning)', 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {q.status === 'รอพิจารณา' && (
                      <button onClick={() => handleApproveQuote(q.id)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '12px' }}>
                        <i className="fa-solid fa-check"></i> อนุมัติ
                      </button>
                    )}
                    <button className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><i className="fa-solid fa-pen"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: BILLING */}
      {activeTab === 'billing' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          {!isApproved ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-lock" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>ฟีเจอร์เรียกเก็บเงินถูกล็อก</h3>
              <p>คุณต้องอนุมัติใบเสนอราคาอย่างน้อย 1 ใบก่อน จึงจะสามารถเปิดบิลแจ้งหนี้ได้</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>รายการเรียกเก็บเงิน (Invoices & Receipts)</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {quotations.filter(q => q.status === 'อนุมัติแล้ว').map(q => (
                    <button key={q.id} onClick={() => handleCreateInvoice(q.id, q.total)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer' }}>
                      <i className="fa-solid fa-file-invoice"></i> เปิดบิลแจ้งหนี้ (จาก {q.id})
                    </button>
                  ))}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>เลขที่เอกสาร</th>
                    <th>ประเภท</th>
                    <th>อ้างอิงใบเสนอราคา</th>
                    <th style={{ textAlign: 'right' }}>ยอดเรียกเก็บ</th>
                    <th style={{ textAlign: 'center' }}>สถานะ</th>
                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px', fontWeight: 600 }}>{b.id}</td>
                      <td>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: b.type === 'invoice' ? '#e0f2fe' : '#dcfce3', color: b.type === 'invoice' ? '#0369a1' : '#166534', fontSize: '12px' }}>
                          {b.type === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จรับเงิน'}
                        </span>
                      </td>
                      <td>{b.refQuote}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{formatMoney(b.total)}</td>
                      <td style={{ textAlign: 'center' }}>
                         <span style={{ 
                            background: b.status === 'รับเงินแล้ว' || b.status === 'ชำระแล้ว' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                            color: b.status === 'รับเงินแล้ว' || b.status === 'ชำระแล้ว' ? 'var(--secondary)' : 'var(--warning)', 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                          }}>
                            {b.status}
                          </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {b.type === 'invoice' && b.status === 'รอชำระเงิน' && (
                          <button onClick={() => handleReceivePayment(b.id)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '12px' }}>
                            <i className="fa-solid fa-hand-holding-dollar"></i> รับชำระเงิน
                          </button>
                        )}
                        <button className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><i className="fa-solid fa-print"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          {!isApproved ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-lock" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}></i>
              <h3>ฟีเจอร์ลงค่าใช้จ่ายถูกล็อก</h3>
              <p>โปรเจกต์ต้องได้รับอนุมัติก่อน จึงจะสามารถลงบันทึกต้นทุนและค่าใช้จ่ายได้</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>ต้นทุนและค่าใช้จ่ายโปรเจกต์</h3>
                <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer' }}>
                  <i className="fa-solid fa-plus"></i> บันทึกค่าใช้จ่าย
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>วันที่</th>
                    <th>รายการค่าใช้จ่าย</th>
                    <th style={{ textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px' }}>{exp.date}</td>
                      <td>{exp.desc}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--danger)' }}>฿{formatMoney(exp.amount)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}><i className="fa-solid fa-trash-can"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                    <td colSpan="2" style={{ padding: '16px 12px', textAlign: 'right' }}>รวมต้นทุนสะสม:</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>฿{formatMoney(totalExpense)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      )}

    </div>
  );
}
