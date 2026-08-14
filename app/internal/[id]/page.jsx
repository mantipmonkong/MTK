"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function InternalAccountDetail() {
  const params = useParams();
  const accountId = params.id;

  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [linkedProjects, setLinkedProjects] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [totalFundAvailable, setTotalFundAvailable] = useState(0);
  const [bankAccounts, setBankAccounts] = useState([]);

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', note: '', method: 'cash', bankAccountId: '' });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAccountData();
  }, [accountId]);

  const fetchAccountData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Account
      const { data: accData } = await supabase.from('internal_accounts').select('*').eq('id', accountId).single();
      
      // 2. Fetch Projects linked to this account
      const { data: projData } = await supabase
        .from('projects')
        .select(`
          id, 
          status,
          objective,
          billings (total_amount, type, quotation_id),
          project_expenses (amount, vat_amount),
          quotations (id, wht_amount, total_amount)
        `)
        .eq('internal_account_id', accountId);

      const projects = projData || [];
      let totalProfit = 0;
      let totalIncome = 0;

      let totalWhtCredit = 0;

      const formattedProjects = projects.map(p => {
        const receipts = p.billings ? p.billings.filter(b => b.type === 'receipt') : [];
        const inc = receipts.reduce((s,b)=>s+Number(b.total_amount), 0);
        const exp = p.project_expenses ? p.project_expenses.reduce((s,e)=>s+(Number(e.amount) + Number(e.vat_amount || 0)), 0) : 0;
        
        let wht = 0;
        receipts.forEach(b => {
             const q = p.quotations?.find(q => q.id === b.quotation_id);
             if(q && Number(q.total_amount) > 0) {
                 const proportion = Number(b.total_amount) / Number(q.total_amount);
                 wht += (Number(q.wht_amount || 0) * proportion);
             }
        });

        const profit = inc - exp;
        
        totalProfit += profit;
        totalIncome += inc;
        totalWhtCredit += wht;

        return {
          id: p.id,
          name: p.objective,
          income: inc,
          expense: exp,
          status: p.status,
          whtCredit: wht
        };
      });
      
      setLinkedProjects(formattedProjects);

      // 3. Fetch Withdrawals for this account
      const { data: wData } = await supabase.from('fund_withdrawals').select(`
        *,
        bank_accounts(bank_name, account_number, account_name)
      `).eq('internal_account_id', accountId).order('created_at', { ascending: false });
      const accountWithdrawals = wData || [];
      const totalWithdrawn = accountWithdrawals.reduce((s, w) => s + Number(w.amount), 0);
      setWithdrawals(accountWithdrawals);

      setAccount({
        ...accData,
        creditLimit: totalProfit > 0 ? totalProfit : 0,
        withdrawn: totalWithdrawn,
        vatIncome: totalProfit > 0 ? totalProfit : 0,
        whtCredit: totalWhtCredit
      });

      // 4. Calculate Global Available Fund
      const { data: allDeposits } = await supabase.from('fund_deposits').select('amount');
      const sumDeposits = (allDeposits || []).reduce((s,d)=>s+Number(d.amount), 0);
      
      const { data: allWithdrawals } = await supabase.from('fund_withdrawals').select('amount');
      const sumAllWithdrawals = (allWithdrawals || []).reduce((s,w)=>s+Number(w.amount), 0);

      setTotalFundAvailable(sumDeposits - sumAllWithdrawals);

      // 5. Fetch Bank Accounts for this internal account
      const { data: bankData } = await supabase.from('bank_accounts').select('*').eq('internal_account_id', accountId);
      setBankAccounts(bankData || []);

    } catch (error) {
      console.error('Error fetching account data:', error);
    }
    setIsLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const amountNum = parseFloat(withdrawData.amount);

    const availableCredit = (account?.creditLimit || 0) - (account?.withdrawn || 0);

    if (amountNum > availableCredit) {
      setErrorMsg('ยอดเบิกเกินโควต้าเครดิตที่มีอยู่!');
      return;
    }
    if (amountNum > totalFundAvailable) {
      setErrorMsg('เงินสดในกระเป๋ากองกลางมีไม่พอให้เบิก!');
      return;
    }
    
    if (withdrawData.method === 'transfer' && !withdrawData.bankAccountId) {
      setErrorMsg('กรุณาเลือกบัญชีธนาคารสำหรับโอน');
      return;
    }

    const { error } = await supabase.from('fund_withdrawals').insert([{
      internal_account_id: accountId,
      amount: amountNum,
      note: withdrawData.note,
      method: withdrawData.method,
      bank_account_id: withdrawData.method === 'transfer' ? withdrawData.bankAccountId : null
    }]);

    if (!error) {
      fetchAccountData();
      setShowWithdrawForm(false);
      setWithdrawData({ amount: '', note: '', method: 'cash', bankAccountId: '' });
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึก (โปรดตรวจสอบว่าได้อัปเดตฐานข้อมูลแล้ว): ' + error.message);
    }
  };

  if(isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูล...</div>;
  if(!account) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>ไม่พบบัญชีนี้</div>;

  const availableCredit = account.creditLimit - account.withdrawn;

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Link href="/internal" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i> กลับไปหน้ากองกลาง</Link>
        </div>
        <div className="flex-wrap-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '32px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{account.name}</h1>
            <p style={{ color: '#cbd5e1', fontSize: '16px', marginTop: '8px' }}>รหัสบัญชีย่อย: {account.id}</p>
          </div>
          <button onClick={() => setShowWithdrawForm(!showWithdrawForm)} className="btn-primary" style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)' }}>
            <i className="fa-solid fa-money-bill-transfer"></i> เบิกเงิน (Withdraw)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>โควต้าเครดิต (กำไรจากโปรเจกต์)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>฿{formatMoney(account.creditLimit)}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>คำนวณจากกำไรโปรเจกต์อัตโนมัติ</div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>เบิกไปแล้ว (Withdrawn)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--danger)' }}>฿{formatMoney(account.withdrawn)}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>ยอดเงินที่ดึงออกจากกองกลาง</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-glow)', border: 'none', color: 'white' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>เครดิตคงเหลือเบิกได้ (Available)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>฿{formatMoney(availableCredit)}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'white', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block', backdropFilter: 'blur(4px)' }}>
            เงินสดในกองกลางเหลือ: ฿{formatMoney(totalFundAvailable)}
          </div>
        </div>
        
        {account.whtCredit > 0 && (
          <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid #eab308' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#eab308' }}></i> เครดิตภาษีหัก ณ ที่จ่าย
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#eab308' }}>฿{formatMoney(account.whtCredit)}</div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>ยอดเงินที่รอเคลมคืนจากสรรพากร</div>
          </div>
        )}
      </div>

      {showWithdrawForm && (
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', marginBottom: '32px', border: '1px solid var(--primary)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--gradient-primary)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}></div>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: 'var(--primary)' }}>
            <i className="fa-solid fa-hand-holding-dollar"></i> ทำรายการเบิกเงิน
          </h3>
          
          {errorMsg && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
            </div>
          )}

          <form onSubmit={handleWithdraw} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>รูปแบบการเบิกเงิน</label>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 20px', borderRadius: '12px', border: withdrawData.method === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border)', background: withdrawData.method === 'cash' ? 'rgba(99,102,241,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                  <input type="radio" name="method" value="cash" checked={withdrawData.method === 'cash'} onChange={e => setWithdrawData({...withdrawData, method: e.target.value, bankAccountId: ''})} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                  <span style={{ fontWeight: withdrawData.method === 'cash' ? 600 : 400 }}><i className="fa-solid fa-money-bill-wave" style={{ color: 'var(--secondary)' }}></i> เบิกเป็นเงินสด</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 20px', borderRadius: '12px', border: withdrawData.method === 'transfer' ? '2px solid var(--primary)' : '1px solid var(--border)', background: withdrawData.method === 'transfer' ? 'rgba(99,102,241,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                  <input type="radio" name="method" value="transfer" checked={withdrawData.method === 'transfer'} onChange={e => setWithdrawData({...withdrawData, method: e.target.value})} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                  <span style={{ fontWeight: withdrawData.method === 'transfer' ? 600 : 400 }}><i className="fa-solid fa-building-columns" style={{ color: 'var(--primary)' }}></i> เบิกโอนเข้าบัญชีธนาคาร</span>
                </label>
              </div>
            </div>

            {withdrawData.method === 'transfer' && (
              <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>เลือกบัญชีธนาคารปลายทาง</label>
                {bankAccounts.length > 0 ? (
                  <select value={withdrawData.bankAccountId} onChange={e => setWithdrawData({...withdrawData, bankAccountId: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} required>
                    <option value="">-- เลือกบัญชีธนาคาร --</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.account_name})</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ color: 'var(--warning)', fontSize: '14px' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> บัญชีนี้ยังไม่มีข้อมูลธนาคาร กรุณาไปเพิ่มในหน้า "ตั้งค่า (Settings)" ก่อน
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>จำนวนเงินที่ต้องการเบิก (บาท)</label>
              <input type="number" step="0.01" value={withdrawData.amount} onChange={e => setWithdrawData({...withdrawData, amount: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="0.00" required />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>หมายเหตุ (ตัวเลือก)</label>
              <input type="text" value={withdrawData.note} onChange={e => setWithdrawData({...withdrawData, note: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="เช่น เบิกไปซื้อวัสดุ" />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
              <button type="button" onClick={() => {setShowWithdrawForm(false); setErrorMsg('');}} className="btn-outline" style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>ยกเลิก</button>
              <button type="submit" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>ยืนยันการเบิกเงิน</button>
            </div>
          </form>
        </div>
      )}

      {/* WHT Tracking Section */}
      {linkedProjects.filter(p => p.whtCredit > 0).length > 0 && (
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', marginBottom: '32px', border: '1px solid #eab308', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#eab308', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ca8a04' }}>
              <i className="fa-solid fa-file-invoice-dollar"></i> ติดตามเอกสารหัก ณ ที่จ่าย (WHT Tracking)
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>* รายการที่ต้องตามใบหัก 3% จากผู้รับผิดชอบโปรเจกต์ เพื่อใช้เคลมภาษี</span>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>รหัสโปรเจกต์</th>
                <th>ชื่อ / จุดประสงค์โปรเจกต์</th>
                <th style={{ textAlign: 'right' }}>ยอดภาษีหัก ณ ที่จ่าย</th>
                <th style={{ textAlign: 'center' }}>การติดตาม</th>
              </tr>
            </thead>
            <tbody>
              {linkedProjects.filter(p => p.whtCredit > 0).map(p => (
                <tr key={`wht-${p.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--primary)' }}>
                    <Link href={`/projects/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.id}</Link>
                  </td>
                  <td>{p.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#eab308' }}>฿{formatMoney(p.whtCredit)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: '#eab308' }} />
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>ได้รับเอกสารแล้ว</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tables Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Projects Table */}
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-briefcase" style={{ color: 'var(--primary)' }}></i> โปรเจกต์ที่รับผิดชอบ
          </h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>รหัสโปรเจกต์</th>
                  <th style={{ textAlign: 'right' }}>กำไร (บาท)</th>
                  <th style={{ textAlign: 'center' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {linkedProjects.length === 0 ? <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีโปรเจกต์</td></tr> : null}
                {linkedProjects.map(proj => {
                  const profit = proj.income - proj.expense;
                  return (
                    <tr key={proj.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <Link href={`/projects/${proj.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{proj.id}</Link>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{proj.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                        {profit >= 0 ? '+' : ''}฿{formatMoney(profit)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                            background: proj.status === 'เสร็จสิ้น' || proj.status === 'อนุมัติแล้ว' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                            color: proj.status === 'เสร็จสิ้น' || proj.status === 'อนุมัติแล้ว' ? 'var(--secondary)' : 'var(--warning)', 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                          }}>
                            {proj.status}
                          </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-receipt" style={{ color: 'var(--danger)' }}></i> ประวัติการเบิกเงิน
          </h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>วันที่ / รูปแบบ</th>
                  <th style={{ padding: '12px' }}>หมายเหตุ</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? <tr><td colSpan="3" style={{textAlign:'center', padding:'20px', color:'var(--text-muted)'}}>ไม่มีประวัติการเบิกเงิน</td></tr> : null}
                {withdrawals.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        {new Date(w.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          <i className="fa-regular fa-clock" style={{ fontSize: '10px' }}></i> {new Date(w.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {w.method === 'transfer' ? (
                          <><span style={{ color: 'var(--primary)' }}><i className="fa-solid fa-building-columns"></i> โอนเงิน</span> {w.bank_accounts ? `(${w.bank_accounts.bank_name})` : ''}</>
                        ) : (
                          <><span style={{ color: 'var(--secondary)' }}><i className="fa-solid fa-money-bill-wave"></i> เงินสด</span></>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontSize: '14px' }}>{w.note || '-'}</div>
                      {w.method === 'transfer' && w.bank_accounts && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          เลขบัญชี: {w.bank_accounts.account_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)', fontSize: '15px' }}>
                      -฿{formatMoney(Number(w.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
