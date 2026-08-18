"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function ExpenseAccounting() {
  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [expenses, setExpenses] = useState([]);
  const [internalAccounts, setInternalAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingExpense, setViewingExpense] = useState(null);

  // Stats
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [targetExpense, setTargetExpense] = useState(0);
  const [missingExpense, setMissingExpense] = useState(0);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ 
    internalAccountId: '',
    projectId: '',
    supplierId: '',
    category: 'ค่าใช้จ่ายอื่นๆ (เช่น ค่าจ้าง, เบ็ดเตล็ด)',
    reference_no: '',
    desc: '', 
    amount: '', 
    is_tax_invoice: false,
    vat_amount: 0,
    wht_amount: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch internal accounts
    const { data: accData } = await supabase.from('internal_accounts').select('*').order('name');
    if (accData) setInternalAccounts(accData);

    // Fetch projects
    const { data: projData } = await supabase.from('projects').select('id, name, internal_account_id').order('created_at', { ascending: false });
    if (projData) setProjects(projData);

    // Fetch suppliers
    const { data: supData } = await supabase.from('contacts').select('id, name').eq('type', 'supplier').order('name');
    if (supData) setSuppliers(supData);

    // Fetch expenses
    const { data: eData } = await supabase
      .from('project_expenses')
      .select('*, projects(id, name, internal_accounts(name)), contacts(name)')
      .order('expense_date', { ascending: false })
      .limit(100);

    if (eData) {
      const processedExpenses = eData.map(exp => {
        let whtType = 'ไม่หัก';
        const subTotal = Number(exp.sub_total) || Number(exp.amount) || 0;
        const whtAmount = Number(exp.wht_amount) || 0;
        const vatAmount = Number(exp.vat_amount) || 0;
        
        if (whtAmount > 0 && subTotal > 0) {
          const ratio = Math.round((whtAmount / subTotal) * 100);
          whtType = ratio === 3 ? '3%' : (ratio === 1 ? '1%' : 'หัก ณ ที่จ่าย');
        }

        // Determine Payer based on reference_no note logic or default
        const payerMatch = exp.description?.match(/\[บัญชี: (.*?)\]/);
        const payerName = payerMatch ? payerMatch[1] : (exp.projects?.internal_accounts?.name || 'บริษัทส่วนกลาง');

        return {
          id: exp.id,
          date: new Date(exp.expense_date || exp.created_at).toLocaleDateString('th-TH'),
          docNo: exp.reference_no || exp.id,
          projectName: exp.projects?.name || 'ไม่ระบุโปรเจกต์',
          supplier: exp.contacts?.name || 'ไม่ระบุผู้จำหน่าย',
          payerName: payerName,
          desc: exp.description || 'ค่าใช้จ่าย',
          subTotal: subTotal,
          vat: vatAmount,
          whtType: whtType,
          whtAmount: whtAmount,
          netPay: subTotal + vatAmount - whtAmount
        };
      });
      
      setExpenses(processedExpenses);

      // Calculate Stats
      const { data: bData } = await supabase.from('billings').select('total_amount, quotation_id').eq('type', 'receipt');
      const { data: qData } = await supabase.from('quotations').select('id, sub_total, total_amount, wht_amount, vat_rate');
      
      let incomeSum = 0;
      if (bData && qData) {
        bData.forEach(bill => {
          const q = qData.find(q => q.id === bill.quotation_id);
          if (q) {
            const expectedTransfer = q.total_amount - (q.wht_amount || 0);
            const isFullPayment = bill.total_amount >= (expectedTransfer - 1);
            if (isFullPayment) {
              incomeSum += Number(q.sub_total);
            } else {
               const rv = q.vat_rate > 0 ? 0.07 : 0;
               incomeSum += Number(bill.total_amount) / (1 + rv);
            }
          }
        });
      }

      const expenseSum = processedExpenses.reduce((s, e) => s + Number(e.subTotal), 0);
      const profit = incomeSum - expenseSum;
      const targetExp = incomeSum * 0.85; // To reach 15% profit
      const missingExp = Math.max(0, targetExp - expenseSum);

      setTotalIncome(incomeSum);
      setTotalExpense(expenseSum);
      setGrossProfit(profit);
      setTargetExpense(targetExp);
      setMissingExpense(missingExp);
    }
    setIsLoading(false);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.desc || !newExpense.amount || !newExpense.internalAccountId) {
      return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    }

    setIsLoading(true);

    const amountNum = parseFloat(newExpense.amount);
    const vatAmt = newExpense.is_tax_invoice ? parseFloat(newExpense.vat_amount || 0) : 0;
    const whtAmt = parseFloat(newExpense.wht_amount || 0);

    // Find account name for description tag if no project is selected
    let finalDesc = newExpense.desc;
    if (!newExpense.projectId) {
      const selectedAcc = internalAccounts.find(a => a.id === newExpense.internalAccountId);
      if (selectedAcc) {
        finalDesc = `[บัญชี: ${selectedAcc.name}] ${finalDesc}`;
      }
    }

    const expData = {
      project_id: newExpense.projectId || null,
      description: finalDesc,
      amount: amountNum,
      sub_total: amountNum,
      vat_amount: vatAmt,
      is_tax_invoice: newExpense.is_tax_invoice,
      wht_amount: whtAmt,
      supplier_id: newExpense.supplierId || null,
      reference_no: newExpense.reference_no,
      expense_date: new Date().toISOString().split('T')[0]
    };

    const netPay = amountNum + vatAmt - whtAmt;

    const { error: expError } = await supabase.from('project_expenses').insert([expData]);

    if (expError) {
      alert('เกิดข้อผิดพลาดในการบันทึกรายจ่าย: ' + expError.message);
      setIsLoading(false);
      return;
    }

    // Deduct money from the internal account
    const { error: fundError } = await supabase.from('fund_withdrawals').insert([{
      internal_account_id: newExpense.internalAccountId,
      amount: -netPay,
      note: `ค่าใช้จ่าย${newExpense.projectId ? 'โปรเจกต์ ' + newExpense.projectId : 'ทั่วไป'} (Ref: ${newExpense.reference_no})`,
      method: 'expense'
    }]);

    if (fundError) {
      console.error('Failed to deduct funds:', fundError);
    }

    setNewExpense({ 
      internalAccountId: '',
      projectId: '',
      supplierId: '',
      category: 'ค่าใช้จ่ายอื่นๆ (เช่น ค่าจ้าง, เบ็ดเตล็ด)',
      reference_no: '',
      desc: '', 
      amount: '', 
      is_tax_invoice: false,
      vat_amount: 0,
      wht_amount: 0
    });
    setShowForm(false);
    fetchData();
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? ข้อมูลจะถูกลบออกจากโปรเจกต์ด้วย')) return;
    setIsLoading(true);
    const { error } = await supabase.from('project_expenses').delete().eq('id', id);
    if (error) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
    }
    fetchData();
  };

  const filteredProjects = projects.filter(p => p.internal_account_id === newExpense.internalAccountId);

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/accounting" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i></Link>
            ใบสั่งซื้อ / บันทึกค่าใช้จ่าย
          </h1>
          <p>บันทึกค่าใช้จ่าย, ภาษีซื้อ ผูกเข้ากับโปรเจกต์และผู้รับผิดชอบโดยตรง</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)' }}>
          <i className="fa-solid fa-plus"></i> บันทึกค่าใช้จ่ายใหม่
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>รายได้รวม (ก่อน VAT)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>฿{formatMoney(totalIncome)}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>รายจ่ายรวม (ก่อน VAT)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>฿{formatMoney(totalExpense)}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>กำไรขั้นต้นปัจจุบัน ({totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : 0}%)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: grossProfit > 0 ? '#10b981' : '#ef4444' }}>฿{formatMoney(grossProfit)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-md)', color: 'white' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>รายจ่ายที่ขาด (เป้ากำไร 15%)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>฿{formatMoney(missingExpense)}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>ต้องหารายจ่ายเพิ่มเพื่อให้กำไรเหลือ 15%</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSaveExpense} style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--danger)', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--danger)' }}></i> แบบฟอร์มบันทึกค่าใช้จ่าย
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ผู้รับผิดชอบ (บัญชี) <span style={{color: 'red'}}>*</span></label>
              <select required value={newExpense.internalAccountId} onChange={e => setNewExpense({...newExpense, internalAccountId: e.target.value, projectId: ''})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border: '1px solid var(--border)'}}>
                <option value="">-- เลือกบัญชีผู้รับผิดชอบ --</option>
                {internalAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>โปรเจกต์ที่เกี่ยวข้อง <span style={{color: 'var(--text-muted)'}}>(ใส่หรือไม่ก็ได้)</span></label>
              <select value={newExpense.projectId} onChange={e => setNewExpense({...newExpense, projectId: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border: '1px solid var(--border)'}} disabled={!newExpense.internalAccountId}>
                <option value="">-- ไม่ระบุโปรเจกต์ --</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.id} {p.name ? `- ${p.name}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
               <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ประเภทค่าใช้จ่าย</label>
               <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border: '1px solid var(--border)'}}>
                 <option>ค่าใช้จ่ายอื่นๆ (เช่น ค่าจ้าง, เบ็ดเตล็ด)</option>
                 <option>ค่าวัสดุอุปกรณ์</option>
                 <option>ค่าเดินทาง/ค่าน้ำมัน</option>
               </select>
            </div>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ซัพพลายเออร์ (ผู้จำหน่าย)</label>
              <select value={newExpense.supplierId} onChange={e => setNewExpense({...newExpense, supplierId: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border: '1px solid var(--border)'}}>
                <option value="">-- ไม่ระบุซัพพลายเออร์ --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '16px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>เลขที่อ้างอิง/ใบเสร็จ <span style={{color: 'red'}}>*</span></label>
              <input type="text" required value={newExpense.reference_no} onChange={e=>setNewExpense({...newExpense, reference_no: e.target.value})} className="form-control" placeholder="เช่น INV-001" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>รายละเอียด <span style={{color: 'red'}}>*</span></label>
              <input type="text" required value={newExpense.desc} onChange={e=>setNewExpense({...newExpense, desc: e.target.value})} className="form-control" placeholder="เช่น ค่าใช้จ่ายโครงการ" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
            </div>
            <div>
              <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ยอดก่อนภาษี (Subtotal) <span style={{color: 'red'}}>*</span></label>
              <input type="number" step="0.01" required value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={newExpense.is_tax_invoice} onChange={(e) => {
                const isTax = e.target.checked;
                const vatAmt = isTax && newExpense.amount ? (Number(newExpense.amount) * 0.07).toFixed(2) : 0;
                setNewExpense({...newExpense, is_tax_invoice: isTax, vat_amount: vatAmt});
              }} style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>เป็นใบกำกับภาษี (VAT 7%)</span>
            </label>
            {newExpense.is_tax_invoice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px' }}>ยอด VAT:</span>
                <input type="number" step="0.01" value={newExpense.vat_amount} onChange={e => setNewExpense({...newExpense, vat_amount: e.target.value})} className="form-control" style={{ padding: '4px 8px', width: '100px' }} />
              </div>
            )}

            <div style={{ width: '1px', background: 'var(--border)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>หัก ณ ที่จ่าย:</span>
              <input type="number" step="0.01" value={newExpense.wht_amount} onChange={e => setNewExpense({...newExpense, wht_amount: e.target.value})} className="form-control" placeholder="ยอดเงินหัก WHT" style={{ padding: '4px 8px', width: '120px' }} />
            </div>
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '16px' }}>
              ยอดรวมที่ต้องจ่ายจริง: <strong style={{ color: 'var(--danger)', fontSize: '20px' }}>฿{formatMoney(Number(newExpense.amount || 0) + Number(newExpense.vat_amount || 0) - Number(newExpense.wht_amount || 0))}</strong>
            </div>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>ยกเลิก</button>
            <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกค่าใช้จ่าย</button>
          </div>
        </form>
      )}

      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>รายการบันทึกค่าใช้จ่าย (ทั้งหมด)</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="month" className="form-control" defaultValue="2026-08" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>วันที่</th>
                <th>เลขที่อ้างอิง</th>
                <th>โปรเจกต์ / ผู้รับผิดชอบ</th>
                <th>รายละเอียด</th>
                <th style={{ textAlign: 'right' }}>มูลค่า (ก่อน VAT)</th>
                <th style={{ textAlign: 'right' }}>ภาษีซื้อ (7%)</th>
                <th style={{ textAlign: 'right' }}>หัก ณ ที่จ่าย</th>
                <th style={{ textAlign: 'right' }}>ยอดจ่ายสุทธิ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>กำลังโหลดข้อมูล...</td></tr> : null}
              {!isLoading && expenses.length === 0 ? <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการรายจ่าย</td></tr> : null}
              {!isLoading && expenses.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontSize: '14px' }}>{item.date}</td>
                  <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)' }}>{item.docNo}</td>
                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.projectName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.payerName}</div>
                  </td>
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
                    <button onClick={() => setViewingExpense(item)} style={{ background: 'none', color: 'var(--primary)', border: 'none', padding: '6px', cursor: 'pointer', marginRight: '4px', fontSize: '14px' }} title="ดูรายละเอียด">
                      <i className="fa-regular fa-eye"></i>
                    </button>
                    <button onClick={() => handleDeleteExpense(item.id)} style={{ background: 'none', color: 'var(--danger)', border: 'none', padding: '6px', cursor: 'pointer', fontSize: '14px' }} title="ลบรายการ">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewingExpense && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>รายละเอียดค่าใช้จ่าย</h3>
              <button onClick={() => setViewingExpense(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>วันที่บันทึก:</span>
                <span style={{ fontWeight: 500 }}>{viewingExpense.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>เลขที่อ้างอิง:</span>
                <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{viewingExpense.docNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>รายละเอียด:</span>
                <span style={{ fontWeight: 500 }}>{viewingExpense.desc}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>โปรเจกต์:</span>
                <span style={{ fontWeight: 500 }}>{viewingExpense.projectName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ผู้รับผิดชอบ:</span>
                <span style={{ fontWeight: 500 }}>{viewingExpense.payerName}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>มูลค่า (ก่อน VAT):</span>
                <span style={{ fontWeight: 500 }}>฿{formatMoney(viewingExpense.subTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ภาษีซื้อ (VAT):</span>
                <span style={{ fontWeight: 500, color: 'var(--danger)' }}>฿{formatMoney(viewingExpense.vat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>หัก ณ ที่จ่าย:</span>
                <span style={{ fontWeight: 500, color: 'var(--accent-purple)' }}>{viewingExpense.whtAmount > 0 ? `-฿${formatMoney(viewingExpense.whtAmount)}` : '-'}</span>
              </div>
              <div style={{ borderTop: '2px solid var(--border)', margin: '8px 0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                <span style={{ color: 'var(--text-main)' }}>ยอดสุทธิ:</span>
                <span style={{ color: 'var(--danger)' }}>฿{formatMoney(viewingExpense.netPay)}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button onClick={() => setViewingExpense(null)} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--surface)', cursor: 'pointer', fontWeight: 500, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
