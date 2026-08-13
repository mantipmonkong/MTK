import Link from 'next/link';

export default function DocumentsList() {
  const documents = [
    { id: 'QT-2608-015', customer: 'บริษัท เอบีซี จำกัด', date: '2026-08-13', total: 24500, status: 'รออนุมัติ' },
    { id: 'QT-2608-014', customer: 'บจก. เอ็กซ์วายแซด คอนสตรัคชั่น', date: '2026-08-10', total: 120500, status: 'อนุมัติแล้ว' },
    { id: 'QT-2608-013', customer: 'หจก. พัฒนาดีเยี่ยม', date: '2026-08-05', total: 18200, status: 'อนุมัติแล้ว' },
  ];

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1>ใบเสนอราคา (Quotations)</h1>
          <p>รายการใบเสนอราคาทั้งหมดของคุณ</p>
        </div>
        <Link href="/documents/create" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-plus"></i> สร้างใบเสนอราคาใหม่
        </Link>
      </div>

      <div className="data-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '16px' }}>เลขที่เอกสาร</th>
              <th>ลูกค้า</th>
              <th>วันที่</th>
              <th>ยอดรวม</th>
              <th>สถานะ</th>
              <th style={{ textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                <td style={{ padding: '16px' }}>
                  <Link href={`/documents/${doc.id}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                    {doc.id}
                  </Link>
                </td>
                <td>{doc.customer}</td>
                <td>{doc.date}</td>
                <td>฿{doc.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`status ${doc.status === 'อนุมัติแล้ว' ? 'paid' : 'pending'}`}>
                    {doc.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-icon" title="แก้ไข" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button className="btn-icon" title="พิมพ์" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                    <i className="fa-solid fa-print"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-row-hover:hover {
          background-color: rgba(99, 102, 241, 0.05);
        }
      `}</style>
    </div>
  );
}
