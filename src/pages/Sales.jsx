import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, TrendingUp, DollarSign, ArrowUpRight, Plus, Search, Calendar, CheckCircle2, User, UserCircle, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import { useNotification } from '../context/NotificationContext';

export const Sales = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    inventory_id: '',
    employee_id: '',
    quantity: 1,
    payment_method: 'Naqd'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Clients
      const { data: cData } = await supabase.from('clients').select('id, company_name');
      setClients(cData || []);

      // Fetch Inventory
      const { data: iData } = await supabase.from('inventory').select('id, name, price, stock_level');
      setInventory(iData || []);

      // Fetch Employees (Sotuvchilar)
      const { data: eData } = await supabase.from('employees').select('id, name, role').eq('department', 'Sotuv');
      setEmployees(eData || []);

      // Pre-select first values if available
      setFormData(prev => ({
        ...prev,
        client_id: cData?.[0]?.id || '',
        inventory_id: iData?.[0]?.id || '',
        employee_id: user?.id || eData?.[0]?.id || ''
      }));

      // Fetch Sales
      const { data: sData, error: sError } = await supabase
        .from('sales')
        .select(`
          *,
          clients (company_name),
          inventory (name, price),
          employees (name)
        `)
        .order('date', { ascending: false });

      if (sError) throw sError;
      setSales(sData || []);

    } catch (error) {
      console.error("Error fetching sales data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'To\'langan': return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
      case 'Kutilmoqda': return 'bg-amber-100 text-amber-700 ring-amber-600/20';
      case 'Qarzdorlik': return 'bg-red-100 text-red-700 ring-red-600/20';
      default: return 'bg-slate-100 text-slate-700 ring-slate-600/20';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.inventory_id || !formData.employee_id) {
       return showNotification("Barcha maydonlarni to'ldiring!", "warning");
    }

    const qty = parseInt(formData.quantity);
    const selectedProduct = inventory.find(i => i.id === formData.inventory_id);
    
    if (qty > selectedProduct.stock_level) {
       return showNotification(`Xatolik! Omborda faqat ${selectedProduct.stock_level} ta qolgan.`, "error");
    }

    const totalAmount = qty * (selectedProduct.price || 0);

    try {
      // 1. Insert Sale
      const newSale = {
        invoice_id: `INV-2026-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        client_id: formData.client_id,
        inventory_id: formData.inventory_id,
        employee_id: formData.employee_id,
        quantity: qty,
        amount: totalAmount,
        payment_method: formData.payment_method,
        status: 'To\'langan'
      };

      const { error: saleError } = await supabase.from('sales').insert([newSale]);
      if (saleError) throw saleError;

      // 2. Reduce Inventory Stock
      await supabase.from('inventory').update({ stock_level: selectedProduct.stock_level - qty }).eq('id', formData.inventory_id);

      showNotification("Sotuv operatsiyasi muvaffaqiyatli yakunlandi!", "success");
      setIsModalOpen(false);
      fetchData(); // Refresh everything
    } catch (error) {
       console.error("Error saving sale:", error.message);
       showNotification("Saqlashda xatolik yuz berdi!", "error");
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => 
      (sale.invoice_id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (sale.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sales, searchTerm]);

  // Hisoblangan Statistikalar
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date && s.date.startsWith(today));
    
    const todayRevenue = todaySales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalRevenue = sales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
    return {
      todayRevenue,
      totalRevenue,
      totalOrders: sales.length,
      todayOrders: todaySales.length
    };
  }, [sales]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sotuvlar Bo'limi</h1>
          <p className="text-sm text-slate-500 mt-1">Sotuv operatsiyalari va daromadlar tahlili</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi Sotuv Qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="w-5 h-5 text-white"/></div>
            <h3 className="text-sm font-medium text-blue-100">Bugungi Tushum</h3>
          </div>
          <div className="flex items-end gap-3 relative z-10">
            <p className="text-3xl font-bold">{metrics.todayRevenue.toLocaleString()} so'm</p>
            <span className="text-sm font-medium text-emerald-300 flex items-center mb-1"><TrendingUp className="w-4 h-4 mr-1"/>{metrics.todayOrders} ta xarid</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ShoppingCart className="w-5 h-5"/></div>
            <h3 className="text-sm font-medium text-slate-500">Jami Sotuvlar Summasi</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.totalRevenue.toLocaleString()} so'm</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Calendar className="w-5 h-5"/></div>
            <h3 className="text-sm font-medium text-slate-500">Jami Operatsiyalar</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.totalOrders} ta shartnoma</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
           <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Faktura ID yoki Mijoz qidiruvi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Faktura / Sana</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mijoz (Kompaniya)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mahsulot</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">To'lov Turi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sotuvchi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <Loader variant="table" colSpan={6} text="Sotuvlar yuklanmoqda..." />
              ) : filteredSales.length === 0 ? (
                 <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Hech qanday sotuv topilmadi</td></tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 mb-0.5">{sale.invoice_id}</div>
                      <div className="text-xs text-slate-500">{new Date(sale.date).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{sale.clients?.company_name || 'Noma\'lum'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">{sale.inventory?.name || 'Noma\'lum'}</div>
                      <div className="text-xs text-slate-500">{sale.quantity} kg x {sale.inventory?.price} so'm</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{sale.payment_method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{sale.employees?.name || 'Noma\'lum'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-600 mb-1">{(sale.amount || 0).toLocaleString()} so'm</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600"/> Yangi Sotuv
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mijoz Ismi (Kompaniya)</label>
                <select required name="client_id" value={formData.client_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sotilayotgan Mahsulot</label>
                <select required name="inventory_id" value={formData.inventory_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Qoldiq: {i.stock_level}, Narxi: ${i.price})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xizmat Ko'rsatgan Sotuvchi</label>
                {user?.role === 'Sotuvchi' ? (
                  <input type="text" disabled value={user.name} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
                ) : (
                  <select required name="employee_id" value={formData.employee_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Miqdori</label>
                  <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To'lov Turi</label>
                  <select required name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="Naqd">Naqd Pul</option>
                    <option value="Karta">Plastik Karta</option>
                    <option value="Pul O'tkazish">Pul O'tkazish</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Bekor qilish</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Rasmiylashtirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};