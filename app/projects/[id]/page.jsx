"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  
  const [activeTab, setActiveTab] = useState('quotations'); 

  // Quotations
  const [quotations, setQuotations] = useState([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [viewingQuote, setViewingQuote] = useState(null); // For View Mode
  
  // New/Edit Quote state
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [quoteItems, setQuoteItems] = useState([{ desc: '', qty: 1, price: 0 }]);
  const [hasVat, setHasVat] = useState(false);
  const [whtRate, setWhtRate] = useState(0);
  
  // Billings
  const [billings, setBillings] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedQuoteForInvoice, setSelectedQuoteForInvoice] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');

  // Expenses
  const [expenses, setExpenses] = useState([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', type: 'other', supplier_id: '', is_tax_invoice: false, vat_amount: 0, wht_amount: 0, reference_no: '' });
  const [suppliers, setSuppliers] = useState([]);
  const [editingRefExpenseId, setEditingRefExpenseId] = useState(null);
  const [editRefExpenseValue, setEditRefExpenseValue] = useState('');

  const formatMoney = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    fetchProjectData();
    fetchSuppliers();
  }, [projectId]);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('contacts').select('id, name').eq('type', 'supplier');
    if (data) setSuppliers(data);
  };

  const fetchProjectData = async () => {
    setIsLoading(true);
    
    // Fetch Project
    const { data: pData } = await supabase
      .from('projects')
      .select(`*, contacts (name), internal_accounts (name)`)
      .eq('id', projectId)
      .single();
      
    if (pData) {
        setProject(pData);
        setEditNameValue(pData.name || '');
      }

    // Fetch Quotations
    const { data: qData } = await supabase.from('quotations').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (qData) setQuotations(qData);

    // Fetch Billings
    const { data: bData } = await supabase.from('billings').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (bData) setBillings(bData);

    // Fetch Expenses (with supplier name)
    const { data: eData } = await supabase.from('project_expenses').select('*, contacts(name)').eq('project_id', projectId).order('created_at', { ascending: false });
    if (eData) setExpenses(eData);

    setIsLoading(false);
  };

  const handleAddQuoteItem = () => setQuoteItems([...quoteItems, { desc: '', qty: 1, price: 0 }]);
  const handleRemoveQuoteItem = (index) => setQuoteItems(quoteItems.filter((_, i) => i !== index));
  const handleQuoteItemChange = (index, field, value) => {
    const newItems = [...quoteItems];
    newItems[index][field] = value;
    setQuoteItems(newItems);
  };

  const calculateQuoteTotals = () => {
    const subTotal = quoteItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
    const vatAmount = hasVat ? subTotal * 0.07 : 0;
    const whtAmount = whtRate > 0 ? subTotal * (whtRate / 100) : 0;
    const netTotal = subTotal + vatAmount - whtAmount;
    return { subTotal, vatAmount, whtAmount, netTotal };
  };

  const resetQuoteForm = () => {
    setShowQuoteForm(false);
    setEditingQuoteId(null);
    setQuoteItems([{ desc: '', qty: 1, price: 0 }]);
    setHasVat(false);
    setWhtRate(0);
  };

  const handleCreateOrUpdateQuote = async (e, saveAsNew = false) => {
    e.preventDefault();
    const { subTotal, vatAmount, whtAmount, netTotal } = calculateQuoteTotals();
    if(subTotal <= 0) return alert('ยอดรวมต้องมากกว่า 0');
    
    // Filter out empty items
    const validItems = quoteItems.filter(i => i.desc.trim() !== '');
    if(validItems.length === 0) return alert('กรุณาใส่รายการอย่างน้อย 1 รายการ');

    const quoteData = {
      total_amount: netTotal,
      sub_total: subTotal,
      vat_rate: hasVat ? 7 : 0,
      vat_amount: vatAmount,
      wht_rate: whtRate,
      wht_amount: whtAmount,
      items: validItems
    };

    if (editingQuoteId && !saveAsNew) {
      // Overwrite existing
      const { data, error } = await supabase.from('quotations').update(quoteData).eq('id', editingQuoteId).select();

      if(!error && data) {
        setQuotations(quotations.map(q => q.id === editingQuoteId ? data[0] : q));
        resetQuoteForm();
      } else {
        alert('เกิดข้อผิดพลาดในการอัปเดต: ' + (error?.message || ''));
      }
    } else {
      // Create new (or Save as V2)
      const prefix = `QT-${projectId}-`;
      const relatedQuotes = quotations.filter(q => q.id.startsWith(prefix));
      let maxCounter = 0;
      relatedQuotes.forEach(q => {
        const parts = q.id.split('-');
        const num = parseInt(parts[parts.length - 1]);
        if(num > maxCounter) maxCounter = num;
      });
      
      const count = maxCounter + 1;
      const qId = `${prefix}${count.toString().padStart(2, '0')}`;
      
      const { data, error } = await supabase.from('quotations').insert([{
        id: qId,
        project_id: projectId,
        status: 'รอพิจารณา',
        ...quoteData
      }]).select();

      if(!error && data) {
        let updatedQuotations = [data[0], ...quotations];
        
        if (saveAsNew && editingQuoteId) {
          await supabase.from('quotations').update({ status: 'ยกเลิก' }).eq('id', editingQuoteId);
          updatedQuotations = updatedQuotations.map(q => q.id === editingQuoteId ? {...q, status: 'ยกเลิก'} : q);
        }

        setQuotations(updatedQuotations);
        resetQuoteForm();
      } else {
        alert('เกิดข้อผิดพลาด: ' + (error?.message || 'ไม่สามารถสร้างใบเสนอราคาได้'));
      }
    }
  };

  const handleEditQuote = (q) => {
    setEditingQuoteId(q.id);
    setQuoteItems(q.items && q.items.length > 0 ? q.items : [{ desc: '', qty: 1, price: 0 }]);
    setHasVat(q.vat_rate > 0);
    setWhtRate(q.wht_rate || 0);
    setShowQuoteForm(true);
  };

  const handleDeleteQuote = async (quoteId) => {
    if(!confirm(`ยืนยันการลบใบเสนอราคา ${quoteId}?`)) return;
    const { error } = await supabase.from('quotations').delete().eq('id', quoteId);
    if(error) {
      alert('ไม่สามารถลบได้: ' + error.message);
    } else {
      setQuotations(quotations.filter(q => q.id !== quoteId));
    }
  };

  const handleApproveQuote = async (quoteId) => {
    await supabase.from('quotations').update({ status: 'อนุมัติแล้ว' }).eq('id', quoteId);
    await supabase.from('quotations').update({ status: 'ปฏิเสธ' }).eq('project_id', projectId).neq('id', quoteId);
    await supabase.from('projects').update({ status: 'อนุมัติแล้ว' }).eq('id', projectId);
    
    fetchProjectData();
  };

  const handleSaveName = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: editNameValue || null })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProject(prev => ({ ...prev, name: editNameValue || null }));
      setIsEditingName(false);
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกชื่อโปรเจกต์: ' + error.message);
    }
  };

  const handleCreateInvoice = async (quoteId, amount) => {
    const count = billings.filter(b => b.type === 'invoice').length + 1;
    const invId = `INV-${projectId}-${count.toString().padStart(2, '0')}`;

    const { data, error } = await supabase.from('billings').insert([{
      id: invId,
      project_id: projectId,
      quotation_id: quoteId,
      type: 'invoice',
      total_amount: amount,
      status: 'รอชำระเงิน'
    }]).select();

    if(!error && data) {
      setBillings([data[0], ...billings]);
    } else {
      alert('เกิดข้อผิดพลาด: ' + (error?.message || 'ไม่สามารถสร้างใบแจ้งหนี้ได้'));
    }
  };

  const handleReceivePayment = async (inv) => {
    await supabase.from('billings').update({ status: 'ชำระแล้ว' }).eq('id', inv.id);
    
    const count = billings.filter(b => b.type === 'receipt').length + 1;
    const recId = `REC-${projectId}-${count.toString().padStart(2, '0')}`;

    const { data, error } = await supabase.from('billings').insert([{
      id: recId,
      project_id: projectId,
      quotation_id: inv.quotation_id,
      type: 'receipt',
      total_amount: inv.total_amount,
      status: 'รับเงินแล้ว'
    }]).select();

    if(!error && data) {
      setBillings(billings.map(b => b.id === inv.id ? {...b, status: 'ชำระแล้ว'} : b));
      setBillings([data[0], ...billings.map(b => b.id === inv.id ? {...b, status: 'ชำระแล้ว'} : b)]);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if(!newExpense.desc || !newExpense.amount || !newExpense.reference_no) return alert('กรุณากรอกข้อมูลให้ครบถ้วน รวมถึงเลขที่อ้างอิง');
    if(newExpense.type === 'supplier' && !newExpense.supplier_id) return alert('กรุณาเลือกซัพพลายเออร์');

    const insertData = {
      project_id: projectId,
      description: newExpense.desc,
      amount: newExpense.amount,
      supplier_id: newExpense.type === 'supplier' ? newExpense.supplier_id : null,
      is_tax_invoice: newExpense.is_tax_invoice,
      sub_total: newExpense.amount,
      vat_amount: newExpense.is_tax_invoice ? newExpense.vat_amount : 0,
      wht_amount: newExpense.wht_amount || 0,
      reference_no: newExpense.reference_no
    };

    const { data, error } = await supabase.from('project_expenses').insert([insertData]).select('*, contacts(name)');

    if(!error && data) {
      setExpenses([data[0], ...expenses]);
      setShowExpenseForm(false);
      setNewExpense({ desc: '', amount: '', type: 'other', supplier_id: '', is_tax_invoice: false, vat_amount: 0, wht_amount: 0, reference_no: '' });
    } else {
      alert('เกิดข้อผิดพลาด: ' + (error?.message || ''));
    }
  };

  const handleSaveExpenseRef = async (id) => {
    const { error } = await supabase.from('project_expenses').update({ reference_no: editRefExpenseValue }).eq('id', id);
    if (!error) {
      setExpenses(expenses.map(e => e.id === id ? { ...e, reference_no: editRefExpenseValue } : e));
      setEditingRefExpenseId(null);
    } else {
      alert('เกิดข้อผิดพลาดในการอัปเดต: ' + error.message);
    }
  };

  if(isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูลโปรเจกต์...</div>;
  if(!project) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>ไม่พบโปรเจกต์นี้</div>;

  const isApproved = project?.status === 'อนุมัติแล้ว' || project?.status === 'เสร็จสิ้น';
  
  // Calculate Totals for Header
  const totalAccruedIncome = billings.filter(b => b.type === 'receipt').reduce((sum, b) => sum + Number(b.total_amount), 0);
  
  // Calculate WHT from receipts
  const receipts = billings.filter(b => b.type === 'receipt');
  const totalWhtDeducted = receipts.reduce((sum, b) => {
    const q = quotations.find(q => q.id === b.quotation_id);
    if (q && Number(q.total_amount) > 0) {
      const proportion = Number(b.total_amount) / Number(q.total_amount);
      return sum + (Number(q.wht_amount || 0) * proportion);
    }
    return sum;
  }, 0);
  const whtRates = [...new Set(receipts.map(b => {
    const q = quotations.find(q => q.id === b.quotation_id);
    return q ? Number(q.wht_rate || 0) : 0;
  }).filter(r => r > 0))];

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount) + Number(e.vat_amount || 0), 0);
  const expectedProfit = totalAccruedIncome - totalExpenses;

  const { subTotal: formSubTotal, vatAmount: formVatAmount, whtAmount: formWhtAmount, netTotal: formNetTotal } = calculateQuoteTotals();

  // Group Billings
  const groupedBillings = [];
  const processedBillingIds = new Set();
  
  // Create an ascending sorted version of billings for matching purposes
  const ascendingBillings = [...billings].reverse();

  ascendingBillings.forEach(b => {
    if (processedBillingIds.has(b.id)) return;
    if (b.type === 'invoice') {
      const matchingReceipt = ascendingBillings.find(r => r.type === 'receipt' && r.quotation_id === b.quotation_id && r.total_amount === b.total_amount && !processedBillingIds.has(r.id));
      if (matchingReceipt) {
        groupedBillings.push({ id: `${b.id}_${matchingReceipt.id}`, invoice: b, receipt: matchingReceipt, isGrouped: true, total_amount: b.total_amount, created_at: b.created_at });
        processedBillingIds.add(b.id);
        processedBillingIds.add(matchingReceipt.id);
      } else {
        groupedBillings.push({ ...b, isGrouped: false });
        processedBillingIds.add(b.id);
      }
    } else {
      const matchingInvoice = ascendingBillings.find(i => i.type === 'invoice' && i.quotation_id === b.quotation_id && i.total_amount === b.total_amount && !processedBillingIds.has(i.id));
      if (matchingInvoice) {
        groupedBillings.push({ id: `${matchingInvoice.id}_${b.id}`, invoice: matchingInvoice, receipt: b, isGrouped: true, total_amount: b.total_amount, created_at: matchingInvoice.created_at });
        processedBillingIds.add(b.id);
        processedBillingIds.add(matchingInvoice.id);
      } else {
        groupedBillings.push({ ...b, isGrouped: false });
        processedBillingIds.add(b.id);
      }
    }
  });

  // Reverse back to descending for UI display
  groupedBillings.reverse();

  return (
    <div className="container">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', padding: '32px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', color: 'white', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Link href="/projects" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left"></i> กลับ</Link>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
          <span style={{ background: isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isApproved ? '#a7f3d0' : '#fde68a', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            {project.status}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  value={editNameValue} 
                  onChange={e => setEditNameValue(e.target.value)} 
                  placeholder="กรอกชื่อโปรเจกต์ / Note"
                  style={{ fontSize: '20px', padding: '8px 16px', borderRadius: '8px', border: 'none', width: '300px', outline: 'none' }}
                  autoFocus
                />
                <button onClick={handleSaveName} style={{ padding: '8px 16px', background: 'white', color: 'var(--primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>บันทึก</button>
                <button onClick={() => { setIsEditingName(false); setEditNameValue(project.name || ''); }} style={{ padding: '8px 16px', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '8px', cursor: 'pointer' }}>ยกเลิก</button>
              </div>
            ) : (
              <h1 style={{ color: 'white', fontSize: '32px', textShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {project.name || project.id}
                {project.name && <span style={{ fontSize: '18px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '8px' }}>{project.id}</span>}
                <button onClick={() => setIsEditingName(true)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', transition: 'background 0.2s' }} title="แก้ไขชื่องาน">
                  <i className="fa-solid fa-pen-to-square"></i>
                </button>
              </h1>
            )}
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', marginTop: '8px', display: 'flex', gap: '16px' }}>
              <span><i className="fa-solid fa-building"></i> ลูกค้า: {project.contacts?.name || '-'}</span>
              <span><i className="fa-solid fa-bullseye"></i> จุดประสงค์: {project.objective}</span>
              <span><i className="fa-solid fa-wallet"></i> บัญชี: {project.internal_accounts?.name || '-'}</span>
            </p>
          </div>
          {isApproved && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '24px', backdropFilter: 'blur(4px)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>มูลค่าโครงการ (เปิดบิลแล้ว)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>฿{formatMoney(totalAccruedIncome)}</div>
                {totalWhtDeducted > 0 && (
                  <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '4px' }}>
                    หัก ณ ที่จ่าย {whtRates.join(', ')}% (฿{formatMoney(totalWhtDeducted)})
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>ต้นทุนทั้งหมด</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fca5a5' }}>฿{formatMoney(totalExpenses)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>กำไร/ขาดทุน (คาดการณ์)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: expectedProfit >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                  ฿{formatMoney(expectedProfit)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)' }}>
        <button onClick={() => setActiveTab('quotations')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'quotations' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'quotations' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'quotations' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer' }}>
          <i className="fa-solid fa-file-contract"></i> ใบเสนอราคา
        </button>
        <button onClick={() => setActiveTab('billing')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'billing' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'billing' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'billing' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer', opacity: isApproved ? 1 : 0.5 }}>
          <i className="fa-solid fa-file-invoice-dollar"></i> เรียกเก็บเงิน (Billing) {isApproved ? '' : <i className="fa-solid fa-lock" style={{ fontSize: '12px', marginLeft: '4px' }}></i>}
        </button>
        <button onClick={() => setActiveTab('expenses')} style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'expenses' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'expenses' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer', opacity: isApproved ? 1 : 0.5 }}>
          <i className="fa-solid fa-receipt"></i> ค่าใช้จ่ายโปรเจกต์ {isApproved ? '' : <i className="fa-solid fa-lock" style={{ fontSize: '12px', marginLeft: '4px' }}></i>}
        </button>
      </div>

      {/* TAB CONTENT: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>ใบเสนอราคาที่เกี่ยวข้อง</h3>
            {!isApproved && (
              <button onClick={() => {resetQuoteForm(); setShowQuoteForm(true); setViewingQuote(null);}} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer' }}>
                <i className="fa-solid fa-plus"></i> สร้างใบเสนอราคา
              </button>
            )}
          </div>
          
          {/* VIEW QUOTE MODAL/SECTION */}
          {viewingQuote && (
            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>ใบเสนอราคา {viewingQuote.id}</h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>วันที่: {new Date(viewingQuote.created_at).toLocaleDateString('th-TH')}</div>
                </div>
                <button onClick={() => setViewingQuote(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
              </div>

              <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
                 <thead>
                   <tr style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                     <th style={{ padding: '12px 8px' }}>รายการ</th>
                     <th style={{ padding: '12px 8px', textAlign: 'center' }}>จำนวน</th>
                     <th style={{ padding: '12px 8px', textAlign: 'right' }}>ราคา/หน่วย</th>
                     <th style={{ padding: '12px 8px', textAlign: 'right' }}>รวม (บาท)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {viewingQuote.items && viewingQuote.items.map((item, idx) => (
                     <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                       <td style={{ padding: '12px 8px' }}>{item.desc}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.qty}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatMoney(item.price)}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 500 }}>{formatMoney(Number(item.qty) * Number(item.price))}</td>
                     </tr>
                   ))}
                 </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    <span>รวมเป็นเงิน (Subtotal):</span>
                    <span>฿{formatMoney(viewingQuote.sub_total)}</span>
                  </div>
                  {viewingQuote.vat_rate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                      <span>ภาษีมูลค่าเพิ่ม (VAT {viewingQuote.vat_rate}%):</span>
                      <span>฿{formatMoney(viewingQuote.vat_amount)}</span>
                    </div>
                  )}
                  {viewingQuote.wht_rate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--danger)' }}>
                      <span>หัก ณ ที่จ่าย ({viewingQuote.wht_rate}%):</span>
                      <span>-฿{formatMoney(viewingQuote.wht_amount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid var(--border)', fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    <span>ยอดชำระสุทธิ:</span>
                    <span>฿{formatMoney(viewingQuote.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CREATE / EDIT QUOTE FORM */}
          {showQuoteForm && (
             <div style={{ background: 'rgba(99,102,241,0.05)', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.2)' }}>
               <h4 style={{ marginBottom: '16px', color: 'var(--primary)' }}>
                 {editingQuoteId ? `แก้ไขใบเสนอราคา ${editingQuoteId}` : 'สร้างใบเสนอราคาใหม่'}
               </h4>
               
               <table style={{ width: '100%', marginBottom: '16px' }}>
                 <thead>
                   <tr style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left' }}>
                     <th style={{ paddingBottom: '8px' }}>รายการ (Description)</th>
                     <th style={{ paddingBottom: '8px', width: '100px' }}>จำนวน</th>
                     <th style={{ paddingBottom: '8px', width: '150px' }}>ราคา/หน่วย</th>
                     <th style={{ paddingBottom: '8px', width: '150px', textAlign: 'right' }}>รวม (บาท)</th>
                     <th style={{ paddingBottom: '8px', width: '50px' }}></th>
                   </tr>
                 </thead>
                 <tbody>
                   {quoteItems.map((item, idx) => (
                     <tr key={idx}>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px' }}>
                         <input type="text" value={item.desc} onChange={e => handleQuoteItemChange(idx, 'desc', e.target.value)} placeholder="รายละเอียดรายการ" className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)'}} />
                       </td>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px' }}>
                         <input type="number" min="1" value={item.qty} onChange={e => handleQuoteItemChange(idx, 'qty', e.target.value)} className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)'}} />
                       </td>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px' }}>
                         <input type="number" step="0.01" value={item.price} onChange={e => handleQuoteItemChange(idx, 'price', e.target.value)} className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)'}} />
                       </td>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px', textAlign: 'right', fontWeight: 500 }}>
                         {formatMoney(Number(item.qty) * Number(item.price))}
                       </td>
                       <td style={{ paddingBottom: '8px', textAlign: 'right' }}>
                         <button type="button" onClick={() => handleRemoveQuoteItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                           <i className="fa-solid fa-xmark"></i>
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
                 <div>
                   <button type="button" onClick={handleAddQuoteItem} style={{ background: 'rgba(99,102,241,0.1)', padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, marginBottom: '24px' }}>
                     <i className="fa-solid fa-plus"></i> เพิ่มรายการ
                   </button>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" checked={hasVat} onChange={(e) => setHasVat(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                       <span style={{ fontSize: '14px', fontWeight: 500 }}>คิดภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                     </label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontSize: '14px', fontWeight: 500 }}>หัก ณ ที่จ่าย (WHT):</span>
                       <select value={whtRate} onChange={(e) => setWhtRate(Number(e.target.value))} className="form-control" style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                         <option value={0}>ไม่มี</option>
                         <option value={1}>หัก 1%</option>
                         <option value={3}>หัก 3%</option>
                         <option value={5}>หัก 5%</option>
                       </select>
                     </div>
                   </div>
                 </div>

                 <div style={{ width: '300px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                     <span>รวมเป็นเงิน:</span>
                     <span>฿{formatMoney(formSubTotal)}</span>
                   </div>
                   {hasVat && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                       <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                       <span>฿{formatMoney(formVatAmount)}</span>
                     </div>
                   )}
                   {whtRate > 0 && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--danger)' }}>
                       <span>หัก ณ ที่จ่าย {whtRate}%:</span>
                       <span>-฿{formatMoney(formWhtAmount)}</span>
                     </div>
                   )}
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid var(--border)', fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>
                     <span>ยอดชำระสุทธิ:</span>
                     <span>฿{formatMoney(formNetTotal)}</span>
                   </div>
                 </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                 <button type="button" onClick={resetQuoteForm} className="btn-outline" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>ยกเลิก</button>
                 
                 {editingQuoteId ? (
                   <>
                     <button type="button" onClick={(e) => handleCreateOrUpdateQuote(e, true)} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกเป็นเวอร์ชันใหม่</button>
                     <button type="button" onClick={(e) => handleCreateOrUpdateQuote(e, false)} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกทับ</button>
                   </>
                 ) : (
                   <button type="button" onClick={(e) => handleCreateOrUpdateQuote(e, false)} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>สร้างใบเสนอราคา</button>
                 )}
               </div>
             </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>เลขที่เอกสาร</th>
                <th>วันที่สร้าง</th>
                <th style={{ textAlign: 'right' }}>ยอดสุทธิ</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีใบเสนอราคา</td></tr> : null}
              {quotations.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--primary)' }}>
                    {q.id}
                    {q.items && q.items.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {q.items.length} รายการ {q.vat_rate > 0 && `| มี VAT (฿${formatMoney(Number(q.vat_amount))})`} {q.wht_rate > 0 && `| หัก ${q.wht_rate}% (฿${formatMoney(Number(q.wht_amount))})`}
                      </div>
                    )}
                  </td>
                  <td>{new Date(q.created_at).toLocaleDateString('th-TH')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{formatMoney(Number(q.total_amount))}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ 
                      background: q.status === 'อนุมัติแล้ว' ? 'rgba(16, 185, 129, 0.1)' : q.status === 'ปฏิเสธ' || q.status === 'ยกเลิก' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                      color: q.status === 'อนุมัติแล้ว' ? 'var(--secondary)' : q.status === 'ปฏิเสธ' || q.status === 'ยกเลิก' ? 'var(--danger)' : 'var(--warning)', 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => {setViewingQuote(q); setShowQuoteForm(false);}} style={{ background: 'none', color: 'var(--primary)', border: 'none', padding: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '14px' }} title="ดูรายละเอียด">
                      <i className="fa-regular fa-eye"></i>
                    </button>
                    {q.status === 'รอพิจารณา' && !isApproved && (
                      <>
                        <button onClick={() => handleApproveQuote(q.id)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '12px' }} title="อนุมัติใบเสนอราคานี้">
                          <i className="fa-solid fa-check"></i>
                        </button>
                        <button onClick={() => handleEditQuote(q)} style={{ background: 'none', color: 'var(--text-main)', border: 'none', padding: '6px', cursor: 'pointer', marginRight: '4px', fontSize: '14px' }} title="แก้ไข">
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button onClick={() => handleDeleteQuote(q.id)} style={{ background: 'none', color: 'var(--danger)', border: 'none', padding: '6px', cursor: 'pointer', fontSize: '14px' }} title="ลบ">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: BILLING */}
      {activeTab === 'billing' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', opacity: isApproved ? 1 : 0.5, pointerEvents: isApproved ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>รายการเรียกเก็บเงิน</h3>
            <button onClick={() => setShowInvoiceForm(!showInvoiceForm)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer' }}>
              <i className="fa-solid fa-plus"></i> เปิดบิลแจ้งหนี้
            </button>
          </div>
          
          {showInvoiceForm && (
             <form onSubmit={(e) => { e.preventDefault(); handleCreateInvoice(selectedQuoteForInvoice, invoiceAmount); setShowInvoiceForm(false); }} style={{ background: 'rgba(99,102,241,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
               <div style={{flex: 1}}>
                 <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>อ้างอิงใบเสนอราคา</label>
                 <select required value={selectedQuoteForInvoice} onChange={e=>setSelectedQuoteForInvoice(e.target.value)} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}}>
                   <option value="">-- เลือกใบเสนอราคาที่อนุมัติ --</option>
                   {quotations.filter(q => q.status === 'อนุมัติแล้ว').map(q => <option key={q.id} value={q.id}>{q.id} - ฿{formatMoney(Number(q.total_amount))}</option>)}
                 </select>
               </div>
               <div style={{flex: 1}}>
                 <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ยอดเรียกเก็บ (บาท)</label>
                 <input type="number" step="0.01" value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value)} required className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
               </div>
               <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>ออกใบแจ้งหนี้</button>
             </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>เอกสาร</th>
                <th>ประเภท</th>
                <th>วันที่</th>
                <th style={{ textAlign: 'right' }}>ยอดเงิน</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {groupedBillings.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีรายการเรียกเก็บเงิน</td></tr> : null}
              {groupedBillings.map(b => {
                if (b.isGrouped) {
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ color: 'var(--primary)' }}>{b.invoice.id}</div>
                          <div style={{ color: 'var(--secondary)' }}>{b.receipt.id}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>ใบแจ้งหนี้</div>
                          <div style={{ color: 'var(--text-muted)' }}>ใบเสร็จรับเงิน</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ color: 'var(--text-muted)' }}>{new Date(b.invoice.created_at).toLocaleDateString('th-TH')}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{new Date(b.receipt.created_at).toLocaleDateString('th-TH')}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{formatMoney(Number(b.total_amount))}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                          รับเงินแล้ว
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}></td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 12px', fontWeight: 600, color: b.type === 'invoice' ? 'var(--primary)' : 'var(--secondary)' }}>{b.id}</td>
                      <td>{b.type === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จรับเงิน'}</td>
                      <td>{new Date(b.created_at).toLocaleDateString('th-TH')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>฿{formatMoney(Number(b.total_amount))}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          background: b.status === 'รับเงินแล้ว' || b.status === 'ชำระแล้ว' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                          color: b.status === 'รับเงินแล้ว' || b.status === 'ชำระแล้ว' ? 'var(--secondary)' : 'var(--warning)', 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {b.type === 'invoice' && b.status === 'รอชำระเงิน' && (
                          <button onClick={() => handleReceivePayment(b)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            <i className="fa-solid fa-hand-holding-dollar"></i> รับชำระเงิน
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', opacity: isApproved ? 1 : 0.5, pointerEvents: isApproved ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>บันทึกต้นทุน / ค่าใช้จ่าย</h3>
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer' }}>
              <i className="fa-solid fa-minus"></i> บันทึกค่าใช้จ่าย
            </button>
          </div>
          
          {showExpenseForm && (
             <form onSubmit={handleAddExpense} style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                 <div>
                   <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ประเภทค่าใช้จ่าย</label>
                   <select required value={newExpense.type} onChange={e=>setNewExpense({...newExpense, type: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}}>
                     <option value="supplier">ซื้อสินค้า/บริการจากซัพพลายเออร์</option>
                     <option value="other">ค่าใช้จ่ายอื่นๆ (เช่น ค่าจ้าง, เบ็ดเตล็ด)</option>
                   </select>
                 </div>
                 
                 {newExpense.type === 'supplier' && (
                   <div>
                     <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ซัพพลายเออร์ (Supplier)</label>
                     <select required value={newExpense.supplier_id} onChange={e=>setNewExpense({...newExpense, supplier_id: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}}>
                       <option value="">-- เลือกซัพพลายเออร์ --</option>
                       {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                   </div>
                 )}
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '16px', alignItems: 'flex-end', marginBottom: '16px' }}>
                 <div>
                   <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>เลขที่อ้างอิง/ใบเสร็จ <span style={{color: 'red'}}>*</span></label>
                   <input type="text" required value={newExpense.reference_no} onChange={e=>setNewExpense({...newExpense, reference_no: e.target.value})} className="form-control" placeholder="เช่น INV-001" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
                 </div>
                 <div>
                   <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>รายละเอียด <span style={{color: 'red'}}>*</span></label>
                   <input type="text" required value={newExpense.desc} onChange={e=>setNewExpense({...newExpense, desc: e.target.value})} className="form-control" placeholder="เช่น ค่าวัสดุ, ค่าแรงช่าง" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
                 </div>
                 <div>
                   <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>ยอดก่อนภาษี (Subtotal)</label>
                   <input type="number" step="0.01" required value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount: e.target.value})} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '24px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                   <input type="checkbox" checked={newExpense.is_tax_invoice} onChange={(e) => {
                     const isTax = e.target.checked;
                     const vatAmt = isTax && newExpense.amount ? (Number(newExpense.amount) * 0.07).toFixed(2) : 0;
                     setNewExpense({...newExpense, is_tax_invoice: isTax, vat_amount: vatAmt});
                   }} style={{ width: '16px', height: '16px' }} />
                   <span style={{ fontSize: '14px', fontWeight: 500 }}>เป็นใบกำกับภาษี (VAT 7%)</span>
                 </label>
                 {newExpense.is_tax_invoice && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <span style={{ fontSize: '13px' }}>ยอด VAT:</span>
                     <input type="number" step="0.01" value={newExpense.vat_amount} onChange={e => setNewExpense({...newExpense, vat_amount: e.target.value})} className="form-control" style={{ padding: '4px 8px', width: '100px' }} />
                   </div>
                 )}

                 <div style={{ width: '1px', background: 'var(--border)' }}></div>

                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <span style={{ fontSize: '14px', fontWeight: 500 }}>หัก ณ ที่จ่าย:</span>
                   <input type="number" step="0.01" value={newExpense.wht_amount} onChange={e => setNewExpense({...newExpense, wht_amount: e.target.value})} className="form-control" placeholder="ยอดเงินหัก WHT" style={{ padding: '4px 8px', width: '120px' }} />
                 </div>
               </div>
               
               <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                 <div style={{ fontSize: '16px' }}>
                   ยอดรวมที่ต้องจ่ายจริง: <strong style={{ color: 'var(--danger)', fontSize: '20px' }}>฿{formatMoney(Number(newExpense.amount || 0) + Number(newExpense.vat_amount || 0) - Number(newExpense.wht_amount || 0))}</strong>
                 </div>
                 <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกค่าใช้จ่าย</button>
               </div>
             </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>วันที่</th>
                <th>เลขอ้างอิง</th>
                <th>รายละเอียด</th>
                <th>ซัพพลายเออร์</th>
                <th style={{ textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีค่าใช้จ่าย</td></tr> : null}
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 12px' }}>{new Date(e.created_at).toLocaleDateString('th-TH')}</td>
                  <td>
                    {editingRefExpenseId === e.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" value={editRefExpenseValue} onChange={ev => setEditRefExpenseValue(ev.target.value)} className="form-control" style={{ width: '120px', padding: '4px 8px' }} autoFocus />
                        <button onClick={() => handleSaveExpenseRef(e.id)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><i className="fa-solid fa-check"></i></button>
                        <button onClick={() => setEditingRefExpenseId(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{e.reference_no || '-'}</span>
                        <button onClick={() => { setEditingRefExpenseId(e.id); setEditRefExpenseValue(e.reference_no || ''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="fa-solid fa-pen"></i></button>
                      </div>
                    )}
                  </td>
                  <td>{e.description}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {e.contacts?.name ? <><i className="fa-solid fa-truck-field"></i> {e.contacts.name}</> : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--danger)' }}>
                    -฿{formatMoney(Number(e.amount || 0) + Number(e.vat_amount || 0) - Number(e.wht_amount || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
