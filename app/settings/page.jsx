export default function SettingsPage() {
  return (
    <div className="container">
      <div className="page-header">
        <div className="page-title">
          <h1>การตั้งค่า (Settings)</h1>
          <p>จัดการข้อมูลบริษัทและสิทธิ์ผู้ใช้งาน</p>
        </div>
      </div>
      <div className="data-card" style={{padding: '40px', textAlign: 'center'}}>
        <h2>กำลังอยู่ระหว่างการย้ายระบบเข้าสู่ Next.js</h2>
        <p style={{color: 'var(--text-muted)', marginTop: '10px'}}>เนื้อหาในหน้านี้จะพร้อมใช้งานในเร็วๆ นี้</p>
      </div>
    </div>
  );
}
