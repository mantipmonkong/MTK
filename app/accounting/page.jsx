"use client";
import Link from 'next/link';

export default function AccountingDashboard() {
  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Mock Tax Data (Current Month)
  const currentMonth = "สิงหาคม 2569";
  
  const vatData = {
    outputVat: 105000, // ภาษีขาย
    inputVat: 42000,   // ภาษีซื้อ
    netVatPayable: 63000 // ภาษีที่ต้องชำระ
  };

  const whtData = {
    pnd3: 1500, // ภ.ง.ด.3
    pnd53: 4500, // ภ.ง.ด.53
    totalWht: 6000
  };

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white' }}>
        <div className="page-title">
          <h1 style={{ color: 'white', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>บัญชีบริษัท (ส่งสรรพากร)</h1>
          <p style={{ color: '#cbd5e1', fontSize: '16px', marginTop: '8px', fontWeight: 500 }}>ภาพรวมภาษีมูลค่าเพิ่ม (VAT) และภาษีหัก ณ ที่จ่าย ประจำเดือน {currentMonth}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* Navigation Cards */}
        <Link href="/accounting/income" className="stat-card" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden', border: 'none', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)' }}>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.2, fontSize: '120px' }}>
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 600, zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>บันทึกรายรับ (ภาษีขาย)</h3>
          <p style={{ opacity: 0.95, fontSize: '15px', zIndex: 1, lineHeight: '1.5', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>จัดการใบแจ้งหนี้, ใบเสร็จรับเงิน, ออกใบกำกับภาษี และบันทึกสมุดรายวันรับ</p>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, paddingTop: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, background: 'rgba(255,255,255,0.25)', padding: '6px 16px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>เข้าสู่ระบบ <i className="fa-solid fa-arrow-right"></i></span>
          </div>
        </Link>

        <Link href="/accounting/expense" className="stat-card" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden', border: 'none', boxShadow: '0 10px 25px rgba(244, 63, 94, 0.3)' }}>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.2, fontSize: '120px' }}>
            <i className="fa-solid fa-file-invoice"></i>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 600, zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>บันทึกรายจ่าย (ภาษีซื้อ & WHT)</h3>
          <p style={{ opacity: 0.95, fontSize: '15px', zIndex: 1, lineHeight: '1.5', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>บันทึกบิลซื้อ, ค่าใช้จ่ายบริษัท, ภาษีซื้อ และสร้างหนังสือรับรองการหัก ณ ที่จ่าย</p>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, paddingTop: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, background: 'rgba(255,255,255,0.25)', padding: '6px 16px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>เข้าสู่ระบบ <i className="fa-solid fa-arrow-right"></i></span>
          </div>
        </Link>
      </div>

      <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
        <i className="fa-solid fa-calculator" style={{ color: 'var(--primary)' }}></i> สรุปภาระภาษีเดือนนี้
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* VAT Summary */}
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-percent"></i>
            </div>
            ภาษีมูลค่าเพิ่ม (ภ.พ.30)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>ภาษีขาย (ที่เก็บจากลูกค้า)</span>
              <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>฿{formatMoney(vatData.outputVat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>ภาษีซื้อ (ที่จ่ายให้ซัพพลายเออร์)</span>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-฿{formatMoney(vatData.inputVat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', fontSize: '18px', fontWeight: 'bold' }}>
              <span style={{ color: 'var(--primary)' }}>ภาษีที่ต้องชำระสุทธิ</span>
              <span style={{ color: 'var(--primary)' }}>฿{formatMoney(vatData.netVatPayable)}</span>
            </div>
          </div>
        </div>

        {/* WHT Summary */}
        <div className="doc-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            ภาษีหัก ณ ที่จ่าย นำส่ง
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>ภ.ง.ด.3 (หักบุคคลธรรมดา)</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>฿{formatMoney(whtData.pnd3)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>ภ.ง.ด.53 (หักนิติบุคคล)</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>฿{formatMoney(whtData.pnd53)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', fontSize: '18px', fontWeight: 'bold' }}>
              <span style={{ color: 'var(--accent-purple)' }}>รวมภาษีหัก ณ ที่จ่าย นำส่ง</span>
              <span style={{ color: 'var(--accent-purple)' }}>฿{formatMoney(whtData.totalWht)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
