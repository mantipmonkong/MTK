"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function DocumentsList() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Derived state for filter options
  const [customers, setCustomers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // Fetch Quotations
      const { data: qData, error: qError } = await supabase
        .from('quotations')
        .select('id, project_id, total_amount, status, created_at, projects(internal_accounts(name), contacts(name))');
      
      // Fetch Billings
      const { data: bData, error: bError } = await supabase
        .from('billings')
        .select('id, project_id, type, total_amount, status, created_at, projects(internal_accounts(name), contacts(name))');

      if (qError) throw qError;
      if (bError) throw bError;

      // Normalize Quotations
      const normalizedQuotations = (qData || []).map(q => ({
        id: q.id,
        type: 'quotation',
        typeLabel: 'ใบเสนอราคา',
        project_id: q.project_id,
        customer: q.projects?.contacts?.name || 'ไม่ระบุลูกค้า',
        account: q.projects?.internal_accounts?.name || 'ไม่ระบุ',
        total: q.total_amount,
        status: q.status || 'รอพิจารณา',
        created_at: new Date(q.created_at)
      }));

      // Normalize Billings
      const normalizedBillings = (bData || []).map(b => ({
        id: b.id,
        type: b.type,
        typeLabel: b.type === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จรับเงิน',
        project_id: b.project_id,
        customer: b.projects?.contacts?.name || 'ไม่ระบุลูกค้า',
        account: b.projects?.internal_accounts?.name || 'ไม่ระบุ',
        total: b.total_amount,
        status: b.status || (b.type === 'invoice' ? 'รอชำระเงิน' : 'ชำระแล้ว'),
        created_at: new Date(b.created_at)
      }));

      const allDocs = [...normalizedQuotations, ...normalizedBillings].sort((a, b) => b.created_at - a.created_at);
      setDocuments(allDocs);
      
      // Extract unique customers and statuses for filters
      const uniqueCustomers = [...new Set(allDocs.map(d => d.customer))];
      const uniqueStatuses = [...new Set(allDocs.map(d => d.status))];
      const uniqueAccounts = [...new Set(allDocs.map(d => d.account))];
      setCustomers(uniqueCustomers);
      setStatuses(uniqueStatuses);
      setAccounts(uniqueAccounts);
      
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
    setIsLoading(false);
  };

  // Apply filters
  const filteredDocs = documents.filter(doc => {
    let match = true;
    if (filterType && doc.type !== filterType) match = false;
    if (filterCustomer && doc.customer !== filterCustomer) match = false;
    if (filterStatus && doc.status !== filterStatus) match = false;
    if (filterAccount && doc.account !== filterAccount) match = false;
    
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      if (doc.created_at < start) match = false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (doc.created_at > end) match = false;
    }
    
    return match;
  });

  const getStatusStyle = (status, type) => {
    if (status === 'อนุมัติแล้ว' || status === 'ชำระแล้ว') return 'status paid';
    if (status === 'รอพิจารณา' || status === 'รอชำระเงิน') return 'status pending';
    if (status === 'ยกเลิก' || status === 'ปฏิเสธ') return 'status rejected'; // Assuming rejected class exists or fallback
    return 'status pending';
  };
  
  const getTypeColor = (type) => {
    if (type === 'quotation') return { bg: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' };
    if (type === 'invoice') return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
    if (type === 'receipt') return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    return { bg: '#f1f5f9', color: '#64748b' };
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1>รวมเอกสารทั้งหมด (All Documents)</h1>
          <p>ใบเสนอราคา, ใบแจ้งหนี้ และใบเสร็จรับเงิน</p>
        </div>
        <Link href="/projects" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-plus"></i> สร้างเอกสารจากโปรเจกต์
        </Link>
      </div>

      {/* Toolbar / Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', margin: '24px 0', background: 'var(--surface)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fa-solid fa-filter" style={{ color: 'var(--text-muted)' }}></i>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '160px' }}>
            <option value="">ทุกประเภทเอกสาร</option>
            <option value="quotation">ใบเสนอราคา</option>
            <option value="invoice">ใบแจ้งหนี้</option>
            <option value="receipt">ใบเสร็จรับเงิน</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="form-control" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '180px' }}>
            <option value="">ทุกลูกค้า (All Customers)</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="form-control" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '180px' }}>
            <option value="">ทุกความรับผิดชอบ (All Accounts)</option>
            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '160px' }}>
            <option value="">ทุกสถานะ (All Statuses)</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
          <i className="fa-regular fa-calendar" style={{ color: 'var(--text-muted)' }}></i>
          <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="form-control" style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }} title="วันที่เริ่มต้น" />
          <span style={{ color: 'var(--text-muted)' }}>-</span>
          <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="form-control" style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }} title="วันที่สิ้นสุด" />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px', display: 'block' }}></i>
          กำลังโหลดเอกสาร...
        </div>
      ) : (
        <div className="data-card">
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '16px' }}>ประเภทเอกสาร</th>
                <th>เลขที่เอกสาร</th>
                <th>ลูกค้า</th>
                <th>วันที่และเวลา</th>
                <th style={{ textAlign: 'right' }}>ยอดรวม</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>ไม่พบเอกสารตามเงื่อนไขที่เลือก</td></tr>
              ) : filteredDocs.map((doc, idx) => (
                <tr key={`${doc.id}-${idx}`} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      background: getTypeColor(doc.type).bg,
                      color: getTypeColor(doc.type).color
                    }}>
                      {doc.typeLabel}
                    </span>
                  </td>
                  <td>
                    <Link href={`/projects/${doc.project_id}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                      {doc.id}
                    </Link>
                  </td>
                  <td>{doc.customer}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{doc.created_at.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <i className="fa-regular fa-clock"></i> {doc.created_at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{doc.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={getStatusStyle(doc.status, doc.type)}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => window.open(`/${doc.type === 'quotation' ? 'quotation' : 'invoice'}?id=${doc.id}`, '_blank')} 
                      style={{ background: 'none', color: '#6366f1', border: 'none', padding: '6px', cursor: 'pointer', fontSize: '16px' }} 
                      title="พิมพ์ / บันทึก PDF"
                    >
                      <i className="fa-solid fa-print"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background-color: rgba(99, 102, 241, 0.05);
        }
        .status.rejected {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}
