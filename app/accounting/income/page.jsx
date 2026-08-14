"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function IncomeAccounting() {
  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [incomes, setIncomes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    setIsLoading(true);
    
    const { data: bData } = await supabase
      .from('billings')
      .select('*, projects(id, contacts(name))')
      .eq('type', 'receipt')
      .order('created_at', { ascending: false });

    const { data: qData } = await supabase
      .from('quotations')
      .select('*')
      .eq('status', 'อนุมัติแล้ว');

    if (bData && qData) {
      const processedIncomes = bData.map(bill => {
        const quote = qData.find(q => q.id === bill.quotation_id);
        if (!quote) return null;
        
        const isFullPayment = Number(bill.total_amount) >= Number(quote.total_amount);
        const subTotal = isFullPayment ? quote.sub_total : (bill.total_amount * 100 / 107);
        const vat = isFullPayment ? quote.vat_amount : (bill.total_amount * 7 / 107);
        const wht = isFullPayment ? quote.wht_amount : 0;
        
        return {
          id: bill.id,
          date: new Date(bill.created_at).toLocaleDateString('th-TH'),
          docNo: bill.id,
          customer: bill.projects?.contacts?.name || 'ลูกค้าทั่วไป',
          subTotal: quote.vat_rate > 0 ? Number(subTotal) : Number(bill.total_amount),
          vat: quote.vat_rate > 0 ? Number(vat) : 0,
          wht: Number(wht),
          net: Number(bill.total_amount)
        };
      }).filter(Boolean);
      
      setIncomes(processedIncomes);
    }
    setIsLoading(false);
  };

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
            {isLoading ? <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>กำลังโหลดข้อมูล...</td></tr> : null}
            {!isLoading && incomes.length === 0 ? <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>ไม่มีรายการรายรับ</td></tr> : null}
            {!isLoading && incomes.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 12px', fontSize: '14px' }}>{item.date}</td>
                <td style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)' }}>{item.docNo}</td>
                <td style={{ fontSize: '14px' }}>{item.customer}</td>
                <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatMoney(item.subTotal)}</td>
                <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--secondary)', fontWeight: 500 }}>{formatMoney(item.vat)}</td>
                <td style={{ textAlign: 'right', fontSize: '14px', color: 'var(--warning)' }}>{formatMoney(item.wht)}</td>
                <td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{formatMoney(item.net)}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link href={`/projects`} className="btn-icon" title="ดูรายละเอียด" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', textDecoration: 'none' }}>
                    <i className="fa-solid fa-eye"></i>
                  </Link>
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
