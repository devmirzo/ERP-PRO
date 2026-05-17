import React, { useState, useMemo, useEffect } from 'react';
import { Warehouse as WarehouseIcon, Search, Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft, X, CheckCircle2, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Loader } from '../components/Loader';
import { useNotification } from '../context/NotificationContext';

// Zonalar sxemasi va sig'imlari (Kategoriyalarga bog'langan)
const zoneSchema = [
  { id: 'A', name: 'A-Zona ("Quruq meva 1-sort")', capacity: 1000, color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-500', categories: ['Quruq meva 1-sort'] },
  { id: 'B', name: 'B-Zona ("Quruq meva 2-sort")', capacity: 800, color: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-500', categories: ['Quruq meva 2-sort', 'Quruq meva 3-sort'] },
  { id: 'C', name: 'C-Zona ("Don don")', capacity: 2000, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500', categories: ['Don don'] },
  { id: 'D', name: 'D-Zona ("Ho\"l meva 1-sort")', capacity: 2000, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500', categories: ['Ho\'l meva 1-sort'] },
  { id: 'E', name: 'E-Zona ("Ho\"l meva 2-sort")', capacity: 2000, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500', categories: ['Ho\'l meva 2-sort'] },
  { id: 'F', name: 'F-Zona ("Ho\"l meva 3-sort")', capacity: 2000, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500', categories: ['Ho\'l meva 3-sort'] },
];

