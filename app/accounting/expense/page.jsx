"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function ExpenseAccounting() {
  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', isInternalTransfer: false });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    
    const { data: eData } = await supabase
      .from('project_expenses')
      .select('*, projects(id), contacts(name)')
      .order('expense_date', { ascending: false });

    if (eData) {
      const processedExpenses = eData.map(exp => {
        let whtType = 'ไม่หัก';
        const subTotal = Number(exp.sub_total) || Number(exp.amount) || 0;
        const whtAmount = Number(exp.wht_amount) || 0;
        
        if (whtAmount > 0 && subTotal > 0) {
          const ratio = Math.round((whtAmount / subTotal) * 100);
          whtType = ratio === 3 ? '3%' : (ratio === 1 ? '1%' : 'หัก ณ ที่จ่าย');
        }

        return {
          id: exp.id,
          date: new Date(exp.expense_date || exp.created_at).toLocaleDateString('th-TH'),
          docNo: exp.id,
          supplier: exp.contacts?.name || 'ไม่ระบุผู้จำหน่าย',
          desc: exp.description || 'ค่าใช้จ่าย',
          subTotal: subTotal,
          vat: Number(exp.vat_amount) || 0,
          whtType: whtType,
          whtAmount: whtAmount,
          netPay: Number(exp.amount) || (subTotal + (Number(exp.vat_amount) || 0) - whtAmount)
        };
      });
      
      setExpenses(processedExpenses);
    }
    setIsLoading(false);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.desc || !newExpense.amount) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');

    setIsLoading(true);

    const expData = {
      description: newExpense.desc,
      amount: newExpense.amount,
      sub_total: newExpense.amount,
      expense_date: new Date().toISOString().split('T')[0]
    };
    const { error: expError } = await supabase.from('project_expenses').insert([expData]);

    if (expError) {
      alert('เกิดข้อผิดพลาดในการบันทึกรายจ่าย: ' + expError.message);
      setIsLoading(false);
      return;
    }

    if (newExpense.isInternalTransfer) {
      const fundData = {
        amount: newExpense.amount,
        note: `รับโอนจากค่าใช้จ่ายบริษัท: ${newExpense.desc}`,
        source: 'corporate_transfer',
        internal_account_id: null
      };
      await supabase.from('fund_deposits').insert([fundData]);
    }

    setNewExpense({ desc: '', amount: '', isInternalTransfer: false });
    setShowForm(false);
    fetchExpenses();
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/accounting" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i></Link>
            บันทึกรายจ่าย (ภาษีซื้อ & WHT)
          </h1>
          <p>บันทึกค่าใช้จ่าย, ภาษีซื้อ และหนังสือรับรองการหัก ณ ที่จ่าย</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)' }}>
          <i className="fa-solid fa-plus"></i> บันทึกรายจ่ายใหม่
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveExpense} className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--danger)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>แบบฟอร์มบันทึกรายจ่ายใหม่</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'14px', fontWeight:500}}>รายละเอียด <span style={{color: 'red'}}>*</span></label>
              <input type="text" required value={newExpense.desc} onChange={e=>setNewExpense({...newExpense, desc: e.target.value})} className="form-control" placeholder="ระบุรายละเอียดค่าใช้จ่าย" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'14px', fontWeight:500}}>จำนวนเงิน (บาท) <span style={{color: 'red'}}>*</span></label>
              <input type="number" step="0.01" required value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount: e.target.value})} className="form-control" placeholder="0.00" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px dashed rgba(59, 130, 246, 0.3)', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '0' }}>
              <input type="checkbox" checked={newExpense.isInternalTransfer} onChange={(e) => setNewExpense({...newExpense, isInternalTransfer: e.target.checked})} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>โอนเข้ากองกลาง (Internal Fund)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>ยกเลิก</button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกข้อมูล</button>
          </div>
        </form>
      )}

      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>รายการจ่าย (สมุดรายวันจ่าย)</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="month" className="form-control" defaultValue="2026-08" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            <button className="btn-outline" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              <i className="fa-solid fa-download"></i> Export Excel
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>วันที่</th>
                <th>เลขที่อ้างอิง</th>
                <th>ผู้จำหน่าย/ผู้รับเงิน</th>
                <th>รายละเอียด</th>
                <th style={{ textAlign: 'right' }}>มูลค่า (ก่อน VAT)</th>
                <th style={{ textAlign: 'right' }}>ภาษีซื้อ (7%)</th>
                <th style={{ textAlign: 'right' }}>หัก ณ ที่จ่าย</th>
                <th style={{ textAlign: 'right' }}>ยอดจ่ายสุทธิ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan="9" style={{textAlign:'center', padding:'20px'}}>กำลังโหลดข้อมูล...</td></tr> : null}
              {!isLoading && expenses.length === 0 ? <tr><td colSpan="9" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการรายจ่าย</td></tr> : null}
              {!isLoading && expenses.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontSize: '14px' }}>{item.date}</td>
                  <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)' }}>{item.docNo}</td>
                  <td style={{ fontSize: '14px' }}>{item.supplier}</td>
                  <td style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{item.desc}</td>
                  <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatMoney(item.subTotal)}</td>
                  <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--danger)', fontWeight: 500 }}>{formatMoney(item.vat)}</td>
                  <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--accent-purple)' }}>
                    {item.whtAmount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span>{formatMoney(item.whtAmount)}</span>
                        <span style={{ fontSize: '11px', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: '4px' }}>หัก {item.whtType}</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{formatMoney(item.netPay)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Link href={`/projects`} className="btn-icon" title="ดูรายละเอียด" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', textDecoration: 'none' }}>
                      <i className="fa-solid fa-eye"></i>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>
                <td colSpan="4" style={{ padding: '16px 12px', textAlign: 'right' }}>รวมทั้งหมด (เดือนนี้):</td>
                <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatMoney(expenses.reduce((s, i) => s + i.subTotal, 0))}</td>
                <td style={{ textAlign: 'right', padding: '16px 0', color: 'var(--danger)' }}>{formatMoney(expenses.reduce((s, i) => s + i.vat, 0))}</td>
                <td style={{ textAlign: 'right', padding: '16px 0', color: 'var(--accent-purple)' }}>{formatMoney(expenses.reduce((s, i) => s + i.whtAmount, 0))}</td>
                <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatMoney(expenses.reduce((s, i) => s + i.netPay, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
