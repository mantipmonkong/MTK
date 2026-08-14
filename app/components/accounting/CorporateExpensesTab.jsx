"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function CorporateExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'general',
    amount: '',
    frequency: 'one_time',
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank'
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('corporate_expenses').select('*').order('due_date', { ascending: true });
    if (!error) setExpenses(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('corporate_expenses').insert([{
      title: formData.title,
      category: formData.category,
      amount: parseFloat(formData.amount) || 0,
      frequency: formData.frequency,
      due_date: formData.due_date,
      payment_method: formData.payment_method,
      is_paid: false
    }]);

    if (!error) {
      setShowForm(false);
      setFormData({ title: '', category: 'general', amount: '', frequency: 'one_time', due_date: new Date().toISOString().split('T')[0], payment_method: 'bank' });
      fetchExpenses();
    } else {
      alert('Error saving expense: ' + error.message);
    }
  };

  const markAsPaid = async (exp) => {
    if(!confirm(`ยืนยันการจ่ายเงิน "${exp.title}"?`)) return;

    let depositId = null;
    if (exp.payment_method === 'cash') {
      const { data: dep } = await supabase.from('fund_deposits').insert([{
        amount: exp.amount,
        note: `เบิกจ่าย (เงินสด): ${exp.title}`,
        payment_method: 'cash'
      }]).select().single();
      
      if (dep) depositId = dep.id;
    }

    const updates = { is_paid: true };
    if (depositId) updates.internal_fund_deposit_id = depositId;

    await supabase.from('corporate_expenses').update(updates).eq('id', exp.id);
    alert('บันทึกการจ่ายเงินเรียบร้อยแล้ว');
    fetchExpenses();
  };

  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const getCategoryName = (cat) => {
    const map = { 'general': 'ทั่วไป', 'rent': 'ค่าเช่า', 'utility': 'ค่าน้ำ/ไฟ/เน็ต', 'dividend': 'เงินปันผล', 'tax': 'ภาษี/รัฐ' };
    return map[cat] || cat;
  };
  
  const getFrequencyName = (freq) => {
    const map = { 'one_time': 'ครั้งเดียว', 'monthly': 'รายเดือน', 'yearly': 'รายปี' };
    return map[freq] || freq;
  };

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดข้อมูลค่าใช้จ่าย...</div>;

  return (
    <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-file-invoice" style={{ color: 'var(--primary)' }}></i> รายจ่ายประจำ & ปันผล
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>
          <i className="fa-solid fa-plus"></i> เพิ่มรายการ
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>ชื่อรายการ (เช่น ค่าเช่าออฟฟิศ, ปันผลประจำปี)</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>หมวดหมู่</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <option value="general">ทั่วไป</option>
              <option value="rent">ค่าเช่า</option>
              <option value="utility">ค่าน้ำ/ไฟ/เน็ต</option>
              <option value="dividend">เงินปันผล</option>
              <option value="tax">ภาษี/จ่ายรัฐ</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>รอบการจ่าย</label>
            <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <option value="one_time">ครั้งเดียว</option>
              <option value="monthly">รายเดือน</option>
              <option value="yearly">รายปี</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>จำนวนเงิน (บาท)</label>
            <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>วันครบกำหนด / วันที่จ่าย</label>
            <input type="date" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>วิธีการจ่ายเงิน</label>
            <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <option value="bank">โอนบัญชีบริษัท (ส่งสรรพากร)</option>
              <option value="cash">เงินสด (เบิกจากกองกลาง)</option>
            </select>
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
              <th style={{ padding: '12px 8px' }}>รายการ</th>
              <th style={{ padding: '12px 8px' }}>วันกำหนดจ่าย</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>จำนวนเงิน</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>วิธีจ่าย</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูลค่าใช้จ่ายประจำ</td></tr> : null}
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)', opacity: exp.is_paid ? 0.7 : 1 }}>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 500 }}>{exp.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{getCategoryName(exp.category)} • {getFrequencyName(exp.frequency)}</div>
                </td>
                <td style={{ padding: '12px 8px', color: exp.is_paid ? 'var(--text-muted)' : (new Date(exp.due_date) < new Date() ? 'var(--danger)' : 'var(--text-main)') }}>
                  {new Date(exp.due_date).toLocaleDateString('th-TH')}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>฿{formatMoney(exp.amount)}</td>
                <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {exp.payment_method === 'cash' ? 'เงินสด' : 'โอนผ่านธนาคาร'}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  {exp.is_paid ? (
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', fontWeight: 'bold' }}>จ่ายแล้ว</span>
                  ) : (
                    <button onClick={() => markAsPaid(exp)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      มาร์คว่าจ่ายแล้ว
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
