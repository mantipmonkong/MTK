"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', position: '', base_salary: '', bank_account: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (!error) setEmployees(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('employees').insert([{
      name: formData.name,
      position: formData.position,
      base_salary: parseFloat(formData.base_salary) || 0,
      bank_account: formData.bank_account
    }]);

    if (!error) {
      setShowForm(false);
      setFormData({ name: '', position: '', base_salary: '', bank_account: '' });
      fetchEmployees();
    } else {
      alert('Error saving employee: ' + error.message);
    }
  };

  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-users" style={{ color: 'var(--primary)' }}></i> จัดการพนักงาน
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>
          <i className="fa-solid fa-plus"></i> เพิ่มพนักงาน
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ชื่อ-นามสกุล</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ตำแหน่ง</label>
            <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ฐานเงินเดือน (บาท)</label>
            <input type="number" required value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ข้อมูลบัญชีธนาคาร</label>
            <input type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white' }}>ยกเลิก</button>
            <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white' }}>บันทึก</button>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
              <th style={{ padding: '12px 8px' }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: '12px 8px' }}>ตำแหน่ง</th>
              <th style={{ padding: '12px 8px' }}>บัญชีธนาคาร</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>ฐานเงินเดือน</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูลพนักงาน</td></tr> : null}
            {employees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{emp.name}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{emp.position || '-'}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{emp.bank_account || '-'}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>฿{formatMoney(emp.base_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
