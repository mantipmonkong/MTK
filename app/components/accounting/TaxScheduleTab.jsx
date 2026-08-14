"use client";
import { useState } from 'react';

export default function TaxScheduleTab() {
  // Using August as current month in the example screenshots
  const currentMonth = 7; // 0-indexed (August)
  
  const [tasks, setTasks] = useState([
    { id: 1, type: 'monthly', date: 7, title: 'ยื่นเอกสารให้สำนักงานบัญชี', desc: 'ส่งใบกำกับภาษีซื้อ/ขาย, สลิปเงินเดือน, Statement ของเดือนก่อนหน้า', isDone: true, monthFixed: false },
    { id: 2, type: 'monthly', date: 15, title: 'ส่งประกันสังคม (สปส.1-10)', desc: 'นำส่งเงินสมทบ ของเดือนก่อนหน้า', isDone: false, monthFixed: false },
    { id: 3, type: 'monthly', date: 15, title: 'ส่ง ภ.ง.ด.1', desc: 'ภาษีหัก ณ ที่จ่าย เงินเดือนพนักงาน ของเดือนก่อนหน้า', isDone: false, monthFixed: false },
    { id: 4, type: 'monthly', date: 15, title: 'ส่ง ภ.ง.ด.3/53', desc: 'ภาษีหัก ณ ที่จ่าย ค่าเช่า ของเดือนก่อนหน้า', isDone: false, monthFixed: false },
    { id: 5, type: 'monthly', date: 23, title: 'ส่ง ภ.พ.30 (VAT)', desc: 'สรุป VAT ขาย - VAT ซื้อ ของเดือนก่อนหน้า', isDone: false, monthFixed: false },
    
    { id: 6, type: 'yearly', date: 28, month: 1, title: 'ยื่น ภ.ง.ด.1ก', desc: 'สรุปเงินเดือนพนักงานทุกคนทั้งปี', isDone: false, monthFixed: true },
    { id: 7, type: 'yearly', date: 30, month: 3, title: 'ยื่น ภ.ง.ด.90/91 (บุคคล)', desc: 'ภาษีเงินได้บุคคลธรรมดา', isDone: false, monthFixed: true },
    { id: 8, type: 'yearly', date: 30, month: 3, title: 'จัดประชุม AGM', desc: 'ประชุมใหญ่สามัญผู้ถือหุ้น ภายใน 30 เม.ย.', isDone: false, monthFixed: true },
    { id: 9, type: 'yearly', date: 31, month: 4, title: 'ส่งงบการเงิน', desc: 'ส่งให้กรมพัฒนาธุรกิจการค้า + ยื่น ภ.ง.ด.50', isDone: false, monthFixed: true },
    { id: 10, type: 'yearly', date: 31, month: 7, title: 'ยื่น ภ.ง.ด.51', desc: 'ภาษีนิติบุคคลครึ่งปี (ม.ค.-มิ.ย.)', isDone: false, monthFixed: true }
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t));
  };

  const getMonthName = (mIdx) => {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return months[mIdx];
  };

  const renderTask = (task) => {
    const isPast = !task.monthFixed && task.date < new Date().getDate(); // Simplified logic
    const monthName = task.monthFixed ? getMonthName(task.month) : getMonthName(currentMonth);
    
    // Determine colors
    let dateBg = '#f1f5f9';
    let dateColor = '#64748b';
    if (task.isDone) {
      dateBg = '#d1fae5';
      dateColor = '#10b981';
    } else if (isPast) {
      dateBg = '#fee2e2';
      dateColor = '#ef4444';
    } else {
      dateBg = '#e0e7ff';
      dateColor = '#6366f1';
    }

    return (
      <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ background: dateBg, color: dateColor, borderRadius: '12px', width: '60px', height: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{task.date}</span>
          <span style={{ fontSize: '11px' }}>{monthName}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <i className="fa-solid fa-file-lines" style={{ color: '#94a3b8' }}></i>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>{task.title}</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{task.desc}</div>
        </div>
        <div>
          {task.isDone ? (
            <button onClick={() => toggleTask(task.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#e2e8f0', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <i className="fa-solid fa-check"></i> เสร็จสิ้น
            </button>
          ) : (
            <button onClick={() => toggleTask(task.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}>
              ส่งสรรพากร
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleExportSchedule = () => {
    let csv = 'วันที่,หมวดหมู่,รายการ,รายละเอียด,สถานะ\n';
    tasks.forEach(t => {
      const monthName = t.monthFixed ? getMonthName(t.month) : getMonthName(currentMonth);
      const status = t.isDone ? 'เสร็จสิ้นแล้ว' : 'รอส่งสรรพากร/รอดำเนินการ';
      const type = t.type === 'monthly' ? 'ประจำเดือน' : 'ประจำปี';
      csv += `"${t.date} ${monthName}","${type}","${t.title}","${t.desc}","${status}"\n`;
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tax_schedule_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={handleExportSchedule} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
          <i className="fa-solid fa-file-excel"></i> EXPORT ข้อมูล (CSV)
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Monthly Tasks */}
        <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <i className="fa-solid fa-clipboard-list" style={{ color: '#f59e0b' }}></i> รายการที่ต้องทำเดือนนี้
        </h3>
        <div>
          {tasks.filter(t => t.type === 'monthly').map(renderTask)}
        </div>
      </div>

      {/* Yearly Tasks */}
      <div className="data-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <i className="fa-solid fa-thumbtack" style={{ color: '#ef4444' }}></i> งานประจำปี
        </h3>
        <div>
          {tasks.filter(t => t.type === 'yearly').map(renderTask)}
        </div>
      </div>

    </div>
  </div>
  );
}
