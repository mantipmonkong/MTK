"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'customer', 'supplier'
  const [newContact, setNewContact] = useState({ name: '', type: 'customer', tax_id: '', phone: '', address: '' });

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching contacts:', error);
    } else {
      setContacts(data || []);
    }
    setIsLoading(false);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name) return;
    
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        { 
          name: newContact.name, 
          type: newContact.type, 
          tax_id: newContact.tax_id, 
          phone: newContact.phone,
          address: newContact.address
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting contact:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } else {
      setContacts([data[0], ...contacts]);
      setShowForm(false);
      setNewContact({ name: '', type: 'customer', tax_id: '', phone: '', address: '' });
    }
  };

  const handleDelete = async (id) => {
    if(!confirm('ยืนยันการลบข้อมูลคูค้านี้?')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if(error) {
      alert('ไม่สามารถลบได้เนื่องจากมีการใช้งานในระบบ');
    } else {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const handleExportExcel = () => {
    const exportData = contacts.map(c => ({
      'ชื่อบริษัท / ร้านค้า': c.name,
      'ประเภท': c.type === 'customer' ? 'ลูกค้า' : 'ซัพพลายเออร์',
      'เลขประจำตัวผู้เสียภาษี': c.tax_id || '',
      'เบอร์โทรศัพท์': c.phone || '',
      'ที่อยู่': c.address || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
    
    // Generate buffer and download
    XLSX.writeFile(workbook, "MTK_Contacts.xlsx");
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newContacts = data.map(row => {
          let type = 'customer';
          if (row['ประเภท'] === 'ซัพพลายเออร์' || row['ประเภท'] === 'supplier') {
            type = 'supplier';
          }
          return {
            name: row['ชื่อบริษัท / ร้านค้า'] || row['Name'] || 'ไม่ระบุชื่อ',
            type: type,
            tax_id: row['เลขประจำตัวผู้เสียภาษี'] || row['Tax ID'] || '',
            phone: row['เบอร์โทรศัพท์'] || row['Phone'] || '',
            address: row['ที่อยู่'] || row['Address'] || ''
          };
        });

        if (newContacts.length > 0) {
          setIsLoading(true);
          const { error } = await supabase.from('contacts').insert(newContacts);
          if (error) {
            alert('เกิดข้อผิดพลาดในการ Import: ' + error.message);
          } else {
            alert(`นำเข้าข้อมูลสำเร็จ ${newContacts.length} รายการ!`);
            fetchContacts();
          }
          setIsLoading(false);
        }
      } catch (err) {
        alert('รูปแบบไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาด: ' + err.message);
      }
      
      // Clear input
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredContacts = contacts.filter(c => filterType === 'all' || c.type === filterType);

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="page-title">
          <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '4px' }}>ข้อมูลคู่ค้า (Customers & Suppliers)</h1>
          <p style={{ color: 'var(--text-muted)' }}>จัดการฐานข้อมูลลูกค้าและผู้จำหน่ายสินค้า (เชื่อมต่อฐานข้อมูลจริง)</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            style={{ display: 'none' }} 
          />
          <button onClick={() => fileInputRef.current.click()} className="btn-outline" style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', color: 'var(--text-main)', fontWeight: 500 }}>
            <i className="fa-solid fa-file-import"></i> Import Excel
          </button>
          
          <button onClick={handleExportExcel} className="btn-outline" style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', color: 'var(--text-main)', fontWeight: 500 }}>
            <i className="fa-solid fa-file-export"></i> Export Excel
          </button>

          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <i className="fa-solid fa-user-plus"></i> เพิ่มคู่ค้าใหม่
          </button>
        </div>
      </div>

      {showForm && (
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', marginBottom: '32px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '4px' }}>เพิ่มคู่ค้าใหม่</h3>
          <form onSubmit={handleAddContact} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>ชื่อบริษัท / ร้านค้า <span style={{color: 'red'}}>*</span></label>
              <input type="text" required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>ประเภท <span style={{color: 'red'}}>*</span></label>
              <select value={newContact.type} onChange={e => setNewContact({...newContact, type: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <option value="customer">ลูกค้า (Customer)</option>
                <option value="supplier">ซัพพลายเออร์ (Supplier)</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>เลขประจำตัวผู้เสียภาษี</label>
              <input type="text" value={newContact.tax_id} onChange={e => setNewContact({...newContact, tax_id: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>เบอร์โทรศัพท์</label>
              <input type="text" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>ที่อยู่</label>
              <input type="text" value={newContact.address} onChange={e => setNewContact({...newContact, address: e.target.value})} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px', gridColumn: '1 / -1' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>ยกเลิก</button>
              <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกข้อมูล</button>
            </div>
          </form>
        </div>
      )}

      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <button onClick={() => setFilterType('all')} style={{ background: 'none', border: 'none', fontSize: '15px', fontWeight: filterType === 'all' ? 600 : 400, color: filterType === 'all' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
            ทั้งหมด
            {filterType === 'all' && <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', background: 'var(--primary)' }}></div>}
          </button>
          <button onClick={() => setFilterType('customer')} style={{ background: 'none', border: 'none', fontSize: '15px', fontWeight: filterType === 'customer' ? 600 : 400, color: filterType === 'customer' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
            ลูกค้า
            {filterType === 'customer' && <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', background: 'var(--primary)' }}></div>}
          </button>
          <button onClick={() => setFilterType('supplier')} style={{ background: 'none', border: 'none', fontSize: '15px', fontWeight: filterType === 'supplier' ? 600 : 400, color: filterType === 'supplier' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
            ซัพพลายเออร์
            {filterType === 'supplier' && <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', background: 'var(--primary)' }}></div>}
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '14px' }}>
              <th style={{ padding: '12px' }}>ชื่อบริษัท / ร้านค้า</th>
              <th>ประเภท</th>
              <th>เลขประจำตัวผู้เสียภาษี</th>
              <th>เบอร์โทรศัพท์</th>
              <th style={{ textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  กำลังโหลดข้อมูลจากฐานข้อมูล...
                </td>
              </tr>
            ) : filteredContacts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5, display: 'block' }}></i>
                  ไม่มีข้อมูล หรือยังไม่ได้เชื่อมต่อ Database
                </td>
              </tr>
            ) : (
              filteredContacts.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 500, color: 'var(--text-main)' }}>{c.name}</td>
                  <td>
                    <span style={{ 
                      background: c.type === 'customer' ? '#e0e7ff' : '#dcfce3', 
                      color: c.type === 'customer' ? '#4338ca' : '#166534', 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontWeight: 'bold' 
                    }}>
                      {c.type === 'customer' ? 'ลูกค้า' : 'ซัพพลายเออร์'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.tax_id || '-'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.phone || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleDelete(c.id)} className="btn-icon" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px' }}><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
