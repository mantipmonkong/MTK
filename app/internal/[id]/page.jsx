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
  const [vatTransactions, setVatTransactions] = useState({ sales: [], purchase: [] });
  const [whtItems, setWhtItems] = useState([]);
  const [showVatList, setShowVatList] = useState(false);
  const [showWhtList, setShowWhtList] = useState(false);

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', note: '', method: 'cash', bankAccountId: '' });
  
  const [showVatClearance, setShowVatClearance] = useState(false);
  const [vatClearData, setVatClearData] = useState({ amount: '', note: '' });

  const [showHeldBackList, setShowHeldBackList] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(null);
  const [confirmWhtData, setConfirmWhtData] = useState(null);
  const [confirmAutoPayVat, setConfirmAutoPayVat] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleWht = (receiptId, currentStatus) => {
    setConfirmWhtData({ receiptId, currentStatus });
  };

  const executeToggleWht = async () => {
    if (!confirmWhtData) return;
    const { receiptId, currentStatus } = confirmWhtData;
    setConfirmWhtData(null);
    
    const isClaimed = currentStatus.includes('CLAIMED');
    let newStatus = currentStatus;
    if (isClaimed) {
      newStatus = currentStatus.replace(' [CLAIMED]', '').replace('[CLAIMED]', '').replace(', CLAIMED', '').replace(' CLAIMED', '');
    } else {
      newStatus = currentStatus + ' [CLAIMED]';
    }
    
    const { error } = await supabase.from('billings').update({ status: newStatus }).eq('id', receiptId);
    if (!error) {
      fetchAccountData();
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการอัปเดตสถานะ WHT: ' + error.message);
    }
  };

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
          billings (id, total_amount, type, quotation_id, created_at, status),
          project_expenses (id, amount, vat_amount, is_tax_invoice, created_at, contacts(name)),
          quotations (id, wht_amount, vat_amount, total_amount)
        `)
        .eq('internal_account_id', accountId);

      const projects = projData || [];
      let totalProfit = 0;
      let totalHeldBack = 0;
      let totalCompanyFee = 0;
      let totalIncome = 0;

      let totalWhtCredit = 0;
      let totalSalesVat = 0;
      let totalPurchaseVat = 0;

      let allSalesVatItems = [];
      let allPurchaseVatItems = [];
      let allWhtItems = [];

      const formattedProjects = projects.map(p => {
        const receipts = p.billings ? p.billings.filter(b => b.type === 'receipt') : [];
        const inc = receipts.reduce((s,b)=>s+Number(b.total_amount), 0);
        const exp = p.project_expenses ? p.project_expenses.reduce((s,e)=>s+(Number(e.amount) + Number(e.vat_amount || 0)), 0) : 0;
        
        let wht = 0;
        let salesVat = 0;
        receipts.forEach(b => {
             const q = p.quotations?.find(q => q.id === b.quotation_id);
             if(q && Number(q.total_amount) > 0) {
                 const proportion = Number(b.total_amount) / Number(q.total_amount);
                 
                 // Default to quotation WHT, but override if receipt explicitly specifies it
                 let whtAmount = (Number(q.wht_amount || 0) * proportion);
                 let isClaimed = false;
                 
                 if (b.status && b.status.includes('WHT:')) {
                     const match = b.status.match(/WHT:(\d+)/);
                     if (match) {
                         const actualWhtRate = Number(match[1]);
                         const vatRate = Number(q.vat_amount) > 0 ? 7 : 0; // standard fallback
                         const subTotal = Number(b.total_amount) / (1 + vatRate/100);
                         whtAmount = subTotal * (actualWhtRate / 100);
                     }
                     if (b.status.includes('CLAIMED')) {
                         isClaimed = true;
                     }
                 }
                 
                 // Only deduct WHT if it has NOT been claimed
                 if (!isClaimed) {
                     wht += whtAmount;
                 }
                 
                 const vAmt = (Number(q.vat_amount || 0) * proportion);
                 salesVat += vAmt;
                 
                 if (whtAmount > 0) {
                     allWhtItems.push({
                         id: b.id,
                         project_id: p.id,
                         project_name: p.objective,
                         amount: whtAmount,
                         date: b.created_at,
                         status: b.status || '',
                         isClaimed: isClaimed
                     });
                 }
                 
                 if (vAmt > 0) {
                     allSalesVatItems.push({
                         id: b.id,
                         project_id: p.id,
                         project_name: p.objective,
                         amount: vAmt,
                         date: b.created_at
                     });
                 }
             }
        });

        const totalPurchaseVatProj = p.project_expenses ? p.project_expenses.reduce((s,e)=>s+Number(e.vat_amount || 0), 0) : 0;
        const totalExpensesProj = p.project_expenses ? p.project_expenses.reduce((s,e)=>s+(Number(e.amount) + Number(e.vat_amount || 0)), 0) : 0;
        const netExpensesProj = totalExpensesProj - totalPurchaseVatProj;

        const salesBeforeVat = inc - salesVat;
        const profitBeforeVat = salesBeforeVat - wht - netExpensesProj;
        const vatCredit = totalPurchaseVatProj - salesVat;
        const projectProfit = profitBeforeVat + wht + vatCredit;
        const creditBase = profitBeforeVat;
        
        let withdrawableProfit = 0;
        let heldBackProfit = 0;
        let companyFee = 0;
        
        if (creditBase > 0) {
            if (p.status === 'เสร็จสิ้น') {
                withdrawableProfit = creditBase * 0.95;
                companyFee = creditBase * 0.05;
                heldBackProfit = 0;
            } else {
                withdrawableProfit = creditBase * 0.90;
                heldBackProfit = creditBase * 0.05;
                companyFee = creditBase * 0.05;
            }
        } else {
            withdrawableProfit = creditBase;
        }

        totalProfit += withdrawableProfit;
        totalHeldBack += heldBackProfit;
        totalCompanyFee += companyFee;
        totalIncome += inc;
        totalWhtCredit += wht;
        totalSalesVat += salesVat;

        return {
          id: p.id,
          name: p.objective,
          income: inc,
          expense: exp,
          status: p.status,
          profit: withdrawableProfit,
          heldBack: heldBackProfit,
          companyFee: companyFee,
          fullProfit: creditBase
        };
      });
      
      // 3. Fetch Withdrawals for this account (and all withdrawals for payer mapping)
      const { data: allWithdrawals } = await supabase.from('fund_withdrawals').select('*, bank_accounts(bank_name, account_number, account_name)').order('created_at', { ascending: false });
      
      const payerMap = {};
      const accountWithdrawals = [];
      allWithdrawals?.forEach(w => {
         if (w.internal_account_id === accountId) {
             accountWithdrawals.push(w);
         }
         if (Number(w.amount) < 0) {
            const match = w.note?.match(/\(Ref: (.*?)\)/);
            if (match && match[1]) {
                payerMap[match[1]] = w.internal_account_id;
            }
         }
      });
      
      // Calculate Purchase VAT across ALL projects for THIS account
      const { data: globalProjects } = await supabase.from('projects').select('id, objective, internal_account_id');
      const { data: allExpenses } = await supabase.from('project_expenses').select('id, amount, vat_amount, is_tax_invoice, created_at, reference_no, project_id, contacts(name)');
      
      allExpenses?.forEach(e => {
         if (e.is_tax_invoice) {
             let payerId = payerMap[e.reference_no];
             let projName = '-';
             if (e.project_id) {
                 const proj = globalProjects?.find(p => p.id === e.project_id);
                 if (proj) {
                     if (!payerId) payerId = proj.internal_account_id;
                     projName = proj.objective;
                 }
             }
                     if (payerId === accountId) {
                         const vAmt = Number(e.vat_amount || 0);
                         if (vAmt > 0) {
                             allPurchaseVatItems.push({
                                 id: e.id,
                                 project_id: e.project_id,
                                 project_name: projName,
                                 amount: vAmt,
                                 date: e.created_at,
                                 supplier: e.contacts?.name || '-'
                             });
                             totalPurchaseVat += vAmt;
                         }
                     }
                 }
             });
      
      setLinkedProjects(formattedProjects);
      
      allSalesVatItems.sort((a,b) => new Date(b.date) - new Date(a.date));
      allPurchaseVatItems.sort((a,b) => new Date(b.date) - new Date(a.date));
      allWhtItems.sort((a,b) => new Date(b.date) - new Date(a.date));
      setVatTransactions({ sales: allSalesVatItems, purchase: allPurchaseVatItems });
      setWhtItems(allWhtItems);

      // Calculate total VAT cleared so far
      const totalVatCleared = accountWithdrawals
        .filter(w => w.method === 'vat_clearance' || w.note?.startsWith('VAT_CLEARANCE'))
        .reduce((s, w) => s + Number(w.amount), 0);

      const totalWithdrawn = accountWithdrawals.reduce((s, w) => s + Number(w.amount), 0);
      setWithdrawals(accountWithdrawals);

      setAccount({
        ...accData,
        creditLimit: totalProfit > 0 ? totalProfit : 0,
        withdrawn: totalWithdrawn,
        heldBack: totalHeldBack > 0 ? totalHeldBack : 0,
        companyFee: totalCompanyFee > 0 ? totalCompanyFee : 0,
        salesVat: totalSalesVat,
        purchaseVat: totalPurchaseVat,
        vatCleared: totalVatCleared,
        vatPayable: totalSalesVat - totalPurchaseVat - totalVatCleared,
        whtCredit: totalWhtCredit
      });

      // 4. Calculate Global Available Fund
      const { data: allDeposits } = await supabase.from('fund_deposits').select('amount');
      const sumDeposits = (allDeposits || []).reduce((s,d)=>s+Number(d.amount), 0);
      
      const { data: globalWithdrawalSums } = await supabase.from('fund_withdrawals').select('amount');
      const sumAllWithdrawals = (globalWithdrawalSums || []).reduce((s,w)=>s+Number(w.amount), 0);

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
    const vatReserved = Math.max(0, account?.vatPayable || 0);
    const maxWithdrawable = Math.max(0, availableCredit - vatReserved);

    if (amountNum > maxWithdrawable) {
      if (vatReserved > 0) {
        setErrorMsg(`ยอดเบิกเกินโควต้า! (ถูกหักสำรองรอจ่าย VAT ค้างชำระ ${formatMoney(vatReserved)} บาท)`);
      } else {
        setErrorMsg('ยอดเบิกเกินโควต้าเครดิตที่มีอยู่!');
      }
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

  const handleClearVat = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const amountNum = parseFloat(vatClearData.amount);

    if (amountNum === 0 || isNaN(amountNum)) {
      setErrorMsg('กรุณากรอกยอดเงินให้ถูกต้อง');
      return;
    }

    const { error } = await supabase.from('fund_withdrawals').insert([{
      internal_account_id: accountId,
      amount: amountNum, // positive if paying govt (reduces cash), negative if refund (increases cash)
      note: `VAT_CLEARANCE: ${vatClearData.note || 'เคลียร์ยอดภาษีมูลค่าเพิ่ม'}`,
      method: 'vat_clearance',
      bank_account_id: null
    }]);

    if (!error) {
      fetchAccountData();
      setShowVatClearance(false);
      setVatClearData({ amount: '', note: '' });
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการเคลียร์ VAT: ' + error.message);
    }
  };

  const handleClearHeldBack = (projectId) => {
    setConfirmClearData(projectId);
  };

  const executeClearHeldBack = async () => {
    if (!confirmClearData) return;
    if (account.heldBack < 10000 || account.vatPayable > 0) {
      setErrorMsg('ไม่สามารถเคลียร์ยอดได้เนื่องจากไม่ผ่านเงื่อนไข (ยอดรอเคลียร์ < 10,000 หรือ มียอดค้างชำระ VAT)');
      setConfirmClearData(null);
      return;
    }
    const projectId = confirmClearData;
    setConfirmClearData(null);
    
    const { error } = await supabase.from('projects').update({ status: 'เสร็จสิ้น' }).eq('id', projectId);
    if (!error) {
       fetchAccountData();
    } else {
       setErrorMsg('ไม่สามารถเคลียร์ยอดได้: ' + error.message);
    }
  };

  const handleAutoPayVatClick = () => {
    if (account.heldBack < 10000) return;
    const avCredit = account.creditLimit - account.withdrawn;
    const shortfall = Math.max(0, account.vatPayable - account.heldBack);
    if (avCredit < shortfall) return;
    setConfirmAutoPayVat(true);
  };

  const executeAutoPayVat = async () => {
    if (account.heldBack < 10000) return;
    setConfirmAutoPayVat(false);
    setIsLoading(true);
    // 1. Set all linked projects with heldBack > 0 to 'เสร็จสิ้น'
    const projectsToClear = linkedProjects.filter(p => p.heldBack > 0).map(p => p.id);
    if (projectsToClear.length > 0) {
      const { error: pError } = await supabase.from('projects').update({ status: 'เสร็จสิ้น' }).in('id', projectsToClear);
      if (pError) {
        setErrorMsg('เกิดข้อผิดพลาดในการอัปเดตโปรเจกต์: ' + pError.message);
        setIsLoading(false);
        return;
      }
    }

    // 2. Insert vat_clearance withdrawal
    const { error: wError } = await supabase.from('fund_withdrawals').insert([{
      internal_account_id: accountId,
      amount: account.vatPayable,
      note: `VAT_CLEARANCE: หักลบจากยอดรอเคลียร์และเครดิตคงเหลืออัตโนมัติ`,
      method: 'vat_clearance',
      bank_account_id: null
    }]);

    if (wError) {
      setErrorMsg('เกิดข้อผิดพลาดในการตัดยอด VAT: ' + wError.message);
    }
    
    await fetchAccountData();
    setIsLoading(false);
  };

  if(isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูล...</div>;
  if(!account) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>ไม่พบบัญชีนี้</div>;

  const availableCredit = account.creditLimit - account.withdrawn;
  const vatShortfall = Math.max(0, account.vatPayable - account.heldBack);
  const canAffordAutoPayVat = availableCredit >= vatShortfall;
  const vatReserved = Math.max(0, account.vatPayable);
  const maxWithdrawable = Math.max(0, availableCredit - vatReserved);

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
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'white', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(4px)' }}>
            เงินสดกองกลาง: ฿{formatMoney(totalFundAvailable)}
          </div>
        </div>
        
        {account.companyFee > 0 && (
          <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid #3b82f6' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              <i className="fa-solid fa-building" style={{ color: '#3b82f6' }}></i> หักเข้ากองกลางบริษัท (5%)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>฿{formatMoney(account.companyFee)}</div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>สำหรับค่าบัญชีและอื่นๆ (เงินอยู่ในกองกลาง)</div>
          </div>
        )}
        
        {account.heldBack > 0 && (
          <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid #f97316', gridColumn: '1 / -1', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setShowHeldBackList(!showHeldBackList)} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 16px rgba(249, 115, 22, 0.2)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  <i className="fa-solid fa-lock" style={{ color: '#f97316' }}></i> ยอดรอเคลียร์รวม (5%)
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f97316' }}>฿{formatMoney(account.heldBack)}</div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>คลิกเพื่อดูรายการและดำเนินการเคลียร์ยอดเข้ากระเป๋าหลัก</div>
              </div>
              <div style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', padding: '12px', borderRadius: '50%' }}>
                <i className={`fa-solid ${showHeldBackList ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '20px' }}></i>
              </div>
            </div>
            
            {showHeldBackList && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }} onClick={e => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)' }}>รายการโปรเจกต์ที่รอเคลียร์ 5%</h4>
                
                {(!account.heldBack || account.heldBack < 10000 || account.vatPayable > 0) && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                    <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
                      <i className="fa-solid fa-triangle-exclamation"></i> ยังไม่สามารถเคลียร์ยอดเข้ากระเป๋าได้ เนื่องจาก:
                    </div>
                    <ul style={{ margin: '0', paddingLeft: '24px', color: '#ef4444', fontSize: '14px', lineHeight: '1.6' }}>
                      {account.heldBack < 10000 && <li>ยอดรอเคลียร์รวม (5%) ต้องสะสมให้มากกว่าหรือเท่ากับ 10,000 บาท <span style={{opacity: 0.8}}>(ปัจจุบัน: ฿{formatMoney(account.heldBack)})</span></li>}
                      {account.vatPayable > 0 && <li>ต้องไม่มียอดค้างชำระภาษีมูลค่าเพิ่ม <span style={{opacity: 0.8}}>(ยอดต้องชำระ ส่ง ภ.พ.30 ต้องเป็น 0 บาท) (ปัจจุบันค้างชำระ: ฿{formatMoney(account.vatPayable)})</span></li>}
                    </ul>
                    
                    {account.vatPayable > 0 && account.heldBack >= 10000 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#ef4444' }}>
                          💡 <strong>ทางเลือก:</strong> คุณสามารถให้ระบบนำยอดรอเคลียร์รวมทั้งหมด <strong>(฿{formatMoney(account.heldBack)})</strong> ไปชำระภาษี <strong>(฿{formatMoney(account.vatPayable)})</strong> ได้อัตโนมัติ<br/>
                          <span style={{opacity: 0.8}}>(หากยอดรอเคลียร์ไม่พอ ระบบจะดึงเงินจาก "เครดิตคงเหลือเบิกได้" มารวมให้ครบจำนวนภาษีโดยอัตโนมัติ)</span>
                        </p>
                        
                        {!canAffordAutoPayVat && (
                          <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <i className="fa-solid fa-circle-xmark" style={{ marginTop: '3px' }}></i>
                            <div>
                              ไม่สามารถทำรายการอัตโนมัติได้ เนื่องจากเครดิตคงเหลือเบิกได้มีไม่พอจ่ายส่วนต่าง<br/>
                              (ต้องการเครดิตสมทบ: <strong>฿{formatMoney(vatShortfall)}</strong> แต่มีเครดิตคงเหลือเพียง <strong>฿{formatMoney(availableCredit)}</strong>)
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={canAffordAutoPayVat ? handleAutoPayVatClick : undefined} 
                          disabled={!canAffordAutoPayVat}
                          style={{ 
                            padding: '8px 16px', 
                            background: canAffordAutoPayVat ? '#ef4444' : 'rgba(239, 68, 68, 0.5)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: canAffordAutoPayVat ? 'pointer' : 'not-allowed', 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            transition: 'all 0.2s',
                            opacity: canAffordAutoPayVat ? 1 : 0.7
                          }} 
                          onMouseOver={e => { if(canAffordAutoPayVat) e.currentTarget.style.background = '#dc2626' }} 
                          onMouseOut={e => { if(canAffordAutoPayVat) e.currentTarget.style.background = '#ef4444' }}
                        >
                          <i className="fa-solid fa-wand-magic-sparkles"></i> นำยอดรอเคลียร์ไปจ่ายภาษีอัตโนมัติ
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>โปรเจกต์</th>
                        <th style={{ textAlign: 'right', padding: '8px' }}>ยอดที่รอเคลียร์</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedProjects.filter(p => p.heldBack > 0).map(proj => (
                        <tr key={proj.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <Link href={`/projects/${proj.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{proj.id}</Link>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{proj.name}</div>
                          </td>
                          <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 'bold', color: '#f97316' }}>
                            +฿{formatMoney(proj.heldBack)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                            <button 
                              onClick={() => {
                                if (account.heldBack >= 10000 && account.vatPayable <= 0) {
                                  handleClearHeldBack(proj.id);
                                }
                              }} 
                              disabled={account.heldBack < 10000 || account.vatPayable > 0}
                              style={{ 
                                padding: '6px 12px', 
                                background: '#f97316', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: (account.heldBack >= 10000 && account.vatPayable <= 0) ? 'pointer' : 'not-allowed', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                opacity: (account.heldBack >= 10000 && account.vatPayable <= 0) ? 1 : 0.5
                              }}>
                              <i className="fa-solid fa-check"></i> เคลียร์เข้ากระเป๋า
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {(account.whtCredit > 0 || whtItems.length > 0) && (
          <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid #eab308', gridColumn: '1 / -1', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setShowWhtList(!showWhtList)} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 16px rgba(234, 179, 8, 0.2)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#eab308' }}></i> เครดิตภาษีหัก ณ ที่จ่าย
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#eab308' }}>฿{formatMoney(account.whtCredit)}</div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>คลิกเพื่อดูรายการที่ต้องตามใบหัก 3% และกดรับเงินเข้าเครดิต</div>
              </div>
              <div style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '12px', borderRadius: '50%' }}>
                <i className={`fa-solid ${showWhtList ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '20px' }}></i>
              </div>
            </div>

            {showWhtList && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }} onClick={e => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)' }}>รายการติดตามเอกสารหัก ณ ที่จ่าย (WHT)</h4>
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>รหัสโปรเจกต์</th>
                        <th style={{ padding: '8px' }}>ชื่อโปรเจกต์</th>
                        <th style={{ textAlign: 'right', padding: '8px' }}>ยอดภาษีหัก ณ ที่จ่าย</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whtItems.map(item => (
                        <tr key={`wht-${item.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--primary)' }}>
                            <Link href={`/projects/${item.project_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{item.project_id}</Link>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
                              วันที่: {new Date(item.date).toLocaleDateString('th-TH')}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{item.project_name}</td>
                          <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 'bold', color: '#eab308' }}>฿{formatMoney(item.amount)}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', opacity: item.isClaimed ? 0.7 : 1, background: item.isClaimed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${item.isClaimed ? '#10b981' : '#eab308'}`, transition: 'all 0.2s' }} onMouseOver={e => {if(!item.isClaimed) e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)'}} onMouseOut={e => {if(!item.isClaimed) e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)'}}>
                              <input 
                                type="checkbox" 
                                checked={item.isClaimed} 
                                onChange={() => handleToggleWht(item.id, item.status)}
                                style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }} 
                              />
                              <span style={{ fontSize: '13px', color: item.isClaimed ? '#10b981' : '#ca8a04', fontWeight: item.isClaimed ? 'bold' : '600' }}>
                                {item.isClaimed ? 'ได้รับเงินแล้ว' : 'กดรับเงิน (เข้าเครดิต)'}
                              </span>
                            </label>
                          </td>
                        </tr>
                      ))}
                      {whtItems.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>ไม่มีรายการที่ต้องติดตาม</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VAT Section (Wallet) */}
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', gridColumn: '1 / -1', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, #ec4899, #8b5cf6)' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-wallet" style={{ color: '#ec4899' }}></i> กระเป๋าเงิน VAT (VAT Wallet)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                ยอด VAT ขายสะสม <strong>฿{formatMoney(account.salesVat || 0)}</strong> - ยอด VAT ซื้อสะสม <strong>฿{formatMoney(account.purchaseVat || 0)}</strong>
              </div>
            </div>
            
            <button onClick={() => setShowVatClearance(!showVatClearance)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ec4899', background: 'rgba(236,72,153,0.1)', color: '#ec4899', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
              <i className="fa-solid fa-file-invoice"></i> เคลียร์ยอด VAT ประจำเดือน
            </button>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', background: account.vatPayable > 0 ? 'rgba(244,63,94,0.05)' : (account.vatPayable < 0 ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.02)'), padding: '20px', borderRadius: '16px', border: `1px solid ${account.vatPayable > 0 ? 'rgba(244,63,94,0.2)' : (account.vatPayable < 0 ? 'rgba(16,185,129,0.2)' : 'var(--border)')}` }}>
              <div style={{ color: account.vatPayable > 0 ? 'var(--danger)' : (account.vatPayable < 0 ? 'var(--secondary)' : 'var(--text-muted)'), fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                {account.vatPayable > 0 ? '🔴 ยอดต้องชำระ (ส่ง ภ.พ.30)' : (account.vatPayable < 0 ? '🟢 เครดิต VAT คงเหลือ (ขอคืนได้)' : 'ยอด VAT คงค้าง')}
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: account.vatPayable > 0 ? 'var(--danger)' : (account.vatPayable < 0 ? 'var(--secondary)' : 'var(--text-main)') }}>
                ฿{formatMoney(Math.abs(account.vatPayable || 0))}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                ประวัติเคลียร์ยอดแล้ว: ฿{formatMoney(account.vatCleared || 0)}
              </div>
            </div>
          </div>
          
          {showVatClearance && (
            <div style={{ marginTop: '20px', padding: '20px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)', animation: 'fadeIn 0.3s' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--text-main)' }}>เคลียร์ยอด VAT ประจำเดือน</h4>
              <form onSubmit={handleClearVat} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>จำนวนเงิน (จ่ายไปให้เป็นบวก, ขอคืนให้เป็นลบ)</label>
                  <input type="number" step="0.01" value={vatClearData.amount} onChange={e => setVatClearData({...vatClearData, amount: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="เช่น 500 หรือ -500" required />
                </div>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>หมายเหตุ (รอบเดือน)</label>
                  <input type="text" value={vatClearData.note} onChange={e => setVatClearData({...vatClearData, note: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="เช่น ภ.พ.30 ประจำเดือน สิงหาคม" />
                </div>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ec4899', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>บันทึกเคลียร์ยอด</button>
              </form>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                * การเคลียร์ยอดบวก (จ่ายภาษี) จะดึงเงินสดจากกระเป๋ากองกลาง / การเคลียร์ยอดลบ (ขอคืน) จะเป็นการฝากเงินคืนเข้ากระเป๋ากองกลาง
              </div>
            </div>
          )}
          
          {/* Toggle Button */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              onClick={() => setShowVatList(!showVatList)}
              style={{ background: 'transparent', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '20px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              {showVatList ? <><i className="fa-solid fa-chevron-up"></i> ซ่อนรายการ VAT</> : <><i className="fa-solid fa-chevron-down"></i> ดูรายการ VAT ทั้งหมด</>}
            </button>
          </div>

          {/* VAT Transactions Table */}
          {showVatList && (
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-arrow-right-to-bracket" style={{ color: 'var(--primary)' }}></i> รายการ VAT ขาย
                </div>
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', maxHeight: '300px', overflowY: 'auto' }}>
                  {vatTransactions.sales.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>ไม่มีรายการ</div> : null}
                  {vatTransactions.sales.map((item, idx) => (
                    <div key={`vs-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed var(--border)', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}><Link href={`/projects/${item.project_id}`} style={{color: 'inherit', textDecoration: 'none'}}>{item.project_id}</Link></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('th-TH')} • {item.project_name}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>+฿{formatMoney(item.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-arrow-right-from-bracket" style={{ color: 'var(--warning)' }}></i> รายการ VAT ซื้อ
                </div>
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', maxHeight: '300px', overflowY: 'auto' }}>
                  {vatTransactions.purchase.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>ไม่มีรายการ</div> : null}
                  {vatTransactions.purchase.map((item, idx) => (
                    <div key={`vp-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed var(--border)', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}><Link href={`/projects/${item.project_id}`} style={{color: 'inherit', textDecoration: 'none'}}>{item.project_id}</Link></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('th-TH')} • {item.supplier}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning)' }}>-฿{formatMoney(item.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="doc-card" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideUp 0.3s ease-out', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--gradient-primary)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}></div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 16px auto' }}>
                <i className="fa-solid fa-money-bill-transfer"></i>
              </div>
              ทำรายการเบิกเงิน
            </h3>
            
            {errorMsg && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
              </div>
            )}

            <form onSubmit={handleWithdraw} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '12px', fontWeight: 500, color: 'var(--text-main)' }}>รูปแบบการเบิกเงิน</label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '16px', borderRadius: '16px', border: withdrawData.method === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border)', background: withdrawData.method === 'cash' ? 'rgba(99,102,241,0.05)' : 'var(--background)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = withdrawData.method === 'cash' ? 'var(--primary)' : 'var(--border)'}>
                    <input type="radio" name="method" value="cash" checked={withdrawData.method === 'cash'} onChange={e => setWithdrawData({...withdrawData, method: e.target.value, bankAccountId: ''})} style={{ display: 'none' }} />
                    <i className="fa-solid fa-money-bill-wave" style={{ color: withdrawData.method === 'cash' ? 'var(--secondary)' : 'var(--text-muted)', fontSize: '20px' }}></i>
                    <span style={{ fontWeight: withdrawData.method === 'cash' ? 600 : 500, color: withdrawData.method === 'cash' ? 'var(--primary)' : 'var(--text-main)' }}>เงินสด</span>
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '16px', borderRadius: '16px', border: withdrawData.method === 'transfer' ? '2px solid var(--primary)' : '1px solid var(--border)', background: withdrawData.method === 'transfer' ? 'rgba(99,102,241,0.05)' : 'var(--background)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = withdrawData.method === 'transfer' ? 'var(--primary)' : 'var(--border)'}>
                    <input type="radio" name="method" value="transfer" checked={withdrawData.method === 'transfer'} onChange={e => setWithdrawData({...withdrawData, method: e.target.value})} style={{ display: 'none' }} />
                    <i className="fa-solid fa-building-columns" style={{ color: withdrawData.method === 'transfer' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '20px' }}></i>
                    <span style={{ fontWeight: withdrawData.method === 'transfer' ? 600 : 500, color: withdrawData.method === 'transfer' ? 'var(--primary)' : 'var(--text-main)' }}>โอนเข้าบัญชี</span>
                  </label>
                </div>
              </div>

              {withdrawData.method === 'transfer' && (
                <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--background)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-main)' }}>บัญชีธนาคารปลายทาง</label>
                  {bankAccounts.length > 0 ? (
                    <select value={withdrawData.bankAccountId} onChange={e => setWithdrawData({...withdrawData, bankAccountId: e.target.value})} className="form-control" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '15px' }} required>
                      <option value="">-- เลือกบัญชีธนาคาร --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.account_name})</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: 'var(--warning)', fontSize: '14px', background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '8px' }}>
                      <i className="fa-solid fa-triangle-exclamation"></i> บัญชีนี้ยังไม่มีข้อมูลธนาคาร กรุณาไปเพิ่มในหน้า "ตั้งค่า (Settings)" ก่อน
                    </div>
                  )}
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-main)' }}>จำนวนเงินที่ต้องการเบิก (บาท)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px' }}>฿</span>
                  <input type="number" step="0.01" value={withdrawData.amount} onChange={e => setWithdrawData({...withdrawData, amount: e.target.value})} max={maxWithdrawable} className="form-control" style={{ width: '100%', padding: '16px 16px 16px 40px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '18px', fontWeight: 'bold', background: 'var(--background)', color: 'var(--text-main)' }} placeholder="0.00" required />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  {vatReserved > 0 ? (
                    <span style={{ color: '#ef4444' }}>
                      *หักสำรองจ่าย VAT ค้างชำระ: -฿{formatMoney(vatReserved)}
                    </span>
                  ) : (
                    <span></span>
                  )}
                  <span>เบิกได้สูงสุด: <strong style={{ color: 'var(--primary)' }}>฿{formatMoney(maxWithdrawable)}</strong></span>
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-main)' }}>หมายเหตุ (ตัวเลือก)</label>
                <input type="text" value={withdrawData.note} onChange={e => setWithdrawData({...withdrawData, note: e.target.value})} className="form-control" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }} placeholder="เช่น เบิกไปซื้อวัสดุ" />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="button" onClick={() => {setShowWithdrawForm(false); setErrorMsg('');}} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>ยกเลิก</button>
                <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', color: 'white', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>ยืนยันการเบิกเงิน</button>
              </div>
            </form>
          </div>
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
                  <th style={{ textAlign: 'right' }}>กำไรก่อน VAT</th>
                  <th style={{ textAlign: 'right' }}>เบิกได้ (90%)</th>
                  <th style={{ textAlign: 'center' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {linkedProjects.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีโปรเจกต์</td></tr> : null}
                {linkedProjects.map(proj => {
                  const profit = proj.profit;
                  return (
                    <tr key={proj.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <Link href={`/projects/${proj.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{proj.id}</Link>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{proj.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: proj.fullProfit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                        {proj.fullProfit >= 0 ? '+' : ''}฿{formatMoney(proj.fullProfit)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                        {profit >= 0 ? '+' : ''}฿{formatMoney(profit)}
                        {proj.heldBack > 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>(รอเคลียร์ 5%: +฿{formatMoney(proj.heldBack)})</div>}
                        {proj.companyFee > 0 && <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'normal', opacity: 0.8 }}>(หักเข้าบริษัท 5%: -฿{formatMoney(proj.companyFee)})</div>}
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
            <i className="fa-solid fa-receipt" style={{ color: 'var(--danger)' }}></i> ประวัติการเบิกเงิน / สำรองจ่าย
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
                {withdrawals.length === 0 ? <tr><td colSpan="3" style={{textAlign:'center', padding:'20px', color:'var(--text-muted)'}}>ไม่มีประวัติรายการ</td></tr> : null}
                {withdrawals.map(w => {
                  const isDeposit = Number(w.amount) < 0;
                  const displayAmount = Math.abs(Number(w.amount));
                  return (
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
                      {isDeposit && (
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px', fontWeight: 'bold' }}>
                          <i className="fa-solid fa-arrow-turn-down"></i> ยอดสำรองจ่ายเข้าโปรเจกต์
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 'bold', color: isDeposit ? 'var(--secondary)' : 'var(--danger)', fontSize: '15px' }}>
                      {isDeposit ? '+' : '-'}฿{formatMoney(displayAmount)}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      {/* Confirmation Modal */}
      {confirmClearData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', textAlign: 'center', fontSize: '20px' }}>ยืนยันการเคลียร์ยอด</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              คุณต้องการเคลียร์ยอด 10% สำหรับโปรเจกต์ <strong style={{ color: 'var(--text-main)' }}>{confirmClearData}</strong> ใช่หรือไม่?<br/><br/>
              <span style={{ fontSize: '13px', opacity: 0.8 }}>*เมื่อเคลียร์แล้ว สถานะของโปรเจกต์จะถูกเปลี่ยนเป็น "เสร็จสิ้น" ทันที และยอดเงินจะถูกทบเข้าในเครดิตคงเหลือเบิกได้</span>
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmClearData(null)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                ยกเลิก
              </button>
              <button onClick={executeClearHeldBack} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(249,115,22,0.3)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                ยืนยันการเคลียร์
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WHT Confirmation Modal */}
      {confirmWhtData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ background: confirmWhtData.currentStatus.includes('CLAIMED') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: confirmWhtData.currentStatus.includes('CLAIMED') ? '#ef4444' : '#10b981', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>
                <i className={`fa-solid ${confirmWhtData.currentStatus.includes('CLAIMED') ? 'fa-rotate-left' : 'fa-check'}`}></i>
              </div>
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', textAlign: 'center', fontSize: '20px' }}>
              {confirmWhtData.currentStatus.includes('CLAIMED') ? 'ยกเลิกการรับเงินคืน WHT' : 'ยืนยันการรับเงินคืน WHT'}
            </h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              {confirmWhtData.currentStatus.includes('CLAIMED') 
                ? 'คุณต้องการยกเลิกการรับเงินคืนภาษีหัก ณ ที่จ่าย 3% ใช่หรือไม่? (ยอดเงินจะถูกหักออกจากเครดิตเบิกได้)' 
                : 'คุณได้รับเอกสารและเงินคืนภาษีหัก ณ ที่จ่าย 3% จากรายการนี้เรียบร้อยแล้วใช่หรือไม่?'}<br/><br/>
              {!confirmWhtData.currentStatus.includes('CLAIMED') && <span style={{ fontSize: '13px', opacity: 0.8 }}>*เมื่อเคลมแล้ว ยอดเงินจะทบเข้าเครดิตเบิกได้ทันที</span>}
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmWhtData(null)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                ยกเลิก
              </button>
              <button onClick={executeToggleWht} style={{ flex: 1, padding: '12px', background: confirmWhtData.currentStatus.includes('CLAIMED') ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, boxShadow: confirmWhtData.currentStatus.includes('CLAIMED') ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                ยืนยันการทำรายการ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Auto Pay VAT Confirmation Modal */}
      {confirmAutoPayVat && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: '24px', width: '450px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px' }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', textAlign: 'center', fontSize: '20px' }}>
              ยืนยันการเคลียร์ยอดอัตโนมัติ
            </h3>
            
            <div style={{ background: 'var(--background)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>นำยอดรอเคลียร์ทั้งหมด:</span>
                <span style={{ fontWeight: 'bold', color: '#f97316' }}>฿{formatMoney(account.heldBack)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>ไปชำระภาษี VAT ค้างจ่าย:</span>
                <span style={{ fontWeight: 'bold', color: '#ef4444' }}>฿{formatMoney(account.vatPayable)}</span>
              </div>
              {account.heldBack < account.vatPayable && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ดึงส่วนต่างจากเครดิตคงเหลือ:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>฿{formatMoney(account.vatPayable - account.heldBack)}</span>
                </div>
              )}
            </div>
            
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 24px 0', lineHeight: '1.6', fontSize: '13px' }}>
              *ระบบจะดำเนินการเปลี่ยนสถานะโปรเจกต์ที่ติดยอดรอเคลียร์ทั้งหมดเป็น "เสร็จสิ้น" และโยกเงินเข้าไปเพื่อตัดยอดภาษีมูลค่าเพิ่มโดยอัตโนมัติ
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmAutoPayVat(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                ยกเลิก
              </button>
              <button onClick={executeAutoPayVat} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ec4899, #db2777)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(236,72,153,0.3)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                ยืนยันการทำรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
