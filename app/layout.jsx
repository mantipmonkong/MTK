import './globals.css';

export const metadata = {
  title: 'Mantip ERP - Accounting & Business Management',
  description: 'Business System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        {/* Sidebar */}
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">M</div>
                <div>
                    <h2 style={{fontSize: '18px', fontWeight: 600}}>Mantip ERP</h2>
                    <span style={{fontSize: '12px', color: '#94a3b8'}}>Business System</span>
                </div>
            </div>
            <div className="sidebar-menu">
                <a href="/" className="menu-item active">
                    <i className="fa-solid fa-chart-pie"></i> ภาพรวม
                </a>
                <a href="/documents" className="menu-item">
                    <i className="fa-solid fa-file-invoice-dollar"></i> สร้างใบเสนอราคา
                </a>
                <a href="/accounting" className="menu-item">
                    <i className="fa-solid fa-building-columns"></i> บัญชีบริษัท(ส่งสรรพกร)
                </a>
                <a href="/internal" className="menu-item">
                    <i className="fa-solid fa-calculator"></i> บัญชีภายใน(เฉพาะบริษัท)
                </a>
                <a href="/settings" className="menu-item">
                    <i className="fa-solid fa-gear"></i> ตั้งค่า
                </a>
                <a href="/simulation" className="menu-item">
                    <i className="fa-solid fa-layer-group"></i> รวมอื่นๆ
                </a>
            </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
            {/* Topbar */}
            <header className="topbar">
                <div className="topbar-search">
                    <input type="text" placeholder="ค้นหาเอกสาร, คู่ค้า..." />
                </div>
                <div className="topbar-actions">
                    <button className="icon-btn">
                        <i className="fa-regular fa-bell"></i>
                        <span className="badge">3</span>
                    </button>
                    <div className="user-profile">
                        <div className="user-avatar">A</div>
                        <div>
                            <div style={{fontSize: '14px', fontWeight: 500}}>Admin User</div>
                            <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Administrator</div>
                        </div>
                        <i className="fa-solid fa-chevron-down" style={{fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px'}}></i>
                    </div>
                </div>
            </header>
            
            {/* Page Content */}
            {children}
        </main>
      </body>
    </html>
  );
}
