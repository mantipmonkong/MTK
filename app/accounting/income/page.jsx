"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function IncomeAccounting() {
  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [incomes, setIncomes] = useState([
    { id: 1, date: '2026-08-12', docNo: 'INV-2608-001', customer: 'บริษัท เอบีซี จำกัด', subTotal: 500000, vat: 35000, total: 535000, wht: 15000, net: 520000 },
    { id: 2, date: '2026-08-14', docNo: 'INV-2608-002', customer: 'บจก. เอ็กซ์วายแซด คอนสตรัคชั่น', subTotal: 1000000, vat: 70000, total: 1070000, wht: 0, net: 1070000 },
  ]);

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/accounting" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i></Link>
            บันทึกรายรับ (ภาษีขาย)
          </h1>
          <p>จัดการใบแจ้งหนี้, ใบเสร็จรับเงิน และภาษีขายเพื่อส่งสรรพากร</p>
        </div>
        <button className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-plus"></i> บันทึกรายรับใหม่
        </button>
      </div>

      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>รายการรายรับ (สมุดรายวันรับ)</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="month" className="form-control" defaultValue="2026-08" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            <button className="btn-outline" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              <i className="fa-solid fa-download"></i> Export Excel
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
              <th style={{ padding: '12px' }}>วันที่</th>
              <th>เลขที่เอกสาร</th>
              <th>ลูกค้า</th>
              <th style={{ textAlign: 'right' }}>มูลค่าสินค้า/บริการ</th>
              <th style={{ textAlign: 'right' }}>ภาษีขาย (7%)</th>
              <th style={{ textAlign: 'right' }}>หัก ณ ที่จ่าย</th>
              <th style={{ textAlign: 'right' }}>รับสุทธิ</th>
              <th style={{ textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {incomes.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 12px', fontSize: '14px' }}>{item.date}</td>
                <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)' }}>{item.docNo}</td>
                <td style={{ fontSize: '14px' }}>{item.customer}</td>
                <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatMoney(item.subTotal)}</td>
                <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--secondary)', fontWeight: 500 }}>{formatMoney(item.vat)}</td>
                <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--warning)' }}>{formatMoney(item.wht)}</td>
                <td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{formatMoney(item.net)}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-icon" title="ดูรายละเอียด" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                    <i className="fa-solid fa-eye"></i>
                  </button>
                  <button className="btn-icon" title="พิมพ์ใบกำกับภาษี" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                    <i className="fa-solid fa-print"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>
              <td colSpan="3" style={{ padding: '16px 12px', textAlign: 'right' }}>รวมทั้งหมด (เดือนนี้):</td>
              <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatMoney(incomes.reduce((s, i) => s + i.subTotal, 0))}</td>
              <td style={{ textAlign: 'right', padding: '16px 0', color: 'var(--secondary)' }}>{formatMoney(incomes.reduce((s, i) => s + i.vat, 0))}</td>
              <td style={{ textAlign: 'right', padding: '16px 0', color: 'var(--warning)' }}>{formatMoney(incomes.reduce((s, i) => s + i.wht, 0))}</td>
              <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatMoney(incomes.reduce((s, i) => s + i.net, 0))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
