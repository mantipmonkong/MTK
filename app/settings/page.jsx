"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ id: '', name: '' });
  const [errorMsg, setErrorMsg] = useState('');

  // Bank Accounts State
  const [selectedAccountForBank, setSelectedAccountForBank] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isBankLoading, setIsBankLoading] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState({ bank_name: '', account_name: '', account_number: '' });
  const [bankErrorMsg, setBankErrorMsg] = useState('');

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

  // --- Bank Accounts Logic ---
  const openBankModal = async (acc) => {
    setSelectedAccountForBank(acc);
    setIsBankLoading(true);
    setBankErrorMsg('');
    
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('internal_account_id', acc.id)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error(error);
      setBankErrorMsg('ไม่สามารถโหลดข้อมูลธนาคารได้ (โปรดตรวจสอบว่าสร้างตาราง bank_accounts หรือยัง): ' + error.message);
    } else {
      setBankAccounts(data || []);
    }
    setIsBankLoading(false);
  };

  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    if (!newBankAccount.bank_name || !newBankAccount.account_name || !newBankAccount.account_number) return;
    
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert([{ 
        internal_account_id: selectedAccountForBank.id,
        bank_name: newBankAccount.bank_name,
        account_name: newBankAccount.account_name,
        account_number: newBankAccount.account_number
      }])
      .select();
      
    if (error) {
      setBankErrorMsg(error.message);
    } else if (data) {
      setBankAccounts([...bankAccounts, data[0]]);
      setNewBankAccount({ bank_name: '', account_name: '', account_number: '' });
    }
  };

  const handleDeleteBankAccount = async (id) => {
    if (!confirm('ยืนยันการลบบัญชีธนาคารนี้?')) return;
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) {
      setBankErrorMsg(error.message);
    } else {
      setBankAccounts(bankAccounts.filter(b => b.id !== id));
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

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '14px' }}>
                <th style={{ padding: '12px', width: '20%' }}>รหัสบัญชี (ID)</th>
                <th style={{ width: '35%' }}>ชื่อบัญชี (Name)</th>
                <th style={{ width: '20%' }}>วันที่สร้าง</th>
                <th style={{ textAlign: 'right', width: '25%' }}>จัดการ</th>
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
                      <button onClick={() => openBankModal(acc)} className="btn-icon" style={{ border: 'none', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', marginRight: '8px', fontWeight: 600 }} title="จัดการบัญชีธนาคาร">
                        <i className="fa-solid fa-building-columns"></i> บัญชีธนาคาร
                      </button>
                      <button onClick={() => handleDeleteAccount(acc.id)} className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', fontSize: '13px' }} title="ลบบัญชี">
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

      {/* Bank Accounts Modal */}
      {selectedAccountForBank && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                บัญชีธนาคาร - {selectedAccountForBank.name}
              </h2>
              <button onClick={() => { setSelectedAccountForBank(null); setBankAccounts([]); setNewBankAccount({ bank_name: '', account_name: '', account_number: '' }); }} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="ปิดหน้าต่าง">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            {bankErrorMsg && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> {bankErrorMsg}
              </div>
            )}
            
            <form onSubmit={handleAddBankAccount} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr auto', gap: '16px', alignItems: 'end', marginBottom: '32px', background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600, color: 'var(--text-main)' }}>ธนาคาร</label>
                <input type="text" required value={newBankAccount.bank_name} onChange={e => setNewBankAccount({...newBankAccount, bank_name: e.target.value})} className="form-control" placeholder="เช่น กสิกรไทย" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600, color: 'var(--text-main)' }}>ชื่อบัญชี</label>
                <input type="text" required value={newBankAccount.account_name} onChange={e => setNewBankAccount({...newBankAccount, account_name: e.target.value})} className="form-control" placeholder="ชื่อที่แสดงหน้าสมุดบัญชี" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600, color: 'var(--text-main)' }}>เลขที่บัญชี</label>
                <input type="text" required value={newBankAccount.account_number} onChange={e => setNewBankAccount({...newBankAccount, account_number: e.target.value})} className="form-control" placeholder="xxx-x-xxxxx-x" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', height: '41px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <i className="fa-solid fa-plus"></i> เพิ่ม
              </button>
            </form>
            
            <h3 style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--text-muted)' }}>รายการบัญชีทั้งหมด ({bankAccounts.length})</h3>
            
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <th style={{ padding: '14px 16px' }}>ธนาคาร</th>
                    <th style={{ padding: '14px 16px' }}>ชื่อบัญชี</th>
                    <th style={{ padding: '14px 16px' }}>เลขที่บัญชี</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {isBankLoading ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>กำลังโหลดบัญชีธนาคาร...</td></tr>
                  ) : bankAccounts.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-money-check-dollar" style={{ fontSize: '32px', color: 'var(--border)', marginBottom: '12px', display: 'block' }}></i>
                      ยังไม่ได้เพิ่มบัญชีธนาคารสำหรับบัญชีย่อยนี้
                    </td></tr>
                  ) : bankAccounts.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>{b.bank_name}</td>
                      <td style={{ padding: '14px 16px' }}>{b.account_name}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '15px', color: 'var(--primary)', letterSpacing: '0.5px' }}>{b.account_number}</td>
                      <td style={{ textAlign: 'right', padding: '14px 16px' }}>
                        <button onClick={() => handleDeleteBankAccount(b.id)} className="btn-icon" style={{ border: '1px solid rgba(244, 63, 94, 0.2)', background: 'rgba(244, 63, 94, 0.05)', color: 'var(--danger)', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} title="ลบ">
                          <i className="fa-solid fa-trash-can"></i> ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
