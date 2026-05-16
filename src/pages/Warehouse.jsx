import React, { useState, useMemo, useEffect } from 'react';
import { Warehouse as WarehouseIcon, Search, Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft, X, CheckCircle2, History } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Vaqtincha Zonalar ma'lumotlari (buni qattiq qoldiramiz)
const zones = [
  { id: 'A', name: 'A-Zona ("Quruq meva 1-sort")', capacity: 1000, current: 750, color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-500' },
  { id: 'B', name: 'B-Zona ("Quruq meva 2-sort")', capacity: 800, current: 420, color: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-500' },
  { id: 'C', name: 'C-Zona ("Don don")', capacity: 2000, current: 1850, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' },
  { id: 'D', name: 'D-Zona ("Ho\"l meva 1-sort")', capacity: 2000, current: 1850, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' },
  { id: 'E', name: 'E-Zona ("Ho\"l meva 2-sort")', capacity: 2000, current: 1850, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' },
  { id: 'F', name: 'F-Zona ("Ho\"l meva 3-sort")', capacity: 2000, current: 1850, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' },
];

export const Warehouse = () => {
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Kirim'); // Kirim, Chiqim, Ko'chirish
  const [formData, setFormData] = useState({
    inventory_id: '',
    zone: 'A-Zona (Elektronika)',
    quantity: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Inventory
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('id, name, stock_level');
      if (invError) throw invError;
      setInventory(invData || []);
      
      if (invData && invData.length > 0) {
        setFormData(prev => ({ ...prev, inventory_id: invData[0].id }));
      }

      // Fetch Transactions
      const { data: transData, error: transError } = await supabase
        .from('warehouse_transactions')
        .select(`
          *,
          inventory (
            name
          )
        `)
        .order('date', { ascending: false });
      if (transError) throw transError;
      setTransactions(transData || []);
      
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'Kirim': return <ArrowDownRight className="w-4 h-4 text-emerald-600" />;
      case 'Chiqim': return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'Ko\'chirish': return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const month = months[now.getMonth()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.inventory_id) return alert("Iltimos mahsulotni tanlang!");
    
    const qty = parseInt(formData.quantity);
    if (!qty || qty <= 0) return alert("Miqdorni to'g'ri kiriting!");

    // Check inventory stock if it's Chiqim or Ko'chirish
    const selectedProduct = inventory.find(i => i.id === formData.inventory_id);
    if ((activeTab === 'Chiqim' || activeTab === 'Ko\'chirish') && selectedProduct && qty > selectedProduct.stock_level) {
       return alert(`Xatolik! Omborda faqat ${selectedProduct.stock_level} ta qolgan.`);
    }

    try {
      // 1. Transaction saqlash
      const newTransaction = {
        transaction_id: `TRN-2026-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        type: activeTab,
        inventory_id: formData.inventory_id,
        zone: formData.zone,
        quantity: qty
      };

      const { error: transError } = await supabase
        .from('warehouse_transactions')
        .insert([newTransaction]);
      
      if (transError) throw transError;

      // 2. Inventory stock update
      if (activeTab === 'Kirim') {
         await supabase.from('inventory').update({ stock_level: selectedProduct.stock_level + qty }).eq('id', formData.inventory_id);
      } else if (activeTab === 'Chiqim') {
         await supabase.from('inventory').update({ stock_level: selectedProduct.stock_level - qty }).eq('id', formData.inventory_id);
      }
      
      setIsModalOpen(false);
      setFormData({ inventory_id: inventory[0]?.id || '', zone: 'A-Zona (Elektronika)', quantity: '' });
      fetchData(); // Refresh all
      
    } catch (error) {
       console.error("Error saving transaction:", error.message);
       alert("Saqlashda xatolik yuz berdi!");
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.inventory?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ombor Boshqaruvi</h1>
          <p className="text-sm text-slate-500 mt-1">Zonalar bandligi va yuk aylanmasi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setActiveTab('Kirim'); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors text-sm font-medium">
            <ArrowDownRight className="w-4 h-4" /> Yuk Qabul Qilish (Kirim)
          </button>
          <button onClick={() => { setActiveTab('Chiqim'); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors text-sm font-medium">
            <ArrowUpRight className="w-4 h-4" /> Yuk Chiqim Qilish
          </button>
          <button onClick={() => { setActiveTab('Ko\'chirish'); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
            <ArrowRightLeft className="w-4 h-4" /> Ko'chirish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {zones.map((zone) => {
          const percentage = Math.round((zone.current / zone.capacity) * 100);
          let statusColor = zone.bar;
          if (percentage > 90) statusColor = 'bg-red-500';
          else if (percentage > 60) statusColor = 'bg-amber-500';

          return (
            <div key={zone.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${zone.bg} ${zone.color}`}>
                    {zone.id}
                  </div>
                  <h3 className="font-bold text-slate-800">{zone.name}</h3>
                </div>
                <WarehouseIcon className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Bandlik holati: <span className="text-slate-900 font-bold">{percentage}%</span></span>
                  <span className="text-slate-500 font-medium">{zone.current} / {zone.capacity} joy</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${statusColor}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            So'nggi Operatsiyalar
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="ID yoki mahsulot qidirish..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tranzaksiya ID / Sana</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operatsiya Turi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mahsulot Nomi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Zona (Hudud)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Miqdori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Yuklanmoqda...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Hech qanday tranzaksiya topilmadi</td></tr>
              ) : (
                filteredTransactions.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 mb-0.5">{tr.transaction_id}</div>
                      <div className="text-xs text-slate-500">{new Date(tr.date).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border
                        ${tr.type === 'Kirim' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          tr.type === 'Chiqim' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-blue-50 text-blue-700 border-blue-200'}`}
                      >
                        {getTransactionIcon(tr.type)} {tr.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{tr.inventory?.name || 'Noma\'lum'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{tr.zone}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold 
                      ${tr.type === 'Kirim' ? 'text-emerald-600' : tr.type === 'Chiqim' ? 'text-red-600' : 'text-blue-600'}`}>
                      {tr.type === 'Kirim' ? '+' : tr.type === 'Chiqim' ? '-' : ''}{tr.quantity} ta
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
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between
              ${activeTab === 'Kirim' ? 'bg-emerald-50' : activeTab === 'Chiqim' ? 'bg-red-50' : 'bg-blue-50'}`}
            >
              <h2 className={`text-xl font-bold flex items-center gap-2
                ${activeTab === 'Kirim' ? 'text-emerald-800' : activeTab === 'Chiqim' ? 'text-red-800' : 'text-blue-800'}`}
              >
                {activeTab === 'Kirim' ? <ArrowDownRight className="w-5 h-5"/> : activeTab === 'Chiqim' ? <ArrowUpRight className="w-5 h-5"/> : <ArrowRightLeft className="w-5 h-5"/>}
                {activeTab} Operatsiyasi
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mahsulot Nomi (Inventardan tanlang)</label>
                <select required name="inventory_id" value={formData.inventory_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                  {inventory.map(inv => (
                     <option key={inv.id} value={inv.id}>{inv.name} (Qoldiq: {inv.stock_level})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hudud (Zona)</label>
                  <select name="zone" value={formData.zone} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm">
                    {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Miqdori (Dona/Kg)</label>
                  <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="0"/>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">Bekor qilish</button>
                <button type="submit" className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2
                  ${activeTab === 'Kirim' ? 'bg-emerald-600 hover:bg-emerald-700' : activeTab === 'Chiqim' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};