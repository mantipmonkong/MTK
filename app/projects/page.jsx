"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ internalAccount: '', objective: 'ขายสินค้า', customer: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch internal accounts
      const { data: accountsData } = await supabase.from('internal_accounts').select('*');
      setAccounts(accountsData || []);
      if (accountsData && accountsData.length > 0) {
        setNewProject(prev => ({ ...prev, internalAccount: accountsData[0].id }));
      }

      // Fetch customers
      const { data: customersData } = await supabase.from('contacts').select('*').eq('type', 'customer');
      setCustomers(customersData || []);

      // Fetch projects with joins
      const { data: projectsData, error: projError } = await supabase
        .from('projects')
        .select(`
          *,
          internal_accounts(name),
          contacts(name)
        `)
        .order('created_at', { ascending: false });

      if (projError) throw projError;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  };

  const generateProjectId = (accountId) => {
    const prefix = accountId.substring(0, 3).toUpperCase();
    const date = new Date();
    const yy = date.getFullYear().toString().substring(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    // Basic counter based on current projects length for mockup (in real app, use sequence or count from db)
    const count = projects.length + 1;
    const countStr = count.toString().padStart(2, '0');
    return `${prefix}-${yy}${mm}-${countStr}`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.customer || !newProject.internalAccount) return;
    
    const newId = generateProjectId(newProject.internalAccount);
    
    const { data, error } = await supabase
      .from('projects')
      .insert([
        { 
          id: newId,
          internal_account_id: newProject.internalAccount, 
          objective: newProject.objective, 
          customer_id: newProject.customer,
          status: 'รอพิจารณา'
        }
      ])
      .select(`
        *,
        internal_accounts(name),
        contacts(name)
      `);

    if (error) {
      console.error('Error inserting project:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    } else {
      setProjects([data[0], ...projects]);
      setShowForm(false);
      setNewProject({ internalAccount: accounts.length > 0 ? accounts[0].id : '', objective: 'ขายสินค้า', customer: '' });
    }
  };

  const handleDeleteProject = async (e, id) => {
    e.preventDefault(); // Prevent navigating to the project page
    e.stopPropagation(); // Stop click from reaching the Link
    
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ ${id}?\nการกระทำนี้จะลบข้อมูลที่เกี่ยวข้องทั้งหมด (ใบเสนอราคา, บิล, ค่าใช้จ่าย)`)) return;
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      alert('เกิดข้อผิดพลาดในการลบโปรเจกต์: ' + error.message);
    } else {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1 style={{ color: 'white', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>จัดการโปรเจกต์ (Projects)</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', marginTop: '8px' }}>บริหารจัดการงาน, ใบเสนอราคา และคุมต้นทุนแบบครบวงจร</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', color: 'var(--primary)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <i className="fa-solid fa-plus"></i> สร้างโปรเจกต์ใหม่
        </button>
      </div>

      {showForm && (
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', marginBottom: '32px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '8px' }}>ข้อมูลโปรเจกต์ใหม่</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>1. บัญชีภายใน (Track งานของใคร)</label>
              <select value={newProject.internalAccount} onChange={e => setNewProject({...newProject, internalAccount: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} required>
                <option value="">-- เลือกบัญชีภายใน --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                ))}
              </select>
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>* รหัสโปรเจกต์จะถูกสร้างแยกตามบัญชีที่เลือก</small>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>2. จุดประสงค์โปรเจกต์</label>
              <select value={newProject.objective} onChange={e => setNewProject({...newProject, objective: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <option value="ขายสินค้า">ขายสินค้า (Sales)</option>
                <option value="ทำคู่เทียบ">ทำคู่เทียบ (Bidding)</option>
                <option value="รับเหมาก่อสร้าง">รับเหมาก่อสร้าง (Construction)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>3. ลูกค้า (Customer)</label>
              <select value={newProject.customer} onChange={e => setNewProject({...newProject, customer: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} required>
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(cus => (
                  <option key={cus.id} value={cus.id}>{cus.name}</option>
                ))}
              </select>
              {customers.length === 0 && <small style={{ color: 'var(--warning)', display: 'block', marginTop: '6px' }}>ยังไม่มีข้อมูลลูกค้า กรุณาเพิ่มข้อมูลคู่ค้าก่อน</small>}
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline" style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>ยกเลิก</button>
              <button type="submit" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>สร้างโปรเจกต์</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
          กำลังโหลดข้อมูลโปรเจกต์...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }}></i>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>ยังไม่มีโปรเจกต์</h3>
          <p style={{ color: 'var(--text-muted)' }}>กดปุ่ม "สร้างโปรเจกต์ใหม่" ด้านบนเพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
          {projects.map(proj => (
            <Link href={`/projects/${proj.id}`} key={proj.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="doc-card" style={{ background: 'var(--surface)', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', cursor: 'pointer', height: '100%' }}>
                
                <div style={{ padding: '24px', borderBottom: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                      {proj.id.split('-')[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)' }}>{proj.id}</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>{proj.objective}</p>
                    </div>
                  </div>
                  <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: proj.status === 'กำลังดำเนินงาน' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: proj.status === 'กำลังดำเนินงาน' ? 'var(--secondary)' : 'var(--warning)' }}>
                    {proj.status}
                  </span>
                  <button onClick={(e) => handleDeleteProject(e, proj.id)} className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px', marginLeft: '8px' }} title="ลบโปรเจกต์">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-user"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ลูกค้า (Customer)</div>
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>{proj.contacts?.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: 'rgba(226,232,240,0.5)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-building"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>บัญชีรับผิดชอบ</div>
                      <div style={{ fontSize: '15px' }}>{proj.internal_accounts?.name || proj.internal_account_id}</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>วันที่: {new Date(proj.created_at).toLocaleDateString('th-TH')}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    จัดการโปรเจกต์ <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <style>{`
        .doc-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md) !important;
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}
