"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function InternalAccountDetail() {
  const params = useParams();
  const accountId = params.id;

  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // -----------------------------------------------------
  // 1. Mock Data: Projects linked to this account
  // -----------------------------------------------------
  // In a real DB, we would fetch Projects where internalAccount = this account.
  // The Credit Limit is the sum of Net Profit from these projects.
  const [linkedProjects] = useState([
    { id: 'PRJ-2608-01', name: 'งานรับเหมา A', income: 1000000, expense: 600000, status: 'เสร็จสิ้น' },
    { id: 'PRJ-2608-02', name: 'งานขายสินค้า B', income: 500000, expense: 400000, status: 'เสร็จสิ้น' },
    { id: 'PRJ-2608-03', name: 'งานทำคู่เทียบ C', income: 1500000, expense: 0, status: 'กำลังดำเนินงาน' }, // กำไรยังไม่นิ่ง หรืออาจจะนับเลยก็ได้
  ]);

  // คำนวณเครดิตจากกำไรโปรเจกต์ (Income - Expense)
  const totalProjectProfit = linkedProjects.reduce((sum, proj) => sum + (proj.income - proj.expense), 0);

  // -----------------------------------------------------
  // 2. Mock Data: Account Info
  // -----------------------------------------------------
  const [account, setAccount] = useState({
    id: accountId,
    name: accountId === 'ACC-003' ? 'เฮีย A' : 'บริษัท แมนทิป จำกัด',
    creditLimit: totalProjectProfit, // <--- เครดิตมาจากกำไรโปรเจกต์!
    withdrawn: accountId === 'ACC-003' ? 150000 : 100000,
    vatIncome: accountId === 'ACC-003' ? 0 : 1450000
  });

  const totalFundAvailable = 2500000 - 150000 - 100000; // Mock global available fund

  const [withdrawals, setWithdrawals] = useState([
    { id: 'W-001', date: '2026-08-01', amount: 50000, note: 'เบิกจ่ายงวด 1' },
    { id: 'W-002', date: '2026-08-10', amount: 50000, note: 'เบิกจ่ายงวด 2' },
  ]);

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', note: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const availableCredit = account.creditLimit - account.withdrawn;

  const handleWithdraw = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const amountNum = parseFloat(withdrawData.amount);

    if (amountNum > availableCredit) {
      setErrorMsg('ยอดเบิกเกินโควต้าเครดิตที่มีอยู่!');
      return;
    }
    if (amountNum > totalFundAvailable) {
      setErrorMsg('เงินสดในกระเป๋ากองกลางมีไม่พอให้เบิก!');
      return;
    }

    setAccount({ ...account, withdrawn: account.withdrawn + amountNum });
    setWithdrawals([{
      id: `W-00${withdrawals.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountNum,
      note: withdrawData.note || 'เบิกเงิน'
    }, ...withdrawals]);

    setShowWithdrawForm(false);
    setWithdrawData({ amount: '', note: '' });
  };

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Link href="/internal" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i> กลับไปหน้ากองกลาง</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '32px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{account.name}</h1>
            <p style={{ color: '#cbd5e1', fontSize: '16px', marginTop: '8px' }}>รหัสบัญชีย่อย: {account.id}</p>
          </div>
          <button onClick={() => setShowWithdrawForm(!showWithdrawForm)} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)' }}>
            <i className="fa-solid fa-money-bill-transfer"></i> เบิกเงิน (Withdraw)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>โควต้าเครดิต (กำไรจากโปรเจกต์)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>฿{formatMoney(account.creditLimit)}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>คำนวณจากกำไรโปรเจกต์อัตโนมัติ</div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>เบิกไปแล้วรวม (Withdrawn)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--danger)' }}>฿{formatMoney(account.withdrawn)}</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-glow)', border: 'none', color: 'white' }}>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>เงินคงเหลือเบิกได้ (Available Balance)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>฿{formatMoney(availableCredit)}</div>
        </div>
      </div>

      {showWithdrawForm && (
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', marginBottom: '32px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '8px', color: 'var(--primary)' }}>
            <i className="fa-solid fa-money-bill-transfer"></i> ทำรายการเบิกเงินจากกองกลาง
          </h3>
          
          {errorMsg && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
            </div>
          )}

          <form onSubmit={handleWithdraw} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>จำนวนเงินที่ต้องการเบิก (บาท)</label>
              <input type="number" step="0.01" value={withdrawData.amount} onChange={e => setWithdrawData({...withdrawData, amount: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="0.00" required />
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>เบิกได้สูงสุด ฿{formatMoney(availableCredit)}</small>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>หมายเหตุ (ตัวเลือก)</label>
              <input type="text" value={withdrawData.note} onChange={e => setWithdrawData({...withdrawData, note: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="ระบุเหตุผลการเบิก" />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
              <button type="button" onClick={() => {setShowWithdrawForm(false); setErrorMsg('');}} className="btn-outline" style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>ยกเลิก</button>
              <button type="submit" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>ยืนยันการเบิกเงิน</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Layout for Credits and Statements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Credit Sources (Projects) */}
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-chart-line" style={{ color: 'var(--secondary)' }}></i> ที่มาของเครดิต (Project Profits)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>เครดิตมาจากการนำรายรับหักลบค่าใช้จ่ายของโปรเจกต์ที่รับผิดชอบ</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>โปรเจกต์</th>
                <th style={{ textAlign: 'right' }}>รายรับ</th>
                <th style={{ textAlign: 'right' }}>ค่าใช้จ่าย</th>
                <th style={{ textAlign: 'right' }}>กำไร (เครดิต)</th>
              </tr>
            </thead>
            <tbody>
              {linkedProjects.map(proj => {
                const profit = proj.income - proj.expense;
                return (
                  <tr key={proj.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--primary)' }}>{proj.id}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{proj.name}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '14px' }}>฿{formatMoney(proj.income)}</td>
                    <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--danger)' }}>-฿{formatMoney(proj.expense)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                      ฿{formatMoney(profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan="3" style={{ padding: '16px 12px', textAlign: 'right' }}>เครดิตสะสมทั้งหมด:</td>
                <td style={{ textAlign: 'right', color: 'var(--primary)' }}>฿{formatMoney(account.creditLimit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Withdrawal History */}
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--text-muted)' }}></i> ประวัติการเบิกเงิน (Statement)
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>รหัสอ้างอิง</th>
                <th>วันที่เบิก</th>
                <th>รายละเอียด</th>
                <th style={{ textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 500 }}>{w.id}</td>
                  <td style={{ fontSize: '14px' }}>{w.date}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{w.note}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                    -฿{formatMoney(w.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan="3" style={{ padding: '16px 12px', textAlign: 'right' }}>รวมเบิกเงินทั้งหมด:</td>
                <td style={{ textAlign: 'right', color: 'var(--danger)' }}>-฿{formatMoney(account.withdrawn)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  );
}
