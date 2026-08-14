"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    cogs: 0,
    whtCount: 0,
    whtTotal: 0
  });
  
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [whtAlerts, setWhtAlerts] = useState([]);
  
  // Date helpers
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
  
  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // 1. Fetch Billings (Receipts and Invoices)
      const { data: billingsData, error: billingsError } = await supabase
        .from('billings')
        .select(`
          *,
          projects ( id, objective, contacts(name) )
        `)
        .order('created_at', { ascending: false });
        
      if (billingsError) throw billingsError;
      
      // 2. Fetch Quotations to check WHT rate
      const { data: quoteData } = await supabase
        .from('quotations')
        .select('id, wht_rate, wht_amount')
        .eq('status', 'อนุมัติแล้ว');
        
      // 3. Fetch Expenses
      const { data: expenseData, error: expError } = await supabase
        .from('project_expenses')
        .select('*');
        
      if (expError) throw expError;
      
      // --- Calculate Stats (Current Month) ---
      const billingsThisMonth = billingsData.filter(b => b.created_at >= firstDayOfMonth);
      const expensesThisMonth = expenseData.filter(e => e.created_at >= firstDayOfMonth);
      
      // Revenue = Sum of Receipts this month
      const revenue = billingsThisMonth
        .filter(b => b.type === 'receipt')
        .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
        
      // COGS = Sum of expenses this month
      const cogs = expensesThisMonth
        .reduce((sum, e) => sum + Number(e.amount || e.sub_total || 0), 0);
        
      // WHT Alerts logic: Receipts that have WHT > 0
      const receiptsWithWht = billingsData
        .filter(b => b.type === 'receipt')
        .map(b => {
          const quote = quoteData?.find(q => q.id === b.quotation_id);
          const hasWht = quote && quote.wht_rate > 0;
          return hasWht ? {
            ...b,
            wht_amount: quote.wht_amount || 0,
            customer: b.projects?.contacts?.name || 'ไม่ระบุ'
          } : null;
        })
        .filter(Boolean);
        
      // WHT Stats (All pending)
      const whtCount = receiptsWithWht.length;
      const whtTotal = receiptsWithWht.reduce((sum, r) => sum + Number(r.wht_amount), 0);
      
      setStats({
        revenue,
        cogs,
        whtCount,
        whtTotal
      });
      
      // Recent Invoices (Latest 5)
      const invoices = billingsData
        .filter(b => b.type === 'invoice')
        .slice(0, 5);
      setRecentInvoices(invoices);
      
      // WHT Alerts List (Latest 5)
      setWhtAlerts(receiptsWithWht.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    
    setIsLoading(false);
  };
  
  const grossProfit = stats.revenue - stats.cogs;
  const margin = stats.revenue > 0 ? (grossProfit / stats.revenue) * 100 : 0;

  return (
    <div className="container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="page-title">
                <h1>สรุปผลการดำเนินงาน (Dashboard)</h1>
                <p>ภาพรวมรายได้ ค่าใช้จ่าย และกำไรขั้นต้น ประจำเดือน {currentMonthName}</p>
            </div>
            <Link href="/projects" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-folder-open"></i> ไปที่ระบบจัดการโปรเจกต์
                </button>
            </Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px', display: 'block' }}></i>
            กำลังโหลดข้อมูลภาพรวม...
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">รายได้รวม (Revenue)</span>
                        <div className="stat-icon bg-blue-light"><i className="fa-solid fa-arrow-trend-up"></i></div>
                    </div>
                    <div className="stat-value">฿{formatMoney(stats.revenue)}</div>
                    <div className="stat-change text-green">
                        <i className="fa-solid fa-calendar-day"></i> ยอดรวมประจำเดือนนี้
                    </div>
                </div>

                <div className="stat-card expense">
                    <div className="stat-header">
                        <span className="stat-title">ต้นทุนรวม (COGS)</span>
                        <div className="stat-icon bg-red-light"><i className="fa-solid fa-cart-arrow-down"></i></div>
                    </div>
                    <div className="stat-value">฿{formatMoney(stats.cogs)}</div>
                    <div className="stat-change text-red">
                         <i className="fa-solid fa-calendar-day"></i> ยอดรวมประจำเดือนนี้
                    </div>
                </div>

                <div className="stat-card profit">
                    <div className="stat-header">
                        <span className="stat-title">กำไรขั้นต้น (Gross Profit)</span>
                        <div className="stat-icon bg-green-light"><i className="fa-solid fa-sack-dollar"></i></div>
                    </div>
                    <div className="stat-value" style={{ color: grossProfit < 0 ? 'var(--danger)' : 'inherit' }}>
                      ฿{formatMoney(grossProfit)}
                    </div>
                    <div className="stat-change text-green" style={{fontWeight: 600, fontSize: '14px', color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                        อัตรากำไร (Margin): {margin.toFixed(2)}%
                    </div>
                </div>

                <div className="stat-card wht">
                    <div className="stat-header">
                        <span className="stat-title">ใบหัก ณ ที่จ่าย (รอดำเนินการ)</span>
                        <div className="stat-icon bg-yellow-light"><i className="fa-solid fa-file-invoice"></i></div>
                    </div>
                    <div className="stat-value">{stats.whtCount} รายการ</div>
                    <div className="stat-change" style={{color: 'var(--warning)'}}>
                        <i className="fa-solid fa-clock"></i> รอรับเอกสารตัวจริง มูลค่ารวม ฿{formatMoney(stats.whtTotal)}
                    </div>
                </div>
            </div>

            {/* Data Tables */}
            <div className="data-section">
                <div className="data-card">
                    <div className="data-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span className="data-title" style={{ fontSize: '18px', fontWeight: 'bold' }}>เอกสารขายล่าสุด (Recent Invoices)</span>
                        <Link href="/projects" className="view-all" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>ดูทั้งหมด</Link>
                    </div>
                    <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '12px' }}>เลขที่เอกสาร</th>
                                <th>อ้างอิงโปรเจกต์</th>
                                <th>ลูกค้า</th>
                                <th>วันที่</th>
                                <th style={{ textAlign: 'right' }}>ยอดรวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.length === 0 ? (
                              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลใบแจ้งหนี้</td></tr>
                            ) : recentInvoices.map((inv) => (
                              <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '16px 12px' }}>
                                    <Link href={`/projects/${inv.project_id}`} style={{color: 'var(--primary)', fontWeight: 500, textDecoration: 'none'}}>
                                      {inv.id}
                                    </Link>
                                  </td>
                                  <td style={{ fontSize: '13px' }}>{inv.project_id}</td>
                                  <td>{inv.projects?.contacts?.name || 'ไม่ระบุ'}</td>
                                  <td>{new Date(inv.created_at).toLocaleDateString('th-TH')}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{formatMoney(inv.total_amount)}</td>
                              </tr>
                            ))}
                        </tbody>
                    </table>
          </div>
                </div>

                {/* WHT Alerts */}
                <div className="data-card">
                    <div className="data-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span className="data-title" style={{ fontSize: '18px', fontWeight: 'bold' }}>ติดตามหัก ณ ที่จ่าย</span>
                        <Link href="/accounting" className="view-all" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>ดูทั้งหมด</Link>
                    </div>
                    {whtAlerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>ไม่มีเอกสารรอดำเนินการ</div>
                    ) : (
                      <ul className="wht-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {whtAlerts.map(alert => (
                            <li key={alert.id} className="wht-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px dashed var(--border)' }}>
                                <div className="wht-info">
                                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>{alert.customer}</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                                      อ้างอิง: <Link href={`/projects/${alert.project_id}`} style={{color:'var(--primary)'}}>{alert.id}</Link> • หักยอด: ฿{formatMoney(alert.wht_amount)}
                                    </p>
                                </div>
                                <div className="wht-action" style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>รอทวิ 50</span>
                                </div>
                            </li>
                          ))}
                      </ul>
                    )}
                </div>
            </div>
          </>
        )}
    </div>
  );
}
