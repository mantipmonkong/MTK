"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ id: '', name: '' });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('internal_accounts')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data || []);
    }
    setIsLoading(false);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!newAccount.id || !newAccount.name) return;

    // Check if ID already exists locally (for quick feedback)
    if (accounts.some(acc => acc.id === newAccount.id)) {
      setErrorMsg('รหัสบัญชีนี้มีอยู่แล้วในระบบ');
      return;
    }

    const { data, error } = await supabase
      .from('internal_accounts')
      .insert([{ id: newAccount.id, name: newAccount.name }])
      .select();

    if (error) {
      setErrorMsg('เกิดข้อผิดพลาดจากฐานข้อมูล: ' + error.message);
    } else if (data) {
      setAccounts([...accounts, data[0]]);
      setShowForm(false);
      setNewAccount({ id: '', name: '' });
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีนี้? การกระทำนี้ไม่สามารถกู้คืนได้')) return;
    
    setErrorMsg('');
    const { error } = await supabase
      .from('internal_accounts')
      .delete()
      .eq('id', id);
      
    if (error) {
      // If there are linked projects, it might fail due to foreign key constraints
      if (error.code === '23503') {
        setErrorMsg(`ไม่สามารถลบบัญชี ${id} ได้ เนื่องจากมีโปรเจกต์ที่ผูกกับบัญชีนี้อยู่`);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการลบ: ' + error.message);
      }
    } else {
      setAccounts(accounts.filter(acc => acc.id !== id));
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #475569, #1e293b)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-title">
          <h1 style={{ color: 'white', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>การตั้งค่า (Settings)</h1>
          <p style={{ color: '#cbd5e1', fontSize: '16px', marginTop: '8px', fontWeight: 500 }}>จัดการข้อมูลระบบและรายชื่อบัญชีย่อย (Sub-Accounts)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Section: Internal Accounts Management */}
        <div className="data-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <i className="fa-solid fa-users-gear" style={{ color: 'var(--primary)' }}></i> จัดการบัญชีย่อย (Sub-Accounts)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>บัญชีเหล่านี้จะถูกนำไปใช้ผูกกับโปรเจกต์ และรับโควต้าเครดิตจากกำไรในระบบกองกลาง</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <i className="fa-solid fa-plus"></i> เพิ่มบัญชีย่อยใหม่
            </button>
          </div>

          {errorMsg && !showForm && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
            </div>
          )}

          {showForm && (
            <div style={{ background: 'rgba(99,102,241,0.05)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--primary)' }}>เพิ่มบัญชีย่อย (Sub-Account)</h3>
              
              {errorMsg && (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateAccount} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>รหัสบัญชี (ตัวอักษรภาษาอังกฤษ/ตัวเลข)</label>
                  <input type="text" required value={newAccount.id} onChange={e => setNewAccount({...newAccount, id: e.target.value.toUpperCase()})} className="form-control" placeholder="เช่น ACC-001 หรือ MTP" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>* รหัสนี้จะใช้เป็นตัวนำหน้าเมื่อสร้าง Project (เช่น MTP-2608-01)</small>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>ชื่อบัญชี (แสดงผลในระบบ)</label>
                  <input type="text" required value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="form-control" placeholder="เช่น บริษัท แมนทิป จำกัด หรือ กิจการส่วนตัว" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </div>
                
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => {setShowForm(false); setErrorMsg('');}} className="btn-outline" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>ยกเลิก</button>
                  <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกบัญชี</button>
                </div>
              </form>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '14px' }}>
                <th style={{ padding: '12px', width: '20%' }}>รหัสบัญชี (ID)</th>
                <th style={{ width: '40%' }}>ชื่อบัญชี (Name)</th>
                <th style={{ width: '20%' }}>วันที่สร้าง</th>
                <th style={{ textAlign: 'right', width: '20%' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    ยังไม่มีบัญชีย่อยในระบบ
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px 12px', fontWeight: 'bold', color: 'var(--primary)' }}>{acc.id}</td>
                    <td style={{ fontWeight: 500 }}>{acc.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(acc.created_at).toLocaleDateString('th-TH')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDeleteAccount(acc.id)} className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', fontSize: '14px' }} title="ลบบัญชี">
                        <i className="fa-solid fa-trash-can"></i> ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
