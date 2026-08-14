"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function InternalDashboard() {
  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Dashboard States
  const [totalFund, setTotalFund] = useState(0); // กองทุนรวมที่นำเข้าทั้งหมด
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' or 'transactions'

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositData, setDepositData] = useState({ amount: '', source: 'salary', note: '', internal_account_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Deposits
      const { data: dData } = await supabase.from('fund_deposits').select('*').order('created_at', { ascending: false });
      const deposits = dData || [];
      const sumDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);
      setTotalFund(sumDeposits);
      setDepositHistory(deposits);

      // 2. Fetch Withdrawals
      const { data: wData } = await supabase.from('fund_withdrawals').select('*, internal_accounts(name)').order('created_at', { ascending: false });
      const withdrawals = wData || [];
      const sumWithdrawn = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
      setTotalWithdrawn(sumWithdrawn);
      setWithdrawHistory(withdrawals);

      // 3. Fetch Accounts & Calculate their limits
      const { data: accData } = await supabase.from('internal_accounts').select('*');
      const rawAccounts = accData || [];

      // 4. Fetch Projects with Billings and Expenses to calculate Profit -> Credit
      const { data: projData } = await supabase
        .from('projects')
        .select(`
          internal_account_id,
          billings ( total_amount, type, quotation_id ),
          project_expenses ( amount, vat_amount ),
          quotations ( id, wht_amount, total_amount )
        `);

      const projects = projData || [];

      // Process accounts
      const processedAccounts = rawAccounts.map(acc => {
        // Find projects for this account
        const accProjects = projects.filter(p => p.internal_account_id === acc.id);
        
        let totalProfit = 0;
        let totalIncome = 0; // For VAT tracking

        let totalWhtCredit = 0;

        accProjects.forEach(p => {
          const receipts = p.billings ? p.billings.filter(b => b.type === 'receipt') : [];
          const inc = receipts.reduce((s,b)=>s+Number(b.total_amount), 0);
          const exp = p.project_expenses ? p.project_expenses.reduce((s,e)=>s+Number(e.amount)+Number(e.vat_amount||0), 0) : 0;
          
          let wht = 0;
          receipts.forEach(b => {
             const q = p.quotations?.find(q => q.id === b.quotation_id);
             if(q && Number(q.total_amount) > 0) {
                 const proportion = Number(b.total_amount) / Number(q.total_amount);
                 wht += (Number(q.wht_amount || 0) * proportion);
             }
          });

          totalProfit += (inc - exp);
          totalIncome += inc; // Mock VAT tracking simply using total income
          totalWhtCredit += wht;
        });

        const accWithdrawn = withdrawals.filter(w => w.internal_account_id === acc.id).reduce((s,w) => s + Number(w.amount), 0);
        
        // Calculate Personal Top-ups
        const personalDeposits = deposits.filter(d => d.internal_account_id === acc.id && d.source === 'personal_transfer');
        const totalPersonalDeposits = personalDeposits.reduce((s,d)=> s + Number(d.amount), 0);

        return {
          ...acc,
          creditLimit: (totalProfit > 0 ? totalProfit : 0) + totalPersonalDeposits,
          withdrawn: accWithdrawn,
          vatIncome: totalProfit > 0 ? totalProfit : 0,
          whtCredit: totalWhtCredit
        };
      });

      setAccounts(processedAccounts);

    } catch (error) {
      console.error('Error fetching internal data:', error);
    }
    setIsLoading(false);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositData.amount) return;
    const amountNum = parseFloat(depositData.amount);
    
    const { data, error } = await supabase.from('fund_deposits').insert([{
      source: depositData.source,
      amount: amountNum,
      note: depositData.note,
      internal_account_id: depositData.source === 'personal_transfer' ? depositData.internal_account_id : null
    }]).select();

    if (!error && data) {
      fetchData(); // Reload to get fresh sums
      setShowDepositForm(false);
      setDepositData({ amount: '', source: 'salary', note: '', internal_account_id: '' });
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const handleDeleteDeposit = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการรับเงินนี้?')) return;
    const { error } = await supabase.from('fund_deposits').delete().eq('id', id);
    if (!error) {
      fetchData();
    } else {
      alert('ลบไม่สำเร็จ: ' + error.message);
    }
  };

  const handleDeleteWithdrawal = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการเบิกเงินนี้?')) return;
    const { error } = await supabase.from('fund_withdrawals').delete().eq('id', id);
    if (!error) {
      fetchData();
    } else {
      alert('ลบไม่สำเร็จ: ' + error.message);
    }
  };

  const getSourceLabel = (src) => {
    switch(src) {
      case 'salary': return 'เงินเดือนพนักงาน';
      case 'expense': return 'ค่าใช้จ่ายเงินสด';
      case 'dividend': return 'เงินปันผล';
      case 'incentive': return 'Incentive';
      case 'personal_transfer': return 'โอนเงินเข้ากระเป๋าเอง';
      default: return 'อื่นๆ';
    }
  };

  const availableFund = totalFund - totalWithdrawn; // เงินที่เหลือให้เบิกจริงๆ ในกองกลาง

  if(isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-title">
          <h1 style={{ color: 'white', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>ระบบกระเป๋าเงินภายใน (Internal Funds)</h1>
          <p style={{ color: '#cbd5e1', fontSize: '16px', marginTop: '8px', fontWeight: 500 }}>ศูนย์กลางกระจายเงินสดให้แอคเคาท์ย่อย และควบคุมเพดานภาษี (VAT)</p>
        </div>
        <button onClick={() => setShowDepositForm(!showDepositForm)} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', color: 'white', background: 'var(--secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
          <i className="fa-solid fa-piggy-bank"></i> นำเงินเข้ากองกลาง
        </button>
      </div>

      {/* Fund Pool Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>เงินกองกลางทั้งหมด (Total Fund)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>฿{formatMoney(totalFund)}</div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>ดึงมาจากบริษัท (Salary, Dividend ฯลฯ)</div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>ยอดเบิกไปแล้วรวม (Total Withdrawn)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--danger)' }}>฿{formatMoney(totalWithdrawn)}</div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--danger)', background: 'rgba(244,63,94,0.1)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>เบิกโดยแอคเคาท์ย่อย</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-glow)', border: 'none', color: 'white' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>เงินกองกลางคงเหลือ (Available Pool)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>฿{formatMoney(availableFund)}</div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'white', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block', backdropFilter: 'blur(4px)' }}>เงินสดที่พร้อมให้เบิก</div>
        </div>
      </div>

      {showDepositForm && (
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', marginBottom: '32px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, borderBottom: '2px solid var(--secondary)', display: 'inline-block', paddingBottom: '8px', color: 'var(--secondary)' }}>
            <i className="fa-solid fa-arrow-down-to-line"></i> นำเงินเข้ากระเป๋ากองกลาง (Deposit)
          </h3>
          <form onSubmit={handleDeposit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>แหล่งที่มาของเงิน (ดึงออกจากบริษัท)</label>
              <select value={depositData.source} onChange={e => setDepositData({...depositData, source: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <option value="salary">1. เงินเดือนพนักงาน (Salaries)</option>
                <option value="expense">2. เงินสดค่าใช้จ่ายอื่นๆ (Cash Expenses)</option>
                <option value="dividend">3. เงินปันผล (Dividends)</option>
                <option value="incentive">4. เงินจูงใจ (Incentives)</option>
                <option value="personal_transfer">5. โอนเงินเข้ากระเป๋าเอง (เพิ่มเครดิต)</option>
              </select>
            </div>

            {depositData.source === 'personal_transfer' && (
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>เลือกบัญชีย่อย (คนที่โอนเข้า)</label>
                <select value={depositData.internal_account_id} onChange={e => setDepositData({...depositData, internal_account_id: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} required>
                  <option value="">-- เลือกบัญชีย่อย --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>จำนวนเงิน (บาท)</label>
              <input type="number" step="0.01" value={depositData.amount} onChange={e => setDepositData({...depositData, amount: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="0.00" required />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>หมายเหตุ (ตัวเลือก)</label>
              <input type="text" value={depositData.note} onChange={e => setDepositData({...depositData, note: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="เช่น ปันผลไตรมาส 2" />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowDepositForm(false)} className="btn-outline" style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>ยกเลิก</button>
              <button type="submit" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--secondary)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกเงินเข้ากองกลาง</button>
            </div>
          </form>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(99,102,241,0.05)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid rgba(99,102,241,0.1)' }}>
        <button 
          onClick={() => setActiveTab('accounts')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'accounts' ? 'white' : 'transparent', color: activeTab === 'accounts' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'accounts' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'accounts' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
          <i className="fa-solid fa-users"></i> 1. รายชื่อบัญชีย่อย (Sub-Accounts)
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'transactions' ? 'white' : 'transparent', color: activeTab === 'transactions' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'transactions' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'transactions' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
          <i className="fa-solid fa-money-bill-transfer"></i> 2. รายรับ รายจ่าย
        </button>
      </div>

      {activeTab === 'accounts' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {accounts.map((acc) => {
              const available = acc.creditLimit - acc.withdrawn;
              const vatWarning = acc.vatIncome > 1800000;
              const vatAlert = acc.vatIncome > 1500000 && !vatWarning;
              const progressPercent = acc.creditLimit > 0 ? Math.min((acc.withdrawn / acc.creditLimit) * 100, 100) : 0;

              return (
                <Link href={`/internal/${acc.id}`} key={acc.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="doc-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          <i className="fa-solid fa-wallet"></i>
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>{acc.name}</h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>รหัส: {acc.id}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>โควต้าเครดิต (จากกำไรโปรเจกต์)</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>฿{formatMoney(acc.creditLimit)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(241, 245, 249, 0.5)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>เบิกไปแล้ว (Withdrawn)</div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--danger)' }}>฿{formatMoney(acc.withdrawn)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>เหลือเบิกได้ (Available)</div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--secondary)' }}>฿{formatMoney(available)}</div>
                      </div>
                      {acc.whtCredit > 0 && (
                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px', marginTop: '-4px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><i className="fa-solid fa-file-invoice-dollar" style={{ color: '#eab308' }}></i> เครดิตภาษีหัก ณ ที่จ่าย (รอเคลมคืน)</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#eab308' }}>฿{formatMoney(acc.whtCredit)}</div>
                        </div>
                      )}
                    </div>

                    <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ height: '100%', width: `${progressPercent}%`, background: progressPercent > 90 ? 'var(--danger)' : 'var(--primary)' }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                      <div>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ยอดรายรับจด VAT: </span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: vatWarning ? 'var(--danger)' : 'var(--text-main)' }}>฿{formatMoney(acc.vatIncome)} / 1.8M</span>
                      </div>
                      {vatWarning ? (
                        <span style={{ background: 'var(--danger)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}><i className="fa-solid fa-triangle-exclamation"></i> ทะลุ 1.8 ล้าน</span>
                      ) : vatAlert ? (
                        <span style={{ background: 'var(--warning)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}><i className="fa-solid fa-triangle-exclamation"></i> ใกล้ทะลุเป้า</span>
                      ) : (
                        <span style={{ background: 'var(--secondary)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}><i className="fa-solid fa-check"></i> ปลอดภัย</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <i className="fa-solid fa-arrow-right-to-bracket" style={{ color: 'var(--secondary)' }}></i> รายรับ (นำเงินเข้ากองกลาง)
            </h2>
            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {depositHistory.length === 0 ? <div style={{color:'var(--text-muted)'}}>ไม่มีประวัติ</div> : null}
                {depositHistory.map(hist => (
                  <div key={hist.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        {getSourceLabel(hist.source)}
                        {hist.source === 'personal_transfer' && hist.internal_account_id && ` (${accounts.find(a=>a.id===hist.internal_account_id)?.name || hist.internal_account_id})`}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(hist.deposit_date || hist.created_at).toLocaleDateString('th-TH')} • {hist.note}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        +฿{formatMoney(Number(hist.amount))}
                      </div>
                      <button onClick={() => handleDeleteDeposit(hist.id)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} title="ลบรายการนี้">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <i className="fa-solid fa-arrow-right-from-bracket" style={{ color: 'var(--danger)' }}></i> รายจ่าย (บัญชีย่อยเบิกไปใช้)
            </h2>
            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {withdrawHistory.length === 0 ? <div style={{color:'var(--text-muted)'}}>ไม่มีประวัติ</div> : null}
                {withdrawHistory.map(hist => (
                  <div key={hist.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{hist.internal_accounts?.name || hist.internal_account_id}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(hist.created_at).toLocaleDateString('th-TH')} • {hist.note || 'เบิกเงิน'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--danger)' }}>
                        -฿{formatMoney(Number(hist.amount))}
                      </div>
                      <button onClick={() => handleDeleteWithdrawal(hist.id)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} title="ลบรายการนี้">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .doc-card:hover {
          transform: translateY(-4px);
          border-color: var(--primary) !important;
          box-shadow: var(--shadow-md) !important;
        }
      `}</style>
    </div>
  );
}
