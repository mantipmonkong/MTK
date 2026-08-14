"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function PayrollTab() {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Create state
  const [newRun, setNewRun] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), payment_date: new Date().toISOString().split('T')[0] });
  
  // View/Edit state
  const [activeRun, setActiveRun] = useState(null);
  const [payrollItems, setPayrollItems] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: pData } = await supabase.from('payroll_runs').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (pData) setPayrollRuns(pData);
    
    const { data: eData } = await supabase.from('employees').select('*');
    if (eData) setEmployees(eData);
    
    setIsLoading(false);
  };

  const handleCreateRun = async (e) => {
    e.preventDefault();
    if (employees.length === 0) return alert('กรุณาเพิ่มพนักงานในระบบก่อนสร้างรอบเงินเดือน');

    // 1. Create run
    const { data: run, error } = await supabase.from('payroll_runs').insert([{
      month: newRun.month,
      year: newRun.year,
      payment_date: newRun.payment_date,
      status: 'draft'
    }]).select().single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    // 2. Create items for all employees
    const items = employees.map(emp => {
      // Default 5% SS capped at 750 (max salary 15,000 for SS calculation)
      const base = Number(emp.base_salary);
      const ss_base = base > 15000 ? 15000 : base;
      const ss_deduction = ss_base * 0.05;

      return {
        payroll_id: run.id,
        employee_id: emp.id,
        base_salary: base,
        incentive: 0,
        social_security: ss_deduction,
        tax_deduction: 0,
        net_pay: base - ss_deduction,
        payment_method: 'bank'
      };
    });

    await supabase.from('payroll_items').insert(items);
    
    setShowForm(false);
    fetchData();
    viewRun(run);
  };

  const viewRun = async (run) => {
    setActiveRun(run);
    const { data } = await supabase.from('payroll_items').select('*, employees(name)').eq('payroll_id', run.id);
    setPayrollItems(data || []);
  };

  const handleItemChange = (itemId, field, value) => {
    const newItems = payrollItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        // recalculate net pay
        if (field !== 'payment_method') {
          updated.net_pay = Number(updated.base_salary) + Number(updated.incentive) - Number(updated.social_security) - Number(updated.tax_deduction);
        }
        return updated;
      }
      return item;
    });
    setPayrollItems(newItems);
  };

  const saveItems = async () => {
    for (let item of payrollItems) {
      await supabase.from('payroll_items').update({
        base_salary: item.base_salary,
        incentive: item.incentive,
        social_security: item.social_security,
        tax_deduction: item.tax_deduction,
        net_pay: item.net_pay,
        payment_method: item.payment_method
      }).eq('id', item.id);
    }
    
    // Update total amount on run
    const total = payrollItems.reduce((sum, item) => sum + Number(item.net_pay) + Number(item.social_security) + Number(item.tax_deduction), 0);
    await supabase.from('payroll_runs').update({ total_amount: total }).eq('id', activeRun.id);
    
    alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    fetchData();
    viewRun({ ...activeRun, total_amount: total });
  };

  const confirmPayment = async () => {
    if(!confirm('ยืนยันการจ่ายเงิน? ถ้ารายการใดเลือกจ่ายเป็น "เงินสด" ระบบจะบันทึกเงินโอนเข้า "กองกลาง" โดยอัตโนมัติ')) return;

    for (let item of payrollItems) {
      if (item.payment_method === 'cash' && !item.internal_fund_deposit_id) {
        // Create internal fund deposit
        const note = `เบิกเงินสดจ่ายเงินเดือน: ${item.employees.name} (เดือน ${activeRun.month}/${activeRun.year})`;
        const { data: dep } = await supabase.from('fund_deposits').insert([{
          amount: item.net_pay,
          note: note,
          payment_method: 'cash'
        }]).select().single();

        if (dep) {
          await supabase.from('payroll_items').update({ internal_fund_deposit_id: dep.id }).eq('id', item.id);
        }
      }
    }

    await supabase.from('payroll_runs').update({ status: 'paid' }).eq('id', activeRun.id);
    alert('บันทึกสถานะการจ่ายเงินเรียบร้อยแล้ว');
    fetchData();
    setActiveRun(null);
  };

  const exportCSV = () => {
    let csv = 'พนักงาน,เงินเดือนพื้นฐาน,Incentive,หักประกันสังคม,หักภาษี,ยอดสุทธิรับ,ช่องทาง\n';
    payrollItems.forEach(item => {
      csv += `"${item.employees.name}",${item.base_salary},${item.incentive},${item.social_security},${item.tax_deduction},${item.net_pay},${item.payment_method === 'cash' ? 'เงินสด' : 'โอนผ่านธนาคาร'}\n`;
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_${activeRun.month}_${activeRun.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดข้อมูลเงินเดือน...</div>;

  if (activeRun) {
    const isPaid = activeRun.status === 'paid';
    return (
      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <button onClick={() => setActiveRun(null)} className="btn-outline" style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', marginBottom: '8px' }}>
              <i className="fa-solid fa-arrow-left"></i> กลับ
            </button>
            <h3 style={{ fontSize: '18px' }}>
              รอบเงินเดือน: {months[activeRun.month-1]} {activeRun.year}
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>วันที่จ่าย: {new Date(activeRun.payment_date).toLocaleDateString('th-TH')}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={exportCSV} className="btn-outline" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
              <i className="fa-solid fa-file-export"></i> Export CSV
            </button>
            {!isPaid && (
              <>
                <button onClick={saveItems} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--secondary)', color: 'white', cursor: 'pointer' }}>
                  <i className="fa-solid fa-save"></i> บันทึกร่าง
                </button>
                <button onClick={confirmPayment} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>
                  <i className="fa-solid fa-check"></i> ยืนยันการจ่ายเงิน
                </button>
              </>
            )}
            {isPaid && (
              <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', fontWeight: 'bold' }}>
                <i className="fa-solid fa-check-circle"></i> จ่ายแล้ว
              </div>
            )}
          </div>
        </div>

        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>
                <th style={{ padding: '12px 8px' }}>พนักงาน</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>เงินเดือน (฿)</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Incentive (฿)</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>หักประกันสังคม (฿)</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>หักภาษี (฿)</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>รับสุทธิ (฿)</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>ช่องทางจ่ายเงิน</th>
              </tr>
            </thead>
            <tbody>
              {payrollItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{item.employees.name}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <input type="number" value={item.base_salary} disabled={isPaid} onChange={e => handleItemChange(item.id, 'base_salary', e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <input type="number" value={item.incentive} disabled={isPaid} onChange={e => handleItemChange(item.id, 'incentive', e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <input type="number" value={item.social_security} disabled={isPaid} onChange={e => handleItemChange(item.id, 'social_security', e.target.value)} style={{ width: '90px', textAlign: 'right', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--danger)' }} />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <input type="number" value={item.tax_deduction} disabled={isPaid} onChange={e => handleItemChange(item.id, 'tax_deduction', e.target.value)} style={{ width: '90px', textAlign: 'right', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--danger)' }} />
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    ฿{formatMoney(item.net_pay)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <select value={item.payment_method} disabled={isPaid} onChange={e => handleItemChange(item.id, 'payment_method', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <option value="bank">โอนบัญชีบริษัท</option>
                      <option value="cash">เงินสด</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--primary)' }}></i> รายการเงินเดือนพนักงาน (Payroll)
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>
          <i className="fa-solid fa-plus"></i> สร้างรอบเงินเดือน
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateRun} style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>รอบเดือน</label>
            <select value={newRun.month} onChange={e => setNewRun({...newRun, month: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>รอบปี (ค.ศ.)</label>
            <input type="number" value={newRun.year} onChange={e => setNewRun({...newRun, year: e.target.value})} style={{ width: '100px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>วันที่กำหนดจ่าย</label>
            <input type="date" value={newRun.payment_date} onChange={e => setNewRun({...newRun, payment_date: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white' }}>ยกเลิก</button>
            <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white' }}>สร้างข้อมูล</button>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
              <th style={{ padding: '12px 8px' }}>รอบเงินเดือน</th>
              <th style={{ padding: '12px 8px' }}>วันที่จ่าย</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>ยอดรวม (฿)</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูลรอบเงินเดือน</td></tr> : null}
            {payrollRuns.map(run => (
              <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{months[run.month-1]} {run.year}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{new Date(run.payment_date).toLocaleDateString('th-TH')}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>฿{formatMoney(run.total_amount)}</td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  {run.status === 'paid' ? 
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', fontWeight: 'bold' }}>จ่ายแล้ว</span> : 
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', fontWeight: 'bold' }}>ฉบับร่าง</span>
                  }
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  <button onClick={() => viewRun(run)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
