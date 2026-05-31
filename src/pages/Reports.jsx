import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Download, Filter, Search, Plus, FileDown, Table, Archive, Trash2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Loader } from '../components/Loader';
import { useNotification } from '../context/NotificationContext';

export const Reports = () => {
  const { showNotification } = useNotification();
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('Barchasi');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Moliyaviy Hisobot',
    format: 'PDF Hujjat'
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('reports').select('*').order('date', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // If type is changed, suggest a default name matching the month
      if (name === 'type') {
        const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
        const currentMonth = months[new Date().getMonth()];
        updated.name = `${value} (${currentMonth})`;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        rep_id: `REP-${Math.floor(Math.random() * 90000) + 10000}`,
        name: formData.name,
        type: formData.type,
        format: formData.format === 'PDF Hujjat' ? 'PDF' : 'Excel',
        size: `${(Math.random() * 3 + 0.2).toFixed(1)} MB`
      };

      const { error } = await supabase.from('reports').insert([payload]);
      if (error) throw error;

      showNotification("Hisobot muvaffaqiyatli yaratildi va saqlandi!", "success");
      setIsModalOpen(false);
      setFormData({ name: '', type: 'Moliyaviy Hisobot', format: 'PDF Hujjat' });
      fetchReports();
    } catch (error) {
      console.error(error);
      showNotification("Saqlashda xatolik yuz berdi!", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu hisobotni arxivdan butunlay o'chirmoqchimisiz?")) {
      try {
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) throw error;
        showNotification("Hisobot muvaffaqiyatli o'chirildi!", "success");
        fetchReports();
      } catch (error) {
        console.error(error);
        showNotification("O'chirishda xatolik yuz berdi!", "error");
      }
    }
  };

  const handleDownload = async (rep) => {
    try {
      showNotification(`${rep.name} yuklab olish uchun tayyorlanmoqda...`, "info");
      
      let data = [];
      let csvContent = "";
      let title = rep.name;

      if (rep.type === 'Moliyaviy Hisobot') {
        const { data: sales, error } = await supabase
          .from('sales')
          .select(`
            id,
            invoice_id,
            date,
            amount,
            status,
            clients (company_name),
            employees (name)
          `)
          .order('date', { ascending: false });
        if (error) throw error;

        if (rep.format === 'Excel') {
          csvContent = "Sana,Tranzaksiya ID,Mijoz,Sotuvchi,Summa (so'm),Holati\n";
          let total = 0;
          sales?.forEach(s => {
            const amt = Number(s.amount) || 0;
            total += amt;
            csvContent += `"${new Date(s.date).toLocaleDateString()}","${s.invoice_id || s.id}","${s.clients?.company_name || 'Noma\'lum'}","${s.employees?.name || 'Admin'}",${amt},"${s.status}"\n`;
          });
          csvContent += `\n,,,JAMI:,${total},\n`;
        } else {
          data = sales || [];
        }
      } 
      else if (rep.type === 'Ombor Qoldig\'i') {
        const { data: items, error } = await supabase
          .from('inventory')
          .select('*')
          .order('stock_level', { ascending: true });
        if (error) throw error;

        if (rep.format === 'Excel') {
          csvContent = "SKU,Mahsulot Nomi,Kategoriya,Qoldiq,O'lchov,Narxi (so'm),Jami Qiymati,Holati\n";
          let totalVal = 0;
          items?.forEach(i => {
            const qty = Number(i.stock_level) || 0;
            const prc = Number(i.price) || 0;
            const val = qty * prc;
            totalVal += val;
            csvContent += `"${i.sku}","${i.name}","${i.category}",${qty},"${i.unit || 'kg'}",${prc},${val},"${qty > 50 ? 'Yetarli' : qty > 0 ? 'Kam qolgan' : 'Tugagan'}"\n`;
          });
          csvContent += `\n,,,,,JAMI QIYMATI:,${totalVal},\n`;
        } else {
          data = items || [];
        }
      }
      else if (rep.type === 'Sotuvlar Tahlili') {
        const { data: sales, error } = await supabase
          .from('sales')
          .select(`
            id,
            invoice_id,
            date,
            amount,
            quantity,
            payment_method,
            clients (company_name),
            inventory (name)
          `)
          .order('date', { ascending: false });
        if (error) throw error;

        if (rep.format === 'Excel') {
          csvContent = "Mijoz,Sotilgan Mahsulot,Miqdori,Tranzaksiya Summasi,To'lov Turi,Sana\n";
          sales?.forEach(s => {
            csvContent += `"${s.clients?.company_name || 'Noma\'lum'}","${s.inventory?.name || 'Noma\'lum'}",${s.quantity || 0},${Number(s.amount) || 0},"${s.payment_method || 'Naqd'}","${new Date(s.date).toLocaleDateString()}"\n`;
          });
        } else {
          data = sales || [];
        }
      }
      else if (rep.type === 'Xodimlar Vaqti') {
        const { data: employees, error: empErr } = await supabase.from('employees').select('*');
        const { data: sales, error: salesErr } = await supabase.from('sales').select('employee_id, amount');
        if (empErr) throw empErr;
        if (salesErr) throw salesErr;

        const empKpi = employees.map(emp => {
          const empSales = sales?.filter(s => s.employee_id === emp.id) || [];
          const count = empSales.length;
          const totalVal = empSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          return { ...emp, count, totalVal };
        });

        if (rep.format === 'Excel') {
          csvContent = "Xodim ID,Ismi,Bo'limi,Roli,Asosiy Maosh (so'm),Sotuvlar Soni,Jami Savdo Hajmi (so'm),Holati\n";
          empKpi.forEach(e => {
            csvContent += `"${e.emp_id}","${e.name}","${e.department}","${e.role}",${Number(e.base_salary) || 0},${e.count},${e.totalVal},"${e.status}"\n`;
          });
        } else {
          data = empKpi;
        }
      }

      // ----------------------------------------------------
      // DOWNLOAD TRIGGERS
      // ----------------------------------------------------
      if (rep.format === 'Excel') {
        // Universal Excel-friendly UTF-8 CSV (with BOM prefix \ufeff)
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Excel hisoboti muvaffaqiyatli yuklab olindi!", "success");
      } else {
        // Generate beautiful HTML print layout for PDF
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          showNotification("Iltimos, popup oynalarga ruxsat bering!", "warning");
          return;
        }

        let tableRows = "";
        let summaryHtml = "";

        if (rep.type === 'Moliyaviy Hisobot') {
          let total = 0;
          data.forEach(s => {
            const amt = Number(s.amount) || 0;
            total += amt;
            tableRows += `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${new Date(s.date).toLocaleDateString()}</td>
                <td style="padding: 10px;">${s.invoice_id || s.id}</td>
                <td style="padding: 10px; font-weight: bold;">${s.clients?.company_name || 'Noma\'lum'}</td>
                <td style="padding: 10px;">${s.employees?.name || 'Admin'}</td>
                <td style="padding: 10px; font-weight: bold; color: #1e3a8a;">${amt.toLocaleString()} so'm</td>
                <td style="padding: 10px;"><span style="background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${s.status}</span></td>
              </tr>
            `;
          });
          summaryHtml = `<div style="text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold;">Jami Tushum: <span style="color: #2563eb;">${total.toLocaleString()} so'm</span></div>`;
        } 
        else if (rep.type === 'Ombor Qoldig\'i') {
          let totalValue = 0;
          data.forEach(i => {
            const qty = Number(i.stock_level) || 0;
            const prc = Number(i.price) || 0;
            const val = qty * prc;
            totalValue += val;
            tableRows += `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${i.sku}</td>
                <td style="padding: 10px; font-weight: bold;">${i.name}</td>
                <td style="padding: 10px;">${i.category}</td>
                <td style="padding: 10px; font-weight: bold; color: #d97706;">${qty} ${i.unit || 'kg'}</td>
                <td style="padding: 10px;">${prc.toLocaleString()} so'm</td>
                <td style="padding: 10px; font-weight: bold; color: #1e3a8a;">${val.toLocaleString()} so'm</td>
              </tr>
            `;
          });
          summaryHtml = `<div style="text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold;">Jami Ombor Qiymati: <span style="color: #059669;">${totalValue.toLocaleString()} so'm</span></div>`;
        }
        else if (rep.type === 'Sotuvlar Tahlili') {
          data.forEach(s => {
            tableRows += `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold;">${s.clients?.company_name || 'Noma\'lum'}</td>
                <td style="padding: 10px;">${s.inventory?.name || 'Noma\'lum'}</td>
                <td style="padding: 10px; font-weight: bold;">${s.quantity || 0} dona</td>
                <td style="padding: 10px; font-weight: bold; color: #1e3a8a;">${(Number(s.amount) || 0).toLocaleString()} so'm</td>
                <td style="padding: 10px;">${s.payment_method || 'Naqd'}</td>
                <td style="padding: 10px;">${new Date(s.date).toLocaleDateString()}</td>
              </tr>
            `;
          });
        }
        else if (rep.type === 'Xodimlar Vaqti') {
          data.forEach(e => {
            tableRows += `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${e.emp_id}</td>
                <td style="padding: 10px; font-weight: bold;">${e.name}</td>
                <td style="padding: 10px;">${e.department}</td>
                <td style="padding: 10px;">${e.role}</td>
                <td style="padding: 10px;">${(Number(e.base_salary) || 0).toLocaleString()} so'm</td>
                <td style="padding: 10px; font-weight: bold; color: #059669;">${e.count} ta</td>
                <td style="padding: 10px; font-weight: bold; color: #1e3a8a;">${e.totalVal.toLocaleString()} so'm</td>
              </tr>
            `;
          });
        }

        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; padding: 40px; line-height: 1.5; }
                .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 24px; font-weight: 800; color: #1e3a8a; }
                .report-title { font-size: 18px; font-weight: 600; color: #475569; margin-top: 5px; }
                .meta { font-size: 12px; color: #94a3b8; margin-top: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; text-align: left; }
                th { background-color: #f8fafc; color: #475569; padding: 12px 10px; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
                td { padding: 12px 10px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="company-name">ERP PRO LLC</div>
                <div class="report-title">${title} (${rep.type})</div>
                <div class="meta">Yaratilgan sana: ${new Date(rep.date).toLocaleString()} | Operator: Tizim Admiri</div>
              </div>
              <table>
                <thead>
                  <tr>
                    ${rep.type === 'Moliyaviy Hisobot' ? '<th>Sana</th><th>Tranzaksiya ID</th><th>Mijoz</th><th>Sotuvchi</th><th>Summa</th><th>Holati</th>' :
                      rep.type === "Ombor Qoldig'i" ? '<th>SKU</th><th>Mahsulot Nomi</th><th>Kategoriya</th><th>Qoldiq</th><th>Narxi</th><th>Jami Qiymati</th>' :
                      rep.type === "Sotuvlar Tahlili" ? '<th>Mijoz</th><th>Sotilgan Mahsulot</th><th>Miqdori</th><th>Summa</th><th>To\'lov turi</th><th>Sana</th>' :
                      '<th>Xodim ID</th><th>Ismi</th><th>Bo\'limi</th><th>Roli</th><th>Maosh</th><th>Sotuvlari Soni</th><th>Jami Savdosi</th>'}
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
              ${summaryHtml}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        showNotification("PDF chop etish oynasi ochildi!", "success");
      }

    } catch (error) {
      console.error(error);
      showNotification("Hisobotni yuklab olishda xatolik yuz berdi!", "error");
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(rep => {
      const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFormat = filterFormat === 'Barchasi' || rep.format === filterFormat;
      return matchesSearch && matchesFormat;
    });
  }, [reports, searchTerm, filterFormat]);

  const generateCards = [
    { type: 'Moliyaviy Hisobot', icon: DollarSignIcon, color: 'text-blue-600', bg: 'bg-blue-100', desc: 'Kirim, chiqim va foyda' },
    { type: 'Ombor Qoldig\'i', icon: PackageIcon, color: 'text-emerald-600', bg: 'bg-emerald-100', desc: 'Mavjud barcha tovarlar' },
    { type: 'Sotuvlar Tahlili', icon: TrendingUpIcon, color: 'text-amber-600', bg: 'bg-amber-100', desc: 'Xaridorlar va hajmlar' },
    { type: 'Xodimlar Vaqti', icon: UsersIcon, color: 'text-purple-600', bg: 'bg-purple-100', desc: 'KPI va ish davomiyligi' },
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hisobotlar va Tahlil</h1>
          <p className="text-sm text-slate-500 mt-1">Avtomatlashtirilgan hujjatlar va PDF/Excel generatsiya</p>
        </div>
        <button onClick={() => {
          const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
          const currentMonth = months[new Date().getMonth()];
          setFormData({ name: `Moliyaviy Hisobot (${currentMonth})`, type: 'Moliyaviy Hisobot', format: 'PDF Hujjat' });
          setIsModalOpen(true);
        }} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi Hisobot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {generateCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button key={idx} onClick={() => { 
              const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
              const currentMonth = months[new Date().getMonth()];
              setFormData({type: card.type, name: `${card.type} (${currentMonth})`, format: 'PDF Hujjat'}); 
              setIsModalOpen(true); 
            }} className="text-left bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{card.type}</h3>
              <p className="text-xs text-slate-500">{card.desc}</p>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Hujjat nomini qidirish..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-slate-400" />
            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} className="w-full sm:w-auto py-2 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm">
              <option value="Barchasi">Barcha formatlar</option>
              <option value="PDF">Faqat PDF</option>
              <option value="Excel">Faqat Excel</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hujjat Nomi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Turi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Format / Hajm</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Yaratilgan Vaqt</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {loading ? (
                 <Loader variant="table" colSpan={5} text="Hisobotlar yuklanmoqda..." />
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                  <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" /> Hujjatlar arxivi bo'sh
                </td></tr>
              ) : (
                filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {rep.format === 'PDF' ? <FileDown className="w-5 h-5 text-red-500" /> : <Table className="w-5 h-5 text-emerald-500" />}
                        <span className="text-sm font-bold text-slate-800">{rep.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{rep.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${rep.format === 'PDF' ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'}`}>{rep.format}</span>
                        <span className="text-xs text-slate-400 font-medium">{rep.size}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(rep.date).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDownload(rep)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Yuklab olish"><Download className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(rep.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="O'chirish"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600"/> Yangi Hisobot Yaratish
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hisobot Nomi</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="Masalan: Yillik Moliya Sarhisobi"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hisobot Turi (Kategoriya)</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer">
                  {generateCards.map((c, i) => <option key={i} value={c.type}>{c.type}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Qaysi formatda saqlansin?</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${formData.format === 'PDF Hujjat' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="format" value="PDF Hujjat" checked={formData.format === 'PDF Hujjat'} onChange={handleChange} className="sr-only" />
                    <FileDown className={`w-8 h-8 ${formData.format === 'PDF Hujjat' ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${formData.format === 'PDF Hujjat' ? 'text-red-700' : 'text-slate-600'}`}>PDF Hujjat</span>
                  </label>
                  
                  <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${formData.format === 'Excel Jadval' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="format" value="Excel Jadval" checked={formData.format === 'Excel Jadval'} onChange={handleChange} className="sr-only" />
                    <Table className={`w-8 h-8 ${formData.format === 'Excel Jadval' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${formData.format === 'Excel Jadval' ? 'text-emerald-700' : 'text-slate-600'}`}>Excel Jadval</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Bekor qilish</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Icons
function DollarSignIcon(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> }
function PackageIcon(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> }
function TrendingUpIcon(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> }
function UsersIcon(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> }