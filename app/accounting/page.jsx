"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import EmployeesTab from '../components/accounting/EmployeesTab';
import PayrollTab from '../components/accounting/PayrollTab';
import CorporateExpensesTab from '../components/accounting/CorporateExpensesTab';
import TaxScheduleTab from '../components/accounting/TaxScheduleTab';

export default function AccountingDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Data
  const [billings, setBillings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [allDeposits, setAllDeposits] = useState([]);
  const [paidPayrolls, setPaidPayrolls] = useState([]);
  const [paidCorpExpenses, setPaidCorpExpenses] = useState([]);
  
  const [activeTab, setActiveTab] = useState('sales_tax'); // sales_tax, purchase_tax, wht

  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const fetchAccountingData = async () => {
    setIsLoading(true);
    
    // 1. Fetch Receipts (Sales Tax basis)
    const { data: bData } = await supabase
      .from('billings')
      .select('*, projects(id, objective, contacts(name))')
      .eq('type', 'receipt');
      
    if (bData) setBillings(bData);

    // 2. Fetch all approved quotations to match VAT/WHT data to receipts
    const { data: qData } = await supabase
      .from('quotations')
      .select('*')
      .eq('status', 'อนุมัติแล้ว');
      
    if (qData) setQuotations(qData);

    // 3. Fetch Expenses (ALL)
    const { data: eData } = await supabase
      .from('project_expenses')
      .select('*, projects(id, objective), contacts(name)')
      .order('created_at', { ascending: false });
      
    if (eData) setExpenses(eData);

    // 4. Fetch Fund Deposits (transfers to Internal)
    const { data: fdData } = await supabase.from('fund_deposits').select('*');
    if (fdData) setAllDeposits(fdData);

    // 5. Fetch Paid Payroll (bank method only, since cash is in fund_deposits)
    const { data: payData } = await supabase.from('payroll_items').select('*, payroll_runs!inner(status)').eq('payroll_runs.status', 'paid').eq('payment_method', 'bank');
    if (payData) setPaidPayrolls(payData);

    // 6. Fetch Paid Corporate Expenses (bank method only)
    const { data: ceData } = await supabase.from('corporate_expenses').select('*').eq('is_paid', true).eq('payment_method', 'bank');
    if (ceData) setPaidCorpExpenses(ceData);

    setIsLoading(false);
  };

  // --- Calculate Sales Tax Data ---
  // A receipt matches a quotation. If quotation has vat_rate > 0, then we have sales tax.
  // The receipt might be for a partial amount, but assuming full amount for simplicity right now.
  const salesTaxItems = billings.map(bill => {
    const quote = quotations.find(q => q.id === bill.quotation_id);
    if (!quote) return null;
    
    // For simplicity, assuming the receipt amount is the quote total_amount.
    // So VAT of this receipt = quote.vat_amount
    const isFullPayment = bill.total_amount >= quote.total_amount;
    const vat = isFullPayment ? quote.vat_amount : (bill.total_amount * 7 / 107); // rough estimate if partial
    const subTotal = isFullPayment ? quote.sub_total : (bill.total_amount * 100 / 107);
    const wht = isFullPayment ? quote.wht_amount : 0;
    
    return {
      ...bill,
      quote_id: quote.id,
      customer: bill.projects?.contacts?.name || 'ลูกค้าทั่วไป',
      subTotal: quote.vat_rate > 0 ? subTotal : bill.total_amount,
      vatAmount: quote.vat_rate > 0 ? vat : 0,
      whtAmount: wht,
      hasVat: quote.vat_rate > 0
    };
  }).filter(Boolean);

  const totalSalesRevenue = salesTaxItems.reduce((sum, item) => sum + Number(item.subTotal), 0);
  const totalSalesVat = salesTaxItems.reduce((sum, item) => sum + Number(item.vatAmount), 0);
  const totalWhtDeducted = salesTaxItems.reduce((sum, item) => sum + Number(item.whtAmount), 0);

  // --- Calculate Purchase Tax Data ---
  const taxExpenses = expenses.filter(e => e.is_tax_invoice);
  const totalPurchaseExpenses = taxExpenses.reduce((sum, e) => sum + Number(e.sub_total || e.amount), 0);
  const totalPurchaseVat = taxExpenses.reduce((sum, e) => sum + Number(e.vat_amount || 0), 0);
  const totalWhtWithheld = taxExpenses.reduce((sum, e) => sum + Number(e.wht_amount || 0), 0);

  // --- Company Main Balance ---
  const totalCompanyIncome = billings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalCompanyExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBankPayroll = paidPayrolls.reduce((sum, p) => sum + Number(p.net_pay) + Number(p.social_security) + Number(p.tax_deduction), 0);
  const totalBankCorpExpenses = paidCorpExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const mainCompanyBalance = totalCompanyIncome - totalCompanyExpense - totalBankPayroll - totalBankCorpExpenses;

  // --- Net Tax ---
  const netVatPayable = totalSalesVat - totalPurchaseVat;

  if (isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูลทางบัญชี...</div>;

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: '32px', marginBottom: '8px' }}>
            <i className="fa-solid fa-building-columns"></i> บัญชีบริษัท (ส่งสรรพากร)
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>สรุปรายการภาษีซื้อ ภาษีขาย และหัก ณ ที่จ่าย สำหรับยื่นภาษีประจำเดือน</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/accounting/income" style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)', color: '#93c5fd', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <i className="fa-solid fa-book"></i> สมุดรายวันรับ
          </Link>
          <Link href="/accounting/expense" style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.5)', color: '#fda4af', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <i className="fa-solid fa-book-open"></i> สมุดรายวันจ่าย
          </Link>
        </div>
      </div>

      {/* MAIN COMPANY BALANCE */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '24px', borderRadius: '16px', color: 'white', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '8px' }}>ยอดเงินคงเหลือในบัญชีบริษัทหลัก (Main Company Balance)</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>฿{formatMoney(mainCompanyBalance)}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
            รายรับทั้งหมด: ฿{formatMoney(totalCompanyIncome)} | รายจ่ายโปรเจกต์ทั้งหมด: ฿{formatMoney(totalCompanyExpense)}
          </div>
        </div>
        <div>
          <i className="fa-solid fa-wallet" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.1)' }}></i>
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: '4px solid #3b82f6', minWidth: '180px' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>ภาษีขายรวม (Sales Tax)</div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0' }}>฿{formatMoney(totalSalesVat)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>รายได้: ฿{formatMoney(totalSalesRevenue)}</div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: '4px solid #f43f5e', minWidth: '180px' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>ภาษีซื้อรวม (Purchase Tax)</div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#f43f5e', marginBottom: '0' }}>฿{formatMoney(totalPurchaseVat)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>ค่าใช้จ่าย: ฿{formatMoney(totalPurchaseExpenses)}</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: '4px solid #10b981', minWidth: '180px' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>ภาษีมูลค่าเพิ่มที่ต้องชำระ (นำส่ง)</div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 'bold', color: netVatPayable > 0 ? '#f43f5e' : '#10b981', marginBottom: '0' }}>
            {netVatPayable > 0 ? 'นำส่ง: ' : 'ขอคืน: '} ฿{formatMoney(Math.abs(netVatPayable))}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>ภาษีขาย - ภาษีซื้อ</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: '4px solid #f59e0b', minWidth: '180px' }}>
          <div className="stat-title" style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>หัก ณ ที่จ่าย (รอขอคืน)</div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0' }}>฿{formatMoney(totalWhtDeducted)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>จากการรับชำระเงินลูกค้า</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)', overflowX: 'auto', paddingBottom: '8px', whiteSpace: 'nowrap' }}>
        <button onClick={() => setActiveTab('sales_tax')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'sales_tax' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'sales_tax' ? '#3b82f6' : 'var(--text-muted)', fontWeight: activeTab === 'sales_tax' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          รายงานภาษีขาย
        </button>
        <button onClick={() => setActiveTab('purchase_tax')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'purchase_tax' ? '3px solid #f43f5e' : '3px solid transparent', color: activeTab === 'purchase_tax' ? '#f43f5e' : 'var(--text-muted)', fontWeight: activeTab === 'purchase_tax' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          รายงานภาษีซื้อ
        </button>
        <button onClick={() => setActiveTab('wht')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'wht' ? '3px solid #f59e0b' : '3px solid transparent', color: activeTab === 'wht' ? '#f59e0b' : 'var(--text-muted)', fontWeight: activeTab === 'wht' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          ติดตามหัก ณ ที่จ่าย
        </button>
        <button onClick={() => setActiveTab('tax_schedule')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'tax_schedule' ? '3px solid #6366f1' : '3px solid transparent', color: activeTab === 'tax_schedule' ? '#6366f1' : 'var(--text-muted)', fontWeight: activeTab === 'tax_schedule' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          กำหนดการส่งสรรพากร
        </button>
        <button onClick={() => setActiveTab('payroll')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'payroll' ? '3px solid #8b5cf6' : '3px solid transparent', color: activeTab === 'payroll' ? '#8b5cf6' : 'var(--text-muted)', fontWeight: activeTab === 'payroll' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          ระบบเงินเดือน (Payroll)
        </button>
        <button onClick={() => setActiveTab('employees')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'employees' ? '3px solid #8b5cf6' : '3px solid transparent', color: activeTab === 'employees' ? '#8b5cf6' : 'var(--text-muted)', fontWeight: activeTab === 'employees' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          พนักงาน
        </button>
        <button onClick={() => setActiveTab('corp_expenses')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'corp_expenses' ? '3px solid #10b981' : '3px solid transparent', color: activeTab === 'corp_expenses' ? '#10b981' : 'var(--text-muted)', fontWeight: activeTab === 'corp_expenses' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
          รายจ่ายประจำ & ปันผล
        </button>
      </div>

      {/* NEW TABS RENDERING */}
      {activeTab === 'employees' && <EmployeesTab />}
      {activeTab === 'payroll' && <PayrollTab />}
      {activeTab === 'corp_expenses' && <CorporateExpensesTab />}
      {activeTab === 'tax_schedule' && <TaxScheduleTab />}

      {/* SALES TAX TAB */}
      {activeTab === 'sales_tax' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>รายการภาษีขาย (จากใบเสร็จรับเงินที่มี VAT)</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '8px 12px' }}>วันที่รับเงิน</th>
                <th style={{ padding: '8px 12px' }}>เลขที่เอกสาร</th>
                <th style={{ padding: '8px 12px' }}>ลูกค้า</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>มูลค่าสินค้า/บริการ</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>จำนวนภาษี (VAT)</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>ถูกหัก ณ ที่จ่าย</th>
              </tr>
            </thead>
            <tbody>
              {salesTaxItems.filter(i => i.hasVat).length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการภาษีขาย</td></tr> : null}
              {salesTaxItems.filter(i => i.hasVat).map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <td style={{ padding: '8px 12px' }}>{new Date(item.created_at).toLocaleDateString('th-TH')}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 500 }}>
                    <Link href={`/projects/${item.project_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {item.id} <br/><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>อ้างอิง: {item.quote_id}</span>
                    </Link>
                  </td>
                  <td>{item.customer}</td>
                  <td style={{ textAlign: 'right' }}>฿{formatMoney(item.subTotal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: '#3b82f6' }}>฿{formatMoney(item.vatAmount)}</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b' }}>{item.whtAmount > 0 ? `฿${formatMoney(item.whtAmount)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* PURCHASE TAX TAB */}
      {activeTab === 'purchase_tax' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>รายการภาษีซื้อ (จากค่าใช้จ่ายที่เป็นใบกำกับภาษี)</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '8px 12px' }}>วันที่บันทึก</th>
                <th style={{ padding: '8px 12px' }}>รายละเอียด/ผู้ขาย</th>
                <th style={{ padding: '8px 12px' }}>โปรเจกต์</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>มูลค่าสินค้า/บริการ</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>จำนวนภาษี (VAT)</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>หัก ณ ที่จ่าย (พ.ง.ด.)</th>
              </tr>
            </thead>
            <tbody>
              {taxExpenses.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการภาษีซื้อ</td></tr> : null}
              {taxExpenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <td style={{ padding: '8px 12px' }}>{new Date(e.created_at).toLocaleDateString('th-TH')}</td>
                  <td>
                    <div>{e.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><i className="fa-solid fa-store"></i> {e.contacts?.name || 'ไม่ระบุซัพพลายเออร์'}</div>
                  </td>
                  <td>
                    <Link href={`/projects/${e.project_id}`} style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                      {e.project_id}
                    </Link>
                  </td>
                  <td style={{ textAlign: 'right' }}>฿{formatMoney(e.sub_total || e.amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: '#f43f5e' }}>฿{formatMoney(e.vat_amount)}</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b' }}>{e.wht_amount > 0 ? `฿${formatMoney(e.wht_amount)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* WHT TAB */}
      {activeTab === 'wht' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>รายการถูกหัก ณ ที่จ่าย (ติดตามเอกสารใบทวิ 50)</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '8px 12px' }}>วันที่รับเงิน</th>
                <th style={{ padding: '8px 12px' }}>อ้างอิงเอกสาร</th>
                <th style={{ padding: '8px 12px' }}>ลูกค้า (ผู้หัก)</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>ยอดก่อนหัก</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>ยอดถูกหัก (WHT)</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>สถานะเอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {salesTaxItems.filter(i => i.whtAmount > 0).length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการถูกหัก ณ ที่จ่าย</td></tr> : null}
              {salesTaxItems.filter(i => i.whtAmount > 0).map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <td style={{ padding: '8px 12px' }}>{new Date(item.created_at).toLocaleDateString('th-TH')}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 500 }}>
                    <Link href={`/projects/${item.project_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {item.id} <br/><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>อ้างอิง: {item.quote_id}</span>
                    </Link>
                  </td>
                  <td>{item.customer}</td>
                  <td style={{ textAlign: 'right' }}>฿{formatMoney(item.subTotal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: '#f59e0b' }}>฿{formatMoney(item.whtAmount)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                      รอเอกสารทวิ 50
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

    </div>
  );
}
