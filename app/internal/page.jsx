"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function InternalDashboard() {
  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Dashboard States (Mock Data)
  const [totalFund, setTotalFund] = useState(2500000); // กองทุนรวม
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositData, setDepositData] = useState({ amount: '', source: 'salary', note: '' });

  // Sub-accounts State
  const [accounts, setAccounts] = useState([
    { id: 'ACC-001', name: 'บริษัท แมนทิป จำกัด', creditLimit: 1000000, withdrawn: 400000, vatIncome: 1450000 },
    { id: 'ACC-002', name: 'กิจการค้าปลีก (ส่วนตัว)', creditLimit: 500000, withdrawn: 100000, vatIncome: 200000 },
    { id: 'ACC-003', name: 'เฮีย A', creditLimit: 2000000, withdrawn: 1500000, vatIncome: 0 },
  ]);

  const [depositHistory, setDepositHistory] = useState([
    { id: 1, date: '2026-08-10', source: 'dividend', amount: 1000000, note: 'ปันผลไตรมาส 2' },
    { id: 2, date: '2026-08-12', source: 'salary', amount: 50000, note: 'เงินเดือนผู้บริหาร' },
  ]);

  const handleDeposit = (e) => {
    e.preventDefault();
    if (!depositData.amount) return;
    const amountNum = parseFloat(depositData.amount);
    
    setTotalFund(totalFund + amountNum);
    setDepositHistory([{
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      source: depositData.source,
      amount: amountNum,
      note: depositData.note || '-'
    }, ...depositHistory]);
    
    setShowDepositForm(false);
    setDepositData({ amount: '', source: 'salary', note: '' });
  };

  const getSourceLabel = (src) => {
    switch(src) {
      case 'salary': return 'เงินเดือนพนักงาน';
      case 'expense': return 'ค่าใช้จ่ายเงินสด';
      case 'dividend': return 'เงินปันผล';
      case 'incentive': return 'Incentive';
      default: return 'อื่นๆ';
    }
  };

  const totalWithdrawn = accounts.reduce((s, acc) => s + acc.withdrawn, 0);
  const availableFund = totalFund - totalWithdrawn; // เงินที่เหลือให้เบิกจริงๆ ในกองกลาง

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              </select>
            </div>

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

      {/* Grid Layout for Accounts & History */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        
        {/* Left Col: Sub Accounts */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <i className="fa-solid fa-users" style={{ color: 'var(--primary)' }}></i> รายชื่อบัญชีย่อย (Sub-Accounts)
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {accounts.map((acc) => {
              const available = acc.creditLimit - acc.withdrawn;
              const vatWarning = acc.vatIncome > 1800000;
              const vatAlert = acc.vatIncome > 1500000 && !vatWarning;
              const progressPercent = Math.min((acc.withdrawn / acc.creditLimit) * 100, 100);

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
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>โควต้าเครดิต (Credit Limit)</div>
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
                    </div>

                    {/* Credit Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ height: '100%', width: `${progressPercent}%`, background: progressPercent > 90 ? 'var(--danger)' : 'var(--primary)' }}></div>
                    </div>

                    {/* VAT Tracking */}
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

        {/* Right Col: Deposit History */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--text-muted)' }}></i> ประวัติเงินเข้ากองกลาง
          </h2>
          <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {depositHistory.map(hist => (
                <div key={hist.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{getSourceLabel(hist.source)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hist.date} • {hist.note}</div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    +฿{formatMoney(hist.amount)}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-outline" style={{ width: '100%', marginTop: '16px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>
              ดูประวัติทั้งหมด
            </button>
          </div>
        </div>

      </div>

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
