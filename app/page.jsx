export default function Dashboard() {
  return (
    <div className="container">
        <div className="page-header">
            <div className="page-title">
                <h1>สรุปผลการดำเนินงาน (Dashboard)</h1>
                <p>ภาพรวมรายได้ ค่าใช้จ่าย และกำไรขั้นต้น ประจำเดือน สิงหาคม 2026</p>
            </div>
            <button className="btn-primary">
                <i className="fa-solid fa-plus"></i> สร้างเอกสารใหม่
            </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-header">
                    <span className="stat-title">รายได้รวม (Revenue)</span>
                    <div className="stat-icon bg-blue-light"><i className="fa-solid fa-arrow-trend-up"></i></div>
                </div>
                <div className="stat-value">฿850,000.00</div>
                <div className="stat-change text-green">
                    <i className="fa-solid fa-arrow-up"></i> 12.5% เทียบกับเดือนที่แล้ว
                </div>
            </div>

            <div className="stat-card expense">
                <div className="stat-header">
                    <span className="stat-title">ต้นทุนรวม (COGS)</span>
                    <div className="stat-icon bg-red-light"><i className="fa-solid fa-cart-arrow-down"></i></div>
                </div>
                <div className="stat-value">฿620,000.00</div>
                <div className="stat-change text-red">
                    <i className="fa-solid fa-arrow-up"></i> 5.2% เทียบกับเดือนที่แล้ว
                </div>
            </div>

            <div className="stat-card profit">
                <div className="stat-header">
                    <span className="stat-title">กำไรขั้นต้น (Gross Profit)</span>
                    <div className="stat-icon bg-green-light"><i className="fa-solid fa-sack-dollar"></i></div>
                </div>
                <div className="stat-value">฿230,000.00</div>
                <div className="stat-change text-green" style={{fontWeight: 600, fontSize: '14px'}}>
                    อัตรากำไร (Margin): 27.05% <span style={{color:'var(--text-muted)', fontSize:'12px', fontWeight:'normal'}}>(เป้าหมาย 25%)</span>
                </div>
            </div>

            <div className="stat-card wht">
                <div className="stat-header">
                    <span className="stat-title">ใบหัก ณ ที่จ่าย (รอดำเนินการ)</span>
                    <div className="stat-icon bg-yellow-light"><i className="fa-solid fa-file-invoice"></i></div>
                </div>
                <div className="stat-value">8 รายการ</div>
                <div className="stat-change" style={{color: 'var(--warning)'}}>
                    <i className="fa-solid fa-clock"></i> รอรับเอกสารตัวจริง มูลค่ารวม ฿15,400
                </div>
            </div>
        </div>

        {/* Data Tables */}
        <div className="data-section">
            <div className="data-card">
                <div className="data-header">
                    <span className="data-title">เอกสารขายล่าสุด (Recent Invoices)</span>
                    <a href="#" className="view-all">ดูทั้งหมด</a>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>เลขที่เอกสาร</th>
                            <th>ลูกค้า</th>
                            <th>วันที่</th>
                            <th>ยอดรวม</th>
                            <th>สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><a href="#" style={{color: 'var(--primary)', fontWeight: 500}}>INV-2608-005</a></td>
                            <td>บริษัท เอบีซี จำกัด</td>
                            <td>12 ส.ค. 26</td>
                            <td>฿45,000.00</td>
                            <td><span className="status paid">ชำระแล้ว</span></td>
                        </tr>
                        <tr>
                            <td><a href="#" style={{color: 'var(--primary)', fontWeight: 500}}>INV-2608-004</a></td>
                            <td>บจก. เอ็กซ์วายแซด คอนสตรัคชั่น</td>
                            <td>10 ส.ค. 26</td>
                            <td>฿120,500.00</td>
                            <td><span className="status pending">รอชำระเงิน</span></td>
                        </tr>
                        <tr>
                            <td><a href="#" style={{color: 'var(--primary)', fontWeight: 500}}>INV-2608-003</a></td>
                            <td>หจก. พัฒนาดีเยี่ยม</td>
                            <td>05 ส.ค. 26</td>
                            <td>฿18,200.00</td>
                            <td><span className="status paid">ชำระแล้ว</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* WHT Alerts */}
            <div className="data-card">
                <div className="data-header">
                    <span className="data-title">ติดตามหัก ณ ที่จ่าย</span>
                    <a href="#" className="view-all">ดูทั้งหมด</a>
                </div>
                <ul className="wht-list">
                    <li className="wht-item">
                        <div className="wht-info">
                            <h4>บจก. เอ็กซ์วายแซด</h4>
                            <p>อ้างอิง: INV-2607-030 • หัก 3% (ค่าบริการ)</p>
                        </div>
                        <div className="wht-action">
                            <button className="btn-icon" title="อัปโหลดไฟล์"><i className="fa-solid fa-upload"></i></button>
                            <button className="btn-icon" style={{color: 'var(--secondary)'}} title="ทำเครื่องหมายว่าได้รับแล้ว"><i className="fa-solid fa-check"></i></button>
                        </div>
                    </li>
                    <li className="wht-item">
                        <div className="wht-info">
                            <h4>บริษัท เอบีซี จำกัด</h4>
                            <p>อ้างอิง: INV-2607-015 • หัก 1% (ค่าขนส่ง)</p>
                        </div>
                        <div className="wht-action">
                            <button className="btn-icon" title="อัปโหลดไฟล์"><i className="fa-solid fa-upload"></i></button>
                            <button className="btn-icon" style={{color: 'var(--secondary)'}} title="ทำเครื่องหมายว่าได้รับแล้ว"><i className="fa-solid fa-check"></i></button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
  );
}
