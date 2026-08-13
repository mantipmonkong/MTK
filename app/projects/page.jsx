"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([
    { id: 'MTP-2608-01', internalAccount: 'บริษัท แมนทิป จำกัด', objective: 'ทำคู่เทียบ', customer: 'บจก. ก่อสร้างพัฒนา', status: 'รอเสนอราคา' },
    { id: 'PRJ-2608-02', internalAccount: 'กิจการค้าปลีก', objective: 'ขายสินค้า', customer: 'คุณ สมศักดิ์', status: 'กำลังดำเนินงาน' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ internalAccount: 'บริษัท แมนทิป จำกัด', objective: 'ขายสินค้า', customer: '' });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newProject.customer) return;
    
    // Generate ID prefix based on account (simplified logic for mockup)
    const prefix = newProject.internalAccount === 'บริษัท แมนทิป จำกัด' ? 'MTP' : 'PRJ';
    const newId = `${prefix}-2608-0${projects.length + 1}`;
    
    setProjects([{ ...newProject, id: newId, status: 'สร้างใหม่' }, ...projects]);
    setShowForm(false);
    setNewProject({ internalAccount: 'บริษัท แมนทิป จำกัด', objective: 'ขายสินค้า', customer: '' });
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
              <select value={newProject.internalAccount} onChange={e => setNewProject({...newProject, internalAccount: e.target.value})} className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <option value="บริษัท แมนทิป จำกัด">บริษัท แมนทิป จำกัด</option>
                <option value="กิจการค้าปลีก">กิจการค้าปลีก</option>
                <option value="โปรเจกต์พิเศษ B">โปรเจกต์พิเศษ B</option>
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
                <option value="บริษัท เอบีซี จำกัด">บริษัท เอบีซี จำกัด</option>
                <option value="บจก. ก่อสร้างพัฒนา">บจก. ก่อสร้างพัฒนา</option>
                <option value="คุณ สมศักดิ์">คุณ สมศักดิ์</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline" style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>ยกเลิก</button>
              <button type="submit" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>สร้างโปรเจกต์</button>
            </div>
          </form>
        </div>
      )}

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
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ลูกค้า (Customer)</div>
                    <div style={{ fontSize: '16px', fontWeight: 500 }}>{proj.customer}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ background: 'rgba(226,232,240,0.5)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-building"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>บัญชีรับผิดชอบ</div>
                    <div style={{ fontSize: '15px' }}>{proj.internalAccount}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>อัปเดตล่าสุด: วันนี้</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  จัดการโปรเจกต์ <i className="fa-solid fa-arrow-right"></i>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
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
