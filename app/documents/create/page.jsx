"use client";
import { useState, useRef } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function CreateDocument() {
  const [items, setItems] = useState([
    { id: 1, desc: 'ปูนซีเมนต์ผสม (เสือ)', type: 'material', qty: 50, price: 120 },
    { id: 2, desc: 'เหล็กเส้นกลม SR24 ขนาด 9มม.', type: 'material', qty: 100, price: 150 },
    { id: 3, desc: 'ค่าแรงผสมปูนและเทพื้นคอนกรีต', type: 'labor', qty: 1, price: 8500 }
  ]);
  const [applyWht, setApplyWht] = useState(true);
  const documentRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  // Totals
  const subTotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const laborTotal = items.reduce((sum, item) => sum + (item.type === 'labor' ? item.qty * item.price : 0), 0);
  const vat = subTotal * 0.07;
  const wht = applyWht ? (laborTotal * 0.03) : 0;
  const grandTotal = subTotal + vat - wht;

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'qty' || field === 'price' ? Number(value) : value;
    setItems(newItems);
  };

  const addRow = () => {
    setItems([...items, { id: Date.now(), desc: '', type: 'material', qty: 1, price: 0 }]);
  };

  const deleteRow = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportToPDF = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('quotation.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1>สร้างใบเสนอราคา (Quotation)</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/documents" className="btn-outline" style={{ textDecoration: 'none', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-arrow-left"></i> กลับ
          </Link>
          <button 
            onClick={exportToPDF} 
            disabled={isExporting}
            className="btn-primary" 
            style={{ padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', color: 'white', background: isExporting ? 'var(--text-muted)' : 'var(--primary)', cursor: isExporting ? 'not-allowed' : 'pointer' }}
          >
            <i className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i> 
            {isExporting ? 'กำลังสร้าง PDF...' : 'บันทึก & สร้าง PDF'}
          </button>
        </div>
      </div>

      <div ref={documentRef} className="doc-card" style={{ background: 'var(--surface)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)' }}>ลูกค้า (Customer)</label>
            <select className="form-control" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px' }}>
              <option value="">เลือกบริษัทคู่ค้า...</option>
              <option value="ABC">บริษัท เอบีซี จำกัด</option>
              <option value="XYZ">บจก. เอ็กซ์วายแซด คอนสตรัคชั่น</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)' }}>เลขที่เอกสาร (Document No.)</label>
            <input type="text" className="form-control" defaultValue="QT-2608-015" readOnly style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: '#f1f5f9', color: 'var(--primary)', fontWeight: 600, fontSize: '15px' }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)' }}>วันที่ (Date)</label>
            <input type="date" className="form-control" defaultValue="2026-08-13" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px' }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)' }}>อ้างอิงโปรเจกต์ (Project Ref.)</label>
            <input type="text" className="form-control" placeholder="เช่น สร้างโกดังสินค้า A" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px' }} />
          </div>
        </div>

        <div className="items-section">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <i className="fa-solid fa-list" style={{ color: 'var(--primary)' }}></i> รายการสินค้าและบริการ
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 8px', width: '5%' }}>#</th>
                <th style={{ width: '35%' }}>รายละเอียด</th>
                <th style={{ width: '15%' }}>ประเภท</th>
                <th style={{ width: '10%' }}>จำนวน</th>
                <th style={{ width: '15%' }}>ราคา/หน่วย</th>
                <th style={{ textAlign: 'right', width: '15%' }}>จำนวนเงิน</th>
                <th style={{ width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: item.type === 'labor' ? '#fef3c744' : 'transparent' }}>
                  <td style={{ padding: '12px 8px' }}>{index + 1}</td>
                  <td style={{ padding: '8px' }}>
                    <input type="text" value={item.desc} onChange={(e) => updateItem(index, 'desc', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select value={item.type} onChange={(e) => updateItem(index, 'type', e.target.value)} style={{ width: '100%', padding: '10px', border: `1px solid ${item.type === 'labor' ? 'var(--warning)' : 'var(--border)'}`, borderRadius: '6px' }}>
                      <option value="material">ค่าของ (Material)</option>
                      <option value="labor">ค่าแรง (Labor)</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="number" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500, padding: '8px' }}>{formatMoney(item.qty * item.price)}</td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <button onClick={() => deleteRow(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px' }}><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button onClick={addRow} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 500, transition: '0.2s', boxShadow: 'var(--shadow-sm)' }}>
            <i className="fa-solid fa-circle-plus"></i> เพิ่มรายการ
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '30px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-muted)' }}>หมายเหตุ (Remarks)</label>
            <textarea placeholder="ระบุเงื่อนไขการชำระเงิน หรือข้อมูลเพิ่มเติม..." style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', resize: 'none' }}></textarea>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" checked={applyWht} onChange={(e) => setApplyWht(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
              คำนวณภาษีหัก ณ ที่จ่าย 3% อัตโนมัติ (เฉพาะรายการค่าแรง)
            </label>
            {applyWht && laborTotal > 0 && (
              <div style={{ marginTop: '8px', color: 'var(--warning)', fontSize: '14px', marginLeft: '28px' }}>
                <i className="fa-solid fa-circle-info"></i> ระบบจะหัก 3% เฉพาะรายการที่เป็น "ค่าแรง" เท่านั้น ({formatMoney(laborTotal)})
              </div>
            )}
          </div>
          
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)' }}>
              <span>รวมเป็นเงิน (Sub Total)</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{formatMoney(subTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)' }}>
              <span>ภาษีมูลค่าเพิ่ม 7% (VAT)</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{formatMoney(vat)}</span>
            </div>
            {applyWht && laborTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--warning)' }}>
                <span>หัก ณ ที่จ่าย 3% (WHT)</span>
                <span>-{formatMoney(wht)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '2px dashed var(--border)', fontWeight: 'bold', fontSize: '20px', color: 'var(--primary)' }}>
              <span>ยอดชำระสุทธิ</span>
              <span>฿{formatMoney(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