export const Warehouse = () => {
  const { showNotification } = useNotification();
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Kirim'); // Kirim, Chiqim, Ko'chirish
  const [formData, setFormData] = useState({
    inventory_id: '',
    zone: 'A-Zona ("Quruq meva 1-sort")',
    quantity: '',
    unit: 'kg',
    price: ''
  });

  // Mahsulotning kategoriyasiga qarab hududini (zonasini) aniqlash
  const getProductZone = (product) => {
    if (!product) return 'A-Zona ("Quruq meva 1-sort")';
    const matchedZone = zoneSchema.find(z => z.categories.includes(product.category));
    return matchedZone ? matchedZone.name : 'A-Zona ("Quruq meva 1-sort")';
  };

  // activeTab yoki mahsulot o'zgarganda zonani to'g'ri belgilash
  useEffect(() => {
    if (inventory.length > 0 && formData.inventory_id) {
      const selectedProduct = inventory.find(i => i.id === formData.inventory_id);
      if (selectedProduct) {
        const defaultZone = getProductZone(selectedProduct);
        if (activeTab === 'Ko\'chirish') {
          const firstDest = zoneSchema.find(z => z.name !== defaultZone);
          setFormData(prev => ({ 
            ...prev, 
            zone: prev.zone && prev.zone !== defaultZone ? prev.zone : (firstDest ? firstDest.name : defaultZone) 
          }));
        } else {
          setFormData(prev => ({ ...prev, zone: defaultZone }));
        }
      }
    }
  }, [activeTab, formData.inventory_id, inventory]);

  // Mahsulotning uning asosiy/boshlang'ich zonasidagi joriy qoldig'ini hisoblash
  const getProductRemainingQty = (product) => {
    if (!product) return 0;
    const transfers = transactions.filter(t => t.inventory_id === product.id && t.type === "Ko'chirish");
    let transferredQty = 0;
    transfers.forEach(t => {
      transferredQty += t.quantity || 0;
    });
    return product.stock_level - transferredQty;
  };

  // Ombor zonalarining bandligini inventardagi tovar qoldiqlari orqali dinamik hisoblash
  const dynamicZones = useMemo(() => {
    return zoneSchema.map(zone => {
      // Ushbu zonaga tegishli bo'lgan mahsulotlar ro'yxati (kategoriyasi bo'yicha)
      const zoneProducts = inventory.filter(item => zone.categories.includes(item.category));
      
      let totalQty = 0;
      let totalSum = 0;

      zoneProducts.forEach(product => {
        // Ushbu mahsulotning boshqa zonalarga ko'chirilgan miqdorlarini hisoblaymiz
        const transfers = transactions.filter(t => t.inventory_id === product.id && t.type === "Ko'chirish");
        let transferredQty = 0;
        transfers.forEach(t => {
          if (t.zone !== zone.name) {
            transferredQty += t.quantity || 0;
          }
        });

        // Boshlang'ich hududda qolgan qoldiq
        const remainingQty = product.stock_level - transferredQty;
        if (remainingQty > 0) {
          totalQty += remainingQty;
          totalSum += remainingQty * product.price;
        }
      });

      // Boshqa zonalardan ushbu zonaga KO'CHIRIB keltirilgan tovarlarni qo'shamiz
      const transfersIn = transactions.filter(t => t.zone === zone.name && t.type === "Ko'chirish");
      transfersIn.forEach(t => {
        const product = inventory.find(i => i.id === t.inventory_id);
        // Agar tovar boshqa zonaga tegishli bo'lsa va shu yerga ko'chirilgan bo'lsa
        if (product && getProductZone(product) !== zone.name) {
          totalQty += t.quantity || 0;
          totalSum += (t.quantity || 0) * product.price;
        }
      });

      return {
        ...zone,
        current: totalQty,
        totalSum
      };
    });
  }, [inventory, transactions]);

  // Modal ochish va unga default qiymatlarni o'rnatish
  const openModal = (tab) => {
    setActiveTab(tab);
    const defaultProduct = inventory[0];
    const defaultZone = getProductZone(defaultProduct);
    setFormData({
      inventory_id: defaultProduct?.id || '',
      zone: tab === 'Ko\'chirish' ? (zoneSchema.find(z => z.name !== defaultZone)?.name || '') : (defaultZone || ''),
      quantity: '',
      unit: defaultProduct?.unit || 'kg',
      price: defaultProduct?.price !== undefined ? defaultProduct.price : ''
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Inventory hamda uning kategoriyasini ham olib kelamiz
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('id, name, stock_level, category, price, unit');
      if (invError) throw invError;
      setInventory(invData || []);
      
      if (invData && invData.length > 0) {
        const initialZone = getProductZone(invData[0]);
        setFormData(prev => ({ 
          ...prev, 
          inventory_id: invData[0].id,
          zone: initialZone,
          unit: invData[0].unit || 'kg',
          price: invData[0].price !== undefined ? invData[0].price : ''
        }));
      }

      // Fetch Transactions
      const { data: transData, error: transError } = await supabase
        .from('warehouse_transactions')
        .select(`
          *,
          inventory (
            name,
            price
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
    if (name === 'inventory_id') {
      const selectedProduct = inventory.find(i => i.id === value);
      const automaticZone = getProductZone(selectedProduct);
      setFormData(prev => ({ 
        ...prev, 
        inventory_id: value,
        zone: activeTab === 'Ko\'chirish' ? prev.zone : automaticZone,
        unit: selectedProduct?.unit || 'kg',
        price: selectedProduct?.price !== undefined ? selectedProduct.price : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    
    if (!formData.inventory_id) return showNotification("Iltimos mahsulotni tanlang!", "warning");
    
    const qty = parseInt(formData.quantity);
    if (!qty || qty <= 0) return showNotification("Miqdorni to'g'ri kiriting!", "warning");

    const selectedProduct = inventory.find(i => i.id === formData.inventory_id);
    if (!selectedProduct) return showNotification("Mahsulot topilmadi!", "error");

    const targetZoneName = activeTab === 'Ko\'chirish' ? formData.zone : getProductZone(selectedProduct);
    const targetZone = dynamicZones.find(z => z.name === targetZoneName);

    // Kirim qilinganda zonaning qolgan sig'imidan oshib ketmasligini tekshirish
    if (activeTab === 'Kirim' && targetZone) {
      const remainingCapacity = targetZone.capacity - targetZone.current;
      if (qty > remainingCapacity) {
        return showNotification(`Xatolik! Ombor sig'imi to'la. ${targetZone.name}da faqat ${remainingCapacity} kg uchun bo'sh joy qolgan!`, "error");
      }
    }

    // Chiqim yoki Ko'chirish qilinganda mavjud zonadagi qoldiqdan oshib ketmasligini tekshirish
    if (activeTab === 'Chiqim' || activeTab === 'Ko\'chirish') {
      const remainingQty = getProductRemainingQty(selectedProduct);
      if (qty > remainingQty) {
        return showNotification(`Xatolik! Ushbu zonada faqat ${remainingQty} kg qoldiq mavjud. (Boshqa zonalarda: ${selectedProduct.stock_level - remainingQty} kg)`, "error");
      }
    }

    try {
      // 1. Transaction saqlash
      const newTransaction = {
        transaction_id: `TRN-2026-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        type: activeTab,
        inventory_id: formData.inventory_id,
        zone: targetZoneName,
        quantity: qty
      };

      const { error: transError } = await supabase
        .from('warehouse_transactions')
        .insert([newTransaction]);
      
      if (transError) throw transError;

      // 2. Inventory stock update: Kirim bo'lganda jami miqdorga qo'shiladi, Chiqimda ayriladi. Ko'chirishda jami miqdor o'zgarmaydi!
      if (activeTab === 'Kirim') {
         await supabase.from('inventory').update({ 
           stock_level: selectedProduct.stock_level + qty,
           unit: formData.unit,
           price: parseFloat(formData.price) || 0,
           status: (selectedProduct.stock_level + qty) > 50 ? 'Yetarli' : (selectedProduct.stock_level + qty) > 0 ? 'Kam qolgan' : 'Tugagan'
         }).eq('id', formData.inventory_id);
         showNotification("Kirim operatsiyasi muvaffaqiyatli yakunlandi!", "success");
      } else if (activeTab === 'Chiqim') {
         await supabase.from('inventory').update({ 
           stock_level: selectedProduct.stock_level - qty,
           unit: formData.unit,
           price: parseFloat(formData.price) || 0,
           status: (selectedProduct.stock_level - qty) > 50 ? 'Yetarli' : (selectedProduct.stock_level - qty) > 0 ? 'Kam qolgan' : 'Tugagan'
         }).eq('id', formData.inventory_id);
         showNotification("Chiqim operatsiyasi muvaffaqiyatli yakunlandi!", "success");
      } else if (activeTab === 'Ko\'chirish') {
         showNotification("Tovar muvaffaqiyatli ko'chirildi!", "success");
      }
      
      setIsModalOpen(false);
      const defaultProduct = inventory[0];
      setFormData({ 
        inventory_id: defaultProduct?.id || '', 
        zone: getProductZone(defaultProduct) || 'A-Zona ("Quruq meva 1-sort")', 
        quantity: '',
        unit: defaultProduct?.unit || 'kg',
        price: defaultProduct?.price !== undefined ? defaultProduct.price : ''
      });
      fetchData(); // Refresh all
      
    } catch (error) {
       console.error("Error saving transaction:", error.message);
       showNotification("Saqlashda xatolik yuz berdi!", "error");
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
          <button onClick={() => openModal('Kirim')} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors text-sm font-medium">
            <ArrowDownRight className="w-4 h-4" /> Yuk Qabul Qilish (Kirim)
          </button>
          <button onClick={() => openModal('Chiqim')} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors text-sm font-medium">
            <ArrowUpRight className="w-4 h-4" /> Yuk Chiqim Qilish
          </button>
          <button onClick={() => openModal('Ko\'chirish')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
            <ArrowRightLeft className="w-4 h-4" /> Ko'chirish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {dynamicZones.map((zone) => {
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
                  <span className="text-slate-500 font-medium">{zone.current.toLocaleString()} / {zone.capacity.toLocaleString()} kg</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${statusColor}`} style={{ width: `${percentage}%` }}></div>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100 mt-2">
                  <span className="text-slate-400 font-medium">Umumiy Summasi:</span>
                  <span className="text-slate-900 font-bold">{(zone.totalSum || 0).toLocaleString()} so'm</span>
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
                <Loader variant="table" colSpan={5} text="Operatsiyalar yuklanmoqda..." />
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
                      {tr.type === 'Kirim' ? '+' : tr.type === 'Chiqim' ? '-' : ''}{tr.quantity} kg
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hudud (Zona)</label>
                  {activeTab === 'Ko\'chirish' ? (
                    <select name="zone" value={formData.zone} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm">
                      {zoneSchema
                        .filter(z => z.name !== getProductZone(inventory.find(i => i.id === formData.inventory_id)))
                        .map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="zone" value={formData.zone} disabled={true} className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed text-sm" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Miqdori</label>
                  <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="0"/>
                </div>
              </div>

              {activeTab !== 'Ko\'chirish' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">O'lchov Birligi</label>
                    <select required name="unit" value={formData.unit} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm">
                      <option value="kg">Kg</option>
                      <option value="tonna">Tonna</option>
                      <option value="quti">Quti</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Narxi (so'm)</label>
                    <input required type="number" name="price" value={formData.price} onChange={handleChange} min="0" step="0.01" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="0 so'm"/>
                  </div>
                </div>
              )}

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