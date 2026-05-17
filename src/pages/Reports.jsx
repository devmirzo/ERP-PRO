import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Download, Filter, Search, Plus, FileDown, Table, Archive, Trash2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Loader } from '../components/Loader';

export const Reports = () => {
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        rep_id: `REP-${Math.floor(Math.random() * 10000)}`,
        name: formData.name,
        type: formData.type,
        format: formData.format === 'PDF Hujjat' ? 'PDF' : 'Excel',
        size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB` // Taxminiy hajm
      };

      const { error } = await supabase.from('reports').insert([payload]);
      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: '', type: 'Moliyaviy Hisobot', format: 'PDF Hujjat' });
      fetchReports();
    } catch (error) {
      console.error(error);
      alert("Saqlashda xatolik yuz berdi!");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Bu hisobotni arxivdan butunlay o'chirmoqchimisiz?")) {
      try {
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) throw error;
        fetchReports();
      } catch (error) {
        console.error(error);
        alert("O'chirishda xatolik!");
      }
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
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi Hisobot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {generateCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button key={idx} onClick={() => { setFormData(prev => ({...prev, type: card.type, name: `${card.type} (Joriy oy)`})); setIsModalOpen(true); }} className="text-left bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
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
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Yuklab olish"><Download className="w-4 h-4"/></button>
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
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Masalan: Yillik Moliya Sarhisobi"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hisobot Turi (Kategoriya)</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm">
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