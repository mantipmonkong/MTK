"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    // Close menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Sidebar Overlay */}
            <div 
                className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header" style={{ justifyContent: 'center', padding: '24px 16px' }}>
                    <img src="/logo.png" alt="MANTIPMONKONG" style={{ width: '100%', maxWidth: '150px', height: 'auto', display: 'block' }} />
                </div>
                <div className="sidebar-menu">
                    <Link href="/" className={`menu-item ${pathname === '/' ? 'active' : ''}`}>
                        <i className="fa-solid fa-chart-pie"></i> ภาพรวม
                    </Link>
                    <Link href="/projects" className={`menu-item ${pathname?.startsWith('/projects') ? 'active' : ''}`}>
                        <i className="fa-solid fa-diagram-project"></i> จัดการโปรเจกต์
                    </Link>
                    <Link href="/documents" className={`menu-item ${pathname?.startsWith('/documents') ? 'active' : ''}`}>
                        <i className="fa-solid fa-file-lines"></i> รวมเอกสาร
                    </Link>
                    <Link href="/contacts" className={`menu-item ${pathname?.startsWith('/contacts') ? 'active' : ''}`}>
                        <i className="fa-solid fa-users"></i> ข้อมูลลูกค้า/ซัพพลายเออร์
                    </Link>
                    <Link href="/accounting" className={`menu-item ${pathname?.startsWith('/accounting') ? 'active' : ''}`}>
                        <i className="fa-solid fa-building-columns"></i> บัญชีบริษัท(ส่งสรรพากร)
                    </Link>
                    <Link href="/internal" className={`menu-item ${pathname?.startsWith('/internal') ? 'active' : ''}`}>
                        <i className="fa-solid fa-calculator"></i> บัญชีภายใน(เฉพาะบริษัท)
                    </Link>
                    <Link href="/settings" className={`menu-item ${pathname?.startsWith('/settings') ? 'active' : ''}`}>
                        <i className="fa-solid fa-gear"></i> ตั้งค่า
                    </Link>
                    <Link href="/simulation" className={`menu-item ${pathname?.startsWith('/simulation') ? 'active' : ''}`}>
                        <i className="fa-solid fa-layer-group"></i> รวมอื่นๆ
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Topbar */}
                <header className="topbar">
                    <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)}>
                        <i className="fa-solid fa-bars"></i>
                    </button>
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
        </>
    );
}
