"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function ExpenseAccounting() {
  const formatMoney = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [expenses, setExpenses] = useState([
    { id: 1, date: '2026-08-05', docNo: 'EXP-2608-001', supplier: 'ร้านขายวัสดุก่อสร้างเจริญ', desc: 'ค่าวัสดุก่อสร้าง', subTotal: 150000, vat: 10500, total: 160500, whtType: 'ไม่หัก', whtAmount: 0, netPay: 160500 },
    { id: 2, date: '2026-08-10', docNo: 'EXP-2608-002', supplier: 'บจก. คลีนนิ่ง เซอร์วิส', desc: 'ค่าบริการทำความสะอาด', subTotal: 10000, vat: 700, total: 10700, whtType: '3%', whtAmount: 300, netPay: 10400 },
    { id: 3, date: '2026-08-11', docNo: 'EXP-2608-003', supplier: 'นาย สมชาย รักดี', desc: 'ค่าจ้างเหมาแรงงาน', subTotal: 50000, vat: 0, total: 50000, whtType: '3%', whtAmount: 1500, netPay: 48500 },
  ]);

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/accounting" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i></Link>
            บันทึกรายจ่าย (ภาษีซื้อ & WHT)
          </h1>
          <p>บันทึกค่าใช้จ่าย, ภาษีซื้อ และหนังสือรับรองการหัก ณ ที่จ่าย</p>
        </div>
        <button className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)' }}>
          <i className="fa-solid fa-plus"></i> บันทึกรายจ่ายใหม่
        </button>
      </div>

      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>รายการจ่าย (สมุดรายวันจ่าย)</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="month" className="form-control" defaultValue="2026-08" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            <button className="btn-outline" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              <i className="fa-solid fa-download"></i> Export Excel
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>วันที่</th>
                <th>เลขที่อ้างอิง</th>
                <th>ผู้จำหน่าย/ผู้รับเงิน</th>
                <th>รายละเอียด</th>
                <th style={{ textAlign: 'right' }}>มูลค่า (ก่อน VAT)</th>
                <th style={{ textAlign: 'right' }}>ภาษีซื้อ (7%)</th>
                <th style={{ textAlign: 'right' }}>หัก ณ ที่จ่าย</th>
                <th style={{ textAlign: 'right' }}>ยอดจ่ายสุทธิ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontSize: '14px' }}>{item.date}</td>
                  <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)' }}>{item.docNo}</td>
                  <td style={{ fontSize: '14px' }}>{item.supplier}</td>
                  <td style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{item.desc}</td>
                  <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatMoney(item.subTotal)}</td>
                  <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--danger)', fontWeight: 500 }}>{formatMoney(item.vat)}</td>
                  <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--accent-purple)' }}>
                    {item.whtAmount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span>{formatMoney(item.whtAmount)}</span>
                        <span style={{ fontSize: '11px', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: '4px' }}>หัก {item.whtType}</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{formatMoney(item.netPay)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon" title="ดูรายละเอียด" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                      <i className="fa-solid fa-eye"></i>
                    </button>
                    {item.whtAmount > 0 && (
                      <button className="btn-icon" title="พิมพ์หนังสือรับรอง (50 ทวิ)" style={{ border: 'none', background: 'none', color: 'var(--accent-purple)', cursor: 'pointer', padding: '8px' }}>
                        <i className="fa-solid fa-file-contract"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>
                <td colSpan="4" style={{ padding: '16px 12px', textAlign: 'right' }}>รวมทั้งหมด (เดือนนี้):</td>
                <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatMoney(expenses.reduce((s, i) => s + i.subTotal, 0))}</td>
                <td style={{ textAlign: 'right', padding: '16px 0', color: 'var(--danger)' }}>{formatMoney(expenses.reduce((s, i) => s + i.vat, 0))}</td>
                <td style={{ textAlign: 'right', padding: '16px 0', color: 'var(--accent-purple)' }}>{formatMoney(expenses.reduce((s, i) => s + i.whtAmount, 0))}</td>
                <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatMoney(expenses.reduce((s, i) => s + i.netPay, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
