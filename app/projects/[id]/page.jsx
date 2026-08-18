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
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [quoteItems, setQuoteItems] = useState([{ desc: '', sub_desc: '', qty: 1, price: 0 }]);
  const [hasVat, setHasVat] = useState(false);
  
  // PO Modal State
  const [showPOModal, setShowPOModal] = useState(false);
  const [poInputValue, setPoInputValue] = useState('');
  const [approvingQuoteId, setApprovingQuoteId] = useState(null);
  const [whtRate, setWhtRate] = useState(3);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [quoteCustomerName, setQuoteCustomerName] = useState('');
  const [quoteCustomerTaxId, setQuoteCustomerTaxId] = useState('');
  const [quoteCustomerAddress, setQuoteCustomerAddress] = useState('');
  
  // Billings
  const [billings, setBillings] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedQuoteForInvoice, setSelectedQuoteForInvoice] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoicePercentage, setInvoicePercentage] = useState('');

  // Receive Payment Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveInv, setReceiveInv] = useState(null);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveGross, setReceiveGross] = useState('');
  const [receiveNet, setReceiveNet] = useState('');
  const [receiveWht, setReceiveWht] = useState(0);
  const [receiveVatRate, setReceiveVatRate] = useState(0);
  const [receiveWhtRate, setReceiveWhtRate] = useState(0);
  const [receiveBankFee, setReceiveBankFee] = useState(0);

  // Calculate billing stats dynamically based on selectedQuoteForInvoice
  const selectedQuoteData = quotations.find(q => q.id === selectedQuoteForInvoice);
  const quoteTotalForInvoice = selectedQuoteData ? Number(selectedQuoteData.total_amount) : 0;
  const billedAmountForInvoice = billings
    .filter(b => b.quotation_id === selectedQuoteForInvoice && b.type === 'invoice' && b.status !== 'ยกเลิก')
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const remainingAmountForInvoice = quoteTotalForInvoice - billedAmountForInvoice;

  const handlePercentageChange = (e) => {
    const pct = e.target.value;
    setInvoicePercentage(pct);
    if (pct && selectedQuoteData) {
      const calculated = (quoteTotalForInvoice * (Number(pct) / 100)).toFixed(2);
      setInvoiceAmount(calculated);
    }
  };

  const handleInvoiceAmountChange = (e) => {
    setInvoiceAmount(e.target.value);
    setInvoicePercentage('');
  };

  // Expenses
  const [expenses, setExpenses] = useState([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', type: 'other', supplier_id: '', is_tax_invoice: false, vat_amount: 0, wht_amount: 0, reference_no: '' });
  const [suppliers, setSuppliers] = useState([]);
  const [editingRefExpenseId, setEditingRefExpenseId] = useState(null);
  const [editRefExpenseValue, setEditRefExpenseValue] = useState('');

  // Sub-Account Expenses
  const [internalAccounts, setInternalAccounts] = useState([]);
  const [isMainExpensesCompleted, setIsMainExpensesCompleted] = useState(false);
  const [showSubAccountExpenseForm, setShowSubAccountExpenseForm] = useState(false);
  const [newSubAccountExpense, setNewSubAccountExpense] = useState({ internalAccountId: '', amount: '', reference_no: '', desc: '', is_tax_invoice: false, vat_amount: 0, wht_amount: 0 });

  const calculateMaxAllowedExpense = () => {
    let pVal = 0;
    if (project?.objective === 'ทำคู่เทียบ' && quotations.length > 0) {
      pVal = Math.max(...quotations.map(q => Number(q.total_amount) || 0));
    } else {
      const approvedQ = quotations.find(q => q.status === 'อนุมัติแล้ว');
      if (approvedQ) pVal = Number(approvedQ.total_amount) || 0;
    }
    const currentTotalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const maxAllowed = (pVal - currentTotalExpenses) - (pVal * 0.15);
    return Math.max(0, maxAllowed);
  };

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
      .select(`*, contacts (name, tax_id, address), internal_accounts (name)`)
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
    
    // Fetch internal account withdrawals for this project to cross-reference sub-account expenses
    const { data: wData } = await supabase.from('fund_withdrawals')
      .select('*, internal_accounts(name)')
      .ilike('note', `%${projectId}%`);
      
    if (eData) {
      const payerMap = {};
      if (wData) {
        wData.forEach(w => {
          const refMatch = w.note?.match(/\(Ref: (.*?)\)/);
          if (refMatch && refMatch[1]) {
            payerMap[refMatch[1]] = w.internal_accounts?.name;
          }
        });
      }
      const enrichedExpenses = eData.map(e => ({
        ...e,
        payerName: payerMap[e.reference_no]
      }));
      setExpenses(enrichedExpenses);
    }

    // Fetch Internal Accounts
    const { data: iData } = await supabase.from('internal_accounts').select('*');
    if (iData) setInternalAccounts(iData);

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
    const netTotal = subTotal + vatAmount; // GROSS TOTAL (Do not deduct WHT here)
    return { subTotal, vatAmount, whtAmount, netTotal };
  };

  const resetQuoteForm = () => {
    setShowQuoteForm(false);
    setEditingQuoteId(null);
    setIsNegotiating(false);
    setQuoteItems([{ desc: '', sub_desc: '', qty: 1, price: 0 }]);
    setHasVat(false);
    setWhtRate(3);
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setQuoteCustomerName(project?.contacts?.name || '');
    setQuoteCustomerTaxId(project?.contacts?.tax_id || '');
    setQuoteCustomerAddress(project?.contacts?.address || '');
  };

  const handleCreateOrUpdateQuote = async (e, saveAsNew = false) => {
    e.preventDefault();
    if (isNegotiating) saveAsNew = true;
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
      items: validItems,
      customer_name: quoteCustomerName,
      customer_tax_id: quoteCustomerTaxId,
      customer_address: quoteCustomerAddress,
      quote_date: quoteDate
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

  const handleNegotiateQuote = (q) => {
    handleEditQuote(q);
    setIsNegotiating(true);
  };

  const handleEditQuote = (q) => {
    setEditingQuoteId(q.id);
    setQuoteItems(q.items && q.items.length > 0 ? q.items.map(i => ({...i, show_sub_desc: !!i.sub_desc})) : [{ desc: '', sub_desc: '', qty: 1, price: 0 }]);
    setHasVat(q.vat_rate > 0);
    setWhtRate(q.wht_rate || 0);
    setQuoteDate(q.quote_date || new Date().toISOString().split('T')[0]);
    setQuoteCustomerName(q.customer_name || project?.contacts?.name || '');
    setQuoteCustomerTaxId(q.customer_tax_id || '');
    setQuoteCustomerAddress(q.customer_address || '');
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

  const handleApproveQuoteClick = (quoteId) => {
    setApprovingQuoteId(quoteId);
    setPoInputValue('');
    setShowPOModal(true);
  };

  const submitApproveQuote = async (e) => {
    if (e) e.preventDefault();
    const quoteId = approvingQuoteId;
    const poNumber = poInputValue || null;
    
    const { error } = await supabase.from('quotations').update({ status: 'อนุมัติแล้ว', po_number: poNumber }).eq('id', quoteId);
    
    if (error && error.message.includes('po_number')) {
        alert('กรุณาเพิ่มคอลัมน์ po_number (ชนิด text) ในตาราง quotations ที่ระบบฐานข้อมูล (Supabase) ก่อนครับ จึงจะสามารถบันทึก PO ได้');
        return;
    } else if (error) {
        alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.message);
        return;
    }

    await supabase.from('quotations').update({ status: 'ปฏิเสธ' }).eq('project_id', projectId).neq('id', quoteId);
    await supabase.from('projects').update({ status: 'อนุมัติแล้ว' }).eq('id', projectId);
    
    setShowPOModal(false);
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
    // Check if amount exceeds remaining balance
    const qData = quotations.find(q => q.id === quoteId);
    if (!qData) return;
    
    const totalQ = Number(qData.total_amount);
    const billedSoFar = billings.filter(b => b.quotation_id === quoteId && b.type === 'invoice' && b.status !== 'ยกเลิก').reduce((sum, b) => sum + Number(b.total_amount), 0);
    const remaining = totalQ - billedSoFar;
    
    if (Number(amount) > remaining) {
      alert('ไม่สามารถเรียกเก็บเงินเกินยอดคงเหลือได้ กรุณาตรวจสอบยอดเงินอีกครั้ง');
      return;
    }

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

  const openReceivePaymentModal = (inv) => {
    setReceiveInv(inv);
    setReceiveDate(new Date().toISOString().split('T')[0]);
    const quote = quotations.find(q => q.id === inv.quotation_id);
    const vatRate = quote?.vat_rate || 0;
    const whtRate = quote?.wht_rate || 0;
    
    setReceiveVatRate(vatRate);
    setReceiveWhtRate(whtRate);
    
    const gross = Number(inv.total_amount);
    setReceiveGross(gross.toFixed(2));
    
    const subTotal = gross / (1 + vatRate / 100);
    const whtAmt = subTotal * (whtRate / 100);
    setReceiveWht(whtAmt);
    
    setReceiveNet((gross - whtAmt).toFixed(2));
    setReceiveBankFee(0);
    
    setShowReceiveModal(true);
  };

  const handleReceiveNetChange = (val) => {
    setReceiveNet(val);
    const net = Number(val);
    const gross = Number(receiveGross) || 0;
    const wht = receiveWht || 0;
    
    if (!isNaN(net) && net >= 0) {
       const fee = gross - wht - net;
       setReceiveBankFee(fee);
    } else {
       setReceiveBankFee(0);
    }
  };

  const handleReceiveWhtRateChange = (newRate) => {
    setReceiveWhtRate(newRate);
    const gross = Number(receiveGross) || 0;
    if (gross > 0) {
      const subTotal = gross / (1 + receiveVatRate / 100);
      const whtAmt = subTotal * (newRate / 100);
      setReceiveWht(whtAmt);
      setReceiveNet((gross - whtAmt).toFixed(2));
      setReceiveBankFee(0);
    }
  };

  const submitReceivePayment = async () => {
    if (!receiveInv || !receiveGross || !receiveDate) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    
    const grossNum = Number(receiveGross);
    if (grossNum <= 0) return alert('ยอดเงินต้องมากกว่า 0');

    setIsLoading(true);
    await supabase.from('billings').update({ status: `ชำระแล้ว (WHT:${receiveWhtRate})` }).eq('id', receiveInv.id);
    
    const count = billings.filter(b => b.type === 'receipt').length + 1;
    const recId = `REC-${projectId}-${count.toString().padStart(2, '0')}`;

    const now = new Date();
    const timeString = now.toISOString().split('T')[1] || '00:00:00.000Z';
    const timestamp = `${receiveDate}T${timeString}`;

    const { data, error } = await supabase.from('billings').insert([{
      id: recId,
      project_id: projectId,
      quotation_id: receiveInv.quotation_id,
      type: 'receipt',
      total_amount: grossNum,
      status: `รับเงินแล้ว (WHT:${receiveWhtRate})`,
      created_at: timestamp
    }]).select();

    if(!error && data) {
      const updatedBillings = billings.map(b => b.id === receiveInv.id ? {...b, status: `ชำระแล้ว (WHT:${receiveWhtRate})`} : b);
      setBillings([data[0], ...updatedBillings]);
      
      if (receiveBankFee > 0) {
        const feeInsertData = {
          project_id: projectId,
          description: `ค่าธรรมเนียมธุรกรรมรับชำระเงิน (${recId})`,
          amount: receiveBankFee,
          supplier_id: null,
          is_tax_invoice: false,
          sub_total: receiveBankFee,
          vat_amount: 0,
          wht_amount: 0,
          reference_no: recId,
          expense_date: receiveDate
        };
        const { error: feeErr, data: feeData } = await supabase.from('project_expenses').insert([feeInsertData]).select('*, contacts(name)');
        if (!feeErr && feeData) {
          setExpenses(prev => [feeData[0], ...prev]);
        } else {
          console.error("Failed to insert bank fee expense", feeErr);
        }
      }

      setShowReceiveModal(false);
    } else {
      alert('เกิดข้อผิดพลาด: ' + (error?.message || 'ไม่สามารถสร้างใบเสร็จรับเงินได้'));
    }
    setIsLoading(false);
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

  const handleAddSubAccountExpense = async (e) => {
    e.preventDefault();
    if (!newSubAccountExpense.internalAccountId || !newSubAccountExpense.amount) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    if (!newSubAccountExpense.reference_no || !newSubAccountExpense.desc) return alert('กรุณากรอกเลขอ้างอิงและรายละเอียด');
    
    const amountNum = parseFloat(newSubAccountExpense.amount);
    if (amountNum <= 0) return alert('จำนวนเงินต้องมากกว่า 0');

    const maxAllowed = calculateMaxAllowedExpense();
    
    if (amountNum > maxAllowed) {
      return alert(`ไม่สามารถเพิ่มได้เกิน ${formatMoney(maxAllowed)} บาท เนื่องจากกำไรขั้นต้นจะต่ำกว่า 15%`);
    }

    const subAcc = internalAccounts.find(a => a.id === newSubAccountExpense.internalAccountId);
    const vatAmt = Number(newSubAccountExpense.vat_amount || 0);
    const whtAmt = Number(newSubAccountExpense.wht_amount || 0);
    const totalPay = amountNum + vatAmt - whtAmt;

    const insertData = {
      project_id: projectId,
      description: newSubAccountExpense.desc,
      amount: amountNum,
      expense_date: new Date().toISOString().split('T')[0],
      is_tax_invoice: newSubAccountExpense.is_tax_invoice,
      sub_total: amountNum,
      vat_amount: vatAmt,
      wht_amount: whtAmt,
      reference_no: newSubAccountExpense.reference_no
    };

    const { data: expData, error: expError } = await supabase.from('project_expenses').insert([insertData]).select('*, contacts(name)');
    
    if (expError) return alert('เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย: ' + expError.message);

    const { error: fundError } = await supabase.from('fund_withdrawals').insert([{
      internal_account_id: newSubAccountExpense.internalAccountId,
      amount: -totalPay,
      note: `ปรับลดกำไรโปรเจกต์ ${projectId} (Ref: ${newSubAccountExpense.reference_no})`,
      method: 'cash'
    }]);

    if (fundError) {
      console.error('Failed to update fund_withdrawals:', fundError);
      alert('บันทึกค่าใช้จ่ายแล้ว แต่เกิดข้อผิดพลาดในการเพิ่มเครดิต: ' + fundError.message);
    }

    if (expData) {
      const newExp = expData[0];
      newExp.payerName = subAcc?.name;
      setExpenses([newExp, ...expenses]);
    }
    
    setNewSubAccountExpense({ internalAccountId: '', amount: '', reference_no: '', desc: '', is_tax_invoice: false, vat_amount: 0, wht_amount: 0 });
    setShowSubAccountExpenseForm(false);
  };

  if(isLoading) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>กำลังโหลดข้อมูลโปรเจกต์...</div>;
  if(!project) return <div className="container" style={{padding: '40px', textAlign: 'center'}}>ไม่พบโปรเจกต์นี้</div>;

  const isApproved = project?.status === 'อนุมัติแล้ว' || project?.status === 'เสร็จสิ้น';
  
  // Calculate Totals for Header
  const totalReceipts = billings.filter(b => b.type === 'receipt').reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalInvoices = billings.filter(b => b.type === 'invoice').reduce((sum, b) => sum + Number(b.total_amount), 0);
  const pendingPayment = Math.max(0, totalInvoices - totalReceipts);

  // Get PO Number and Project Value from approved quote
  const approvedQuote = quotations.find(q => q.status === 'อนุมัติแล้ว');
  const projectPoNumber = approvedQuote?.po_number;
  const projectValue = approvedQuote ? Number(approvedQuote.total_amount) : 0;
  
  // Calculate WHT from receipts
  const receipts = billings.filter(b => b.type === 'receipt');
  const totalWhtDeducted = receipts.reduce((sum, b) => {
    const q = quotations.find(q => q.id === b.quotation_id);
    if (q && Number(q.total_amount) > 0) {
      const proportion = Number(b.total_amount) / Number(q.total_amount);
      let whtAmount = Number(q.wht_amount || 0) * proportion;
      
      if (b.status && b.status.includes('WHT:')) {
          const match = b.status.match(/WHT:(\d+)/);
          if (match) {
              const actualWhtRate = Number(match[1]);
              const vatRate = Number(q.vat_amount) > 0 ? 7 : 0;
              const subTotal = Number(b.total_amount) / (1 + vatRate/100);
              whtAmount = subTotal * (actualWhtRate / 100);
          }
      }
      return sum + whtAmount;
    }
    return sum;
  }, 0);

  const totalSalesVat = receipts.reduce((sum, b) => {
    const q = quotations.find(q => q.id === b.quotation_id);
    if (q && Number(q.total_amount) > 0) {
      const proportion = Number(b.total_amount) / Number(q.total_amount);
      return sum + (Number(q.vat_amount || 0) * proportion);
    }
    return sum;
  }, 0);
  const whtRates = [...new Set(receipts.map(b => {
    const q = quotations.find(q => q.id === b.quotation_id);
    return q ? Number(q.wht_rate || 0) : 0;
  }).filter(r => r > 0))];

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount) + Number(e.vat_amount || 0), 0);
  const totalPurchaseVat = expenses.reduce((sum, e) => sum + Number(e.vat_amount || 0), 0);
  
  const netReceived = totalReceipts - totalWhtDeducted;
  const netExpenses = totalExpenses - totalPurchaseVat;

  const expectedProfit = projectValue - totalExpenses; // คาดการณ์จากมูลค่างานรวม
  const realizedProfit = totalReceipts - totalExpenses; // กำไรจากเงินที่รับจริง

  // Custom User Formulas
  const salesBeforeVat = totalReceipts - totalSalesVat;
  const profitBeforeVat = salesBeforeVat - totalWhtDeducted - netExpenses;
  const vatCredit = totalPurchaseVat - totalSalesVat;
  const newExpectedProfit = profitBeforeVat + totalWhtDeducted + vatCredit;

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



  const handleEditPOClick = () => {
    if (!approvedQuote) {
      alert('กรุณาอนุมัติใบเสนอราคาก่อนเพื่อเพิ่มหรือแก้ไข PO');
      return;
    }
    setApprovingQuoteId(approvedQuote.id);
    setPoInputValue(approvedQuote.po_number || '');
    setShowPOModal(true);
  };

  // Determine Timeline Step
  let currentStep = 1;
  if (project.status === 'เสร็จสิ้น' || (isApproved && totalInvoices > 0 && pendingPayment === 0 && totalReceipts >= projectValue && projectValue > 0)) {
    currentStep = 4;
  } else if (isApproved) {
    if (totalInvoices > 0 || totalReceipts > 0) {
      currentStep = 3;
    } else {
      currentStep = 2;
    }
  }

  const timelineSteps = [
    { num: 1, label: 'เสนอราคา', icon: 'fa-file-signature' },
    { num: 2, label: 'อนุมัติงาน', icon: 'fa-check-circle' },
    { num: 3, label: 'ดำเนินการ/เก็บเงิน', icon: 'fa-file-invoice-dollar' },
    { num: 4, label: 'เสร็จสิ้น', icon: 'fa-flag-checkered' }
  ];

  return (
    <div className="container">
      <div className="page-header" style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        padding: '16px 20px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', 
        color: 'white', 
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background decoration */}
        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Row: Navigation, Status, Title, PO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/projects" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <i className="fa-solid fa-arrow-left"></i> กลับ
              </Link>
              <span style={{ 
                background: isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', 
                color: isApproved ? '#a7f3d0' : '#fde68a', 
                border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600
              }}>
                <i className={`fa-solid ${isApproved ? 'fa-circle-check' : 'fa-clock'}`} style={{ marginRight: '4px' }}></i>
                {project.status}
              </span>
              
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }}></div>
              
              {isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} placeholder="ชื่อโปรเจกต์" style={{ fontSize: '16px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', width: '250px', outline: 'none' }} autoFocus />
                  <button onClick={handleSaveName} style={{ padding: '4px 12px', background: 'white', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>บันทึก</button>
                  <button onClick={() => { setIsEditingName(false); setEditNameValue(project.name || ''); }} style={{ padding: '4px 12px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>ยกเลิก</button>
                </div>
              ) : (
                <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {project.name || project.id}
                  {project.name && <span style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}>{project.id}</span>}
                  <button onClick={() => setIsEditingName(true)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }} title="แก้ไขชื่องาน"><i className="fa-solid fa-pen"></i></button>
                </h1>
              )}
            </div>
            
            {/* PO Badge on the right */}
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <i className="fa-solid fa-file-invoice" style={{ color: '#93c5fd' }}></i> 
              <span>PO: <span style={{ fontWeight: 700 }}>{projectPoNumber || 'ยังไม่ระบุ'}</span></span>
              <button onClick={handleEditPOClick} style={{ background: 'none', border: 'none', color: 'white', opacity: 0.7, cursor: 'pointer', padding: '0 4px' }} title="แก้ไข PO"><i className="fa-solid fa-pen"></i></button>
            </div>
          </div>
          {/* Middle Row: Metadata & Financial Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              <span><i className="fa-solid fa-building" style={{ opacity: 0.6 }}></i> {project.contacts?.name || '-'}</span>
              <span><i className="fa-solid fa-bullseye" style={{ opacity: 0.6 }}></i> {project.objective}</span>
              <span><i className="fa-solid fa-wallet" style={{ opacity: 0.6 }}></i> {project.internal_accounts?.name || '-'}</span>
            </div>

            {isApproved && (
              <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>มูลค่างาน</span>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>฿{formatMoney(projectValue)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>เรียกเก็บแล้ว</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#93c5fd' }}>฿{formatMoney(totalInvoices)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>รอรับเงิน</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fde047' }}>฿{formatMoney(pendingPayment)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>รับเงินแล้ว (Net)</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#86efac' }}>฿{formatMoney(netReceived)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>หัก ณ ที่จ่าย</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#eab308' }}>฿{formatMoney(totalWhtDeducted)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>VAT ขาย</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f472b6' }}>฿{formatMoney(totalSalesVat)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>VAT ซื้อ</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fb923c' }}>฿{formatMoney(totalPurchaseVat)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>ต้นทุน (Net)</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5' }}>฿{formatMoney(netExpenses)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>กำไรก่อน VAT</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: profitBeforeVat >= 0 ? '#6ee7b7' : '#fca5a5' }}>฿{formatMoney(profitBeforeVat)}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>เครดิตเงินคืน VAT</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: vatCredit >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                    {vatCredit > 0 ? '+' : ''}฿{formatMoney(vatCredit)}
                  </span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>กำไรคาดการณ์</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: newExpectedProfit >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                    ฿{formatMoney(newExpectedProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Row: Timeline */}
          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0, transform: 'translateY(-50%)' }}>
                <div style={{ height: '100%', background: '#6366f1', width: `${((currentStep - 1) / 3) * 100}%`, transition: 'width 0.5s ease' }}></div>
              </div>
              
              {timelineSteps.map(step => {
                const isActive = step.num <= currentStep;
                const isCurrent = step.num === currentStep;
                return (
                  <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', 
                      background: isActive ? '#6366f1' : '#1e293b', 
                      border: `2px solid ${isActive ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                      fontSize: '12px',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none'
                    }}>
                      <i className={`fa-solid ${step.icon}`}></i>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : 'rgba(255,255,255,0.5)' }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button onClick={() => window.open(`/quotation?id=${viewingQuote.id}`, '_blank')} style={{ background: 'var(--primary)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-print"></i> พิมพ์ / PDF
                  </button>
                  <button onClick={() => setViewingQuote(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>&times;</button>
                </div>
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
                       <td style={{ padding: '12px 8px' }}>
                         <div style={{ fontWeight: 600 }}>{item.desc}</div>
                         {item.sub_desc && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>- {item.sub_desc}</div>}
                         {(item.item_width || item.item_height) && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>ขนาด: กว้าง {item.item_width || '-'} ม. x สูง {item.item_height || '-'} ม.</div>}
                         {item.item_style && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>รูปแบบ: {item.item_style}</div>}
                         {item.item_spec && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>สเปค: {item.item_spec}</div>}
                       </td>
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
                <h4 style={{ marginBottom: '16px', color: isNegotiating ? 'var(--secondary)' : 'var(--primary)' }}>
                  {isNegotiating ? `ต่อราคาใบเสนอราคา (อ้างอิง ${editingQuoteId})` : editingQuoteId ? `แก้ไขใบเสนอราคา ${editingQuoteId}` : 'สร้างใบเสนอราคาใหม่'}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>นามลูกค้า</label>
                    <input type="text" value={quoteCustomerName} onChange={e => setQuoteCustomerName(e.target.value)} placeholder="ชื่อบริษัทลูกค้า" className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>วันที่</label>
                    <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>เลขประจำตัวผู้เสียภาษี</label>
                    <input type="text" value={quoteCustomerTaxId} onChange={e => setQuoteCustomerTaxId(e.target.value)} placeholder="010XXXXXXXXXX" className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>ที่อยู่</label>
                    <input type="text" value={quoteCustomerAddress} onChange={e => setQuoteCustomerAddress(e.target.value)} placeholder="ที่อยู่ลูกค้า" className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                </div>
               
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
                       <td style={{ paddingBottom: '8px', paddingRight: '8px', verticalAlign: 'top' }}>
                         <input type="text" value={item.desc} onChange={e => handleQuoteItemChange(idx, 'desc', e.target.value)} placeholder="ชื่อสินค้า/บริการ" className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)', fontWeight: 500}} />
                         {item.show_sub_desc ? (
                           <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(99,102,241,0.02)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                             <input type="text" value={item.sub_desc || ''} onChange={e => handleQuoteItemChange(idx, 'sub_desc', e.target.value)} placeholder="รายละเอียดเพิ่มเติมทั่วไป (ระบุได้มากกว่า 1 อย่าง)" className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'13px'}} />
                             <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '8px' }}>
                               <div>
                                 <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ขนาด (เมตร)</label>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                   <input type="number" step="0.01" value={item.item_width || ''} onChange={e => handleQuoteItemChange(idx, 'item_width', e.target.value)} placeholder="กว้าง" className="form-control" style={{width:'100%', padding:'6px 8px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'13px'}} />
                                   <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>x</span>
                                   <input type="number" step="0.01" value={item.item_height || ''} onChange={e => handleQuoteItemChange(idx, 'item_height', e.target.value)} placeholder="สูง" className="form-control" style={{width:'100%', padding:'6px 8px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'13px'}} />
                                 </div>
                               </div>
                               <div>
                                 <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>รูปแบบ</label>
                                 <input type="text" list="style-options" value={item.item_style || ''} onChange={e => handleQuoteItemChange(idx, 'item_style', e.target.value)} placeholder="โซ่ซ้าย/ขวา/เก็บข้าง/แยกกลาง" className="form-control" style={{width:'100%', padding:'6px 8px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'13px'}} />
                                 <datalist id="style-options">
                                   <option value="โซ่ซ้าย"></option>
                                   <option value="โซ่ขวา"></option>
                                   <option value="เก็บข้าง"></option>
                                   <option value="แยกกลาง"></option>
                                   <option value="อิสระ"></option>
                                   <option value="ปรับซ้าย"></option>
                                   <option value="ปรับขวา"></option>
                                 </datalist>
                               </div>
                               <div>
                                 <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>สเปค/รหัสสินค้า</label>
                                 <input type="text" value={item.item_spec || ''} onChange={e => handleQuoteItemChange(idx, 'item_spec', e.target.value)} placeholder="ระบุสเปค/รหัส" className="form-control" style={{width:'100%', padding:'6px 8px', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'13px'}} />
                               </div>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                               <button type="button" onClick={() => { handleQuoteItemChange(idx, 'show_sub_desc', false); handleQuoteItemChange(idx, 'sub_desc', ''); handleQuoteItemChange(idx, 'item_width', ''); handleQuoteItemChange(idx, 'item_height', ''); handleQuoteItemChange(idx, 'item_style', ''); handleQuoteItemChange(idx, 'item_spec', ''); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} title="ยกเลิกรายละเอียดเพิ่มเติม">
                                 <i className="fa-solid fa-trash-can"></i> ลบรายละเอียด
                               </button>
                             </div>
                           </div>
                         ) : (
                           <button type="button" onClick={() => handleQuoteItemChange(idx, 'show_sub_desc', true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                             <i className="fa-solid fa-list-ul"></i> เพิ่มรายละเอียด/ขนาด/สเปค
                           </button>
                         )}
                       </td>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px', verticalAlign: 'top' }}>
                         <input type="number" min="1" value={item.qty} onChange={e => handleQuoteItemChange(idx, 'qty', e.target.value)} className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)'}} />
                       </td>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px', verticalAlign: 'top' }}>
                         <input type="number" step="0.01" value={item.price} onChange={e => handleQuoteItemChange(idx, 'price', e.target.value)} className="form-control" style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid var(--border)'}} />
                       </td>
                       <td style={{ paddingBottom: '8px', paddingRight: '8px', textAlign: 'right', fontWeight: 500, verticalAlign: 'top', paddingTop: '10px' }}>
                         {formatMoney(Number(item.qty) * Number(item.price))}
                       </td>
                       <td style={{ paddingBottom: '8px', textAlign: 'right', verticalAlign: 'top', paddingTop: '8px' }}>
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
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleAddQuoteItem} style={{ background: 'rgba(99,102,241,0.1)', padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
                        <i className="fa-solid fa-plus"></i> เพิ่มรายการ
                      </button>
                      <button type="button" onClick={() => setQuoteItems([...quoteItems, { desc: 'ส่วนลดพิเศษ', qty: 1, price: 0 }])} style={{ background: 'rgba(244,63,94,0.1)', padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 500 }}>
                        <i className="fa-solid fa-tag"></i> เพิ่มส่วนลด
                      </button>
                      <button type="button" onClick={() => {
                        const targetNet = prompt('กรอกยอดชำระสุทธิที่ต้องการ:');
                        if (targetNet && !isNaN(targetNet)) {
                          const target = Number(targetNet);
                          const currentTotals = calculateQuoteTotals();
                          const diff = currentTotals.netTotal - target;
                          if (diff > 0) {
                            const ratio = (hasVat ? 1.07 : 1);
                            const discountBeforeTax = diff / ratio;
                            setQuoteItems([...quoteItems, { desc: `ส่วนลด`, qty: 1, price: -discountBeforeTax }]);
                          } else {
                            alert('ยอดชำระสุทธิที่ระบุต้องน้อยกว่ายอดเดิม');
                          }
                        }
                      }} style={{ background: 'rgba(245,158,11,0.1)', padding: '8px 16px', borderRadius: '8px', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontWeight: 500 }}>
                        <i className="fa-solid fa-calculator"></i> ปรับยอดสุทธิ
                      </button>
                    </div>
                   
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
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                       <span>(หมายเหตุ: คู่ค้าหัก ณ ที่จ่าย {whtRate}%)</span>
                       <span>-฿{formatMoney(formWhtAmount)}</span>
                     </div>
                   )}
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid var(--border)', fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>
                     <span>ยอดรวมทั้งสิ้น:</span>
                     <span>฿{formatMoney(formNetTotal)}</span>
                   </div>
                 </div>
               </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                 <button type="button" onClick={resetQuoteForm} className="btn-outline" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>ยกเลิก</button>
                 
                 {isNegotiating ? (
                    <button type="button" onClick={(e) => handleCreateOrUpdateQuote(e, true)} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: 'var(--secondary)', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกการต่อราคา (สร้างใหม่)</button>
                  ) : editingQuoteId ? (
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

          {/* PO Modal */}
          {showPOModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
              <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>ระบุใบสั่งซื้อ (PO Number)</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  กรุณาระบุเลขที่ใบสั่งซื้อเพื่อใช้อ้างอิงในเอกสาร หากไม่มีสามารถเว้นว่างไว้ได้
                </p>
                <form onSubmit={submitApproveQuote}>
                  <div style={{ marginBottom: '24px' }}>
                    <input 
                      type="text" 
                      value={poInputValue} 
                      onChange={(e) => setPoInputValue(e.target.value)}
                      placeholder="เช่น PO-2026-001"
                      autoFocus
                      className="form-control"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => setShowPOModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: 'var(--text-main)' }}>
                      ยกเลิก
                    </button>
                    <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 500, boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                      ยืนยันอนุมัติ
                    </button>
                  </div>
                </form>
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
                    <button onClick={() => window.open(`/quotation?id=${q.id}`, '_blank')} style={{ background: 'none', color: '#6366f1', border: 'none', padding: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '14px' }} title="พิมพ์ / บันทึก PDF">
                      <i className="fa-solid fa-print"></i>
                    </button>
                    <button onClick={() => {setViewingQuote(q); setShowQuoteForm(false);}} style={{ background: 'none', color: 'var(--primary)', border: 'none', padding: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '14px' }} title="ดูรายละเอียด">
                      <i className="fa-regular fa-eye"></i>
                    </button>
                    {q.status === 'รอพิจารณา' && !isApproved && (
                      <>
                        <button onClick={() => handleApproveQuoteClick(q.id)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '12px' }} title="อนุมัติใบเสนอราคานี้">
                          <i className="fa-solid fa-check"></i>
                        </button>
                        <button onClick={() => handleNegotiateQuote(q)} style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '4px', fontSize: '12px' }} title="ต่อราคา (สร้างฉบับใหม่)">
                          <i className="fa-solid fa-handshake"></i> ต่อราคา
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
             <form onSubmit={(e) => { e.preventDefault(); handleCreateInvoice(selectedQuoteForInvoice, invoiceAmount); setShowInvoiceForm(false); setInvoicePercentage(''); setInvoiceAmount(''); }} style={{ background: 'rgba(99,102,241,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                 <div style={{flex: 2}}>
                   <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>อ้างอิงใบเสนอราคา</label>
                   <select required value={selectedQuoteForInvoice} onChange={e=>{setSelectedQuoteForInvoice(e.target.value); setInvoicePercentage(''); setInvoiceAmount('');}} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}}>
                     <option value="">-- เลือกใบเสนอราคาที่อนุมัติ --</option>
                     {quotations.filter(q => q.status === 'อนุมัติแล้ว').map(q => <option key={q.id} value={q.id}>{q.id} - ยอดเต็ม ฿{formatMoney(Number(q.total_amount))}</option>)}
                   </select>
                 </div>
                 <div style={{flex: 1}}>
                   <label style={{display:'block', marginBottom:'8px', fontSize:'13px', fontWeight:500}}>เรียกเก็บเป็น % (ไม่บังคับ)</label>
                   <input type="number" step="0.01" min="0" max="100" value={invoicePercentage} onChange={handlePercentageChange} placeholder="เช่น 50" disabled={!selectedQuoteForInvoice} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
                 </div>
                 <div style={{flex: 1}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', alignItems:'center'}}>
                      <label style={{display:'block', fontSize:'13px', fontWeight:500, margin:0}}>ยอดเรียกเก็บ (บาท)</label>
                      {selectedQuoteForInvoice && remainingAmountForInvoice > 0 && (
                        <span 
                          onClick={() => {
                            setInvoiceAmount(remainingAmountForInvoice);
                            setInvoicePercentage('');
                          }} 
                          style={{fontSize:'12px', color:'var(--primary)', cursor:'pointer', textDecoration:'underline'}}
                        >
                          ยอดคงเหลือทั้งหมด
                        </span>
                      )}
                    </div>
                   <input type="number" step="0.01" value={invoiceAmount} onChange={handleInvoiceAmountChange} required disabled={!selectedQuoteForInvoice} className="form-control" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}} />
                 </div>
               </div>
               
               {selectedQuoteForInvoice && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', gap: '24px' }}>
                     <div>
                       <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ยอดรวมใบเสนอราคา</div>
                       <div style={{ fontWeight: 600 }}>฿{formatMoney(quoteTotalForInvoice)}</div>
                     </div>
                     <div>
                       <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>เรียกเก็บไปแล้ว</div>
                       <div style={{ fontWeight: 600, color: 'var(--primary)' }}>฿{formatMoney(billedAmountForInvoice)}</div>
                     </div>
                     <div>
                       <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ยอดคงเหลือที่เรียกเก็บได้</div>
                       <div style={{ fontWeight: 600, color: remainingAmountForInvoice > 0 ? 'var(--secondary)' : 'var(--danger)' }}>฿{formatMoney(remainingAmountForInvoice)}</div>
                     </div>
                   </div>
                   <button type="submit" disabled={remainingAmountForInvoice < 0} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: remainingAmountForInvoice < 0 ? '#cbd5e1' : 'var(--primary)', cursor: remainingAmountForInvoice < 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>ออกใบแจ้งหนี้</button>
                 </div>
               )}
               {!selectedQuoteForInvoice && (
                 <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                   <button type="submit" disabled style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', color: 'white', background: '#cbd5e1', cursor: 'not-allowed', fontWeight: 'bold' }}>ออกใบแจ้งหนี้</button>
                 </div>
               )}
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
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                          <button onClick={() => window.open(`/invoice?id=${b.invoice.id}`, '_blank')} style={{ background: 'none', color: '#6366f1', border: 'none', padding: '0', cursor: 'pointer', fontSize: '14px' }} title="พิมพ์ / บันทึก PDF (ใบแจ้งหนี้)">
                            <i className="fa-solid fa-print"></i>
                          </button>
                          <button onClick={() => window.open(`/invoice?id=${b.receipt.id}`, '_blank')} style={{ background: 'none', color: '#6366f1', border: 'none', padding: '0', cursor: 'pointer', fontSize: '14px' }} title="พิมพ์ / บันทึก PDF (ใบเสร็จรับเงิน)">
                            <i className="fa-solid fa-print"></i>
                          </button>
                        </div>
                      </td>
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
                          background: b.status.startsWith('รับเงินแล้ว') || b.status === 'ชำระแล้ว' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                          color: b.status.startsWith('รับเงินแล้ว') || b.status === 'ชำระแล้ว' ? 'var(--secondary)' : 'var(--warning)', 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                        }}>
                          {b.status.split(' (')[0]}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => window.open(`/invoice?id=${b.id}`, '_blank')} style={{ background: 'none', color: '#6366f1', border: 'none', padding: '6px', cursor: 'pointer', marginRight: '8px', fontSize: '14px' }} title="พิมพ์ / บันทึก PDF">
                          <i className="fa-solid fa-print"></i>
                        </button>
                        {b.type === 'invoice' && b.status === 'รอชำระเงิน' && (
                          <button onClick={() => openReceivePaymentModal(b)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
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
                <th>บัญชีที่จ่าย</th>
                <th style={{ textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>ยังไม่มีค่าใช้จ่าย</td></tr> : null}
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
                  <td style={{ color: 'var(--text-muted)' }}>
                    {e.payerName ? (
                      <span style={{ color: 'var(--warning)', fontWeight: 500 }}><i className="fa-solid fa-wallet"></i> {e.payerName}</span>
                    ) : (
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}><i className="fa-solid fa-wallet"></i> {project?.internal_accounts?.name || '-'}</span>
                    )}
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

      {showReceiveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>รับชำระเงิน ({receiveInv?.id})</h3>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>วันที่ลูกค้าโอนเงิน</label>
              <input type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>

            <div style={{ marginBottom: '16px', background: 'var(--bg-light)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span>ยอดที่เรียกเก็บ (Gross):</span>
                <span>
                  <input type="number" value={receiveGross} disabled style={{ width: '100px', textAlign: 'right', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-light)', color: 'var(--text-muted)', fontWeight: 'bold' }} />
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px', color: receiveWhtRate > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                <span>
                  หัก ณ ที่จ่าย (WHT):
                  <select value={receiveWhtRate} onChange={e => handleReceiveWhtRateChange(Number(e.target.value))} style={{ marginLeft: '8px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <option value={0}>0% (ไม่หัก)</option>
                    <option value={1}>1%</option>
                    <option value={3}>3%</option>
                    <option value={5}>5%</option>
                  </select>
                </span>
                <span>-{formatMoney(receiveWht)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)', color: '#10b981' }}>
                <span>ยอดเงินที่ได้รับจริง (Net):</span>
                <span>
                  <input type="number" step="0.01" value={receiveNet} onChange={e => handleReceiveNetChange(e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '4px', border: '1px solid #10b981', borderRadius: '4px', fontWeight: 'bold', color: '#10b981' }} placeholder="0.00" />
                </span>
              </div>
              {receiveBankFee !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px', color: receiveBankFee > 0 ? 'var(--warning)' : 'var(--danger)' }}>
                  <span>{receiveBankFee > 0 ? 'ค่าธรรมเนียมธุรกรรม (ส่วนต่าง):' : 'ยอดเงินเกิน (ส่วนต่าง):'}</span>
                  <span>{receiveBankFee > 0 ? '-' : '+'}฿{formatMoney(Math.abs(receiveBankFee))}</span>
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>* ส่วนต่างค่าธรรมเนียมจะถูกบันทึกเป็นรายจ่ายอัตโนมัติ</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={() => setShowReceiveModal(false)} className="btn-outline" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>ยกเลิก</button>
              <button type="button" onClick={submitReceivePayment} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
                ยืนยันการรับเงิน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
