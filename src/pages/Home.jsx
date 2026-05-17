import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Package, ShoppingCart, DollarSign, Activity, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';

export const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    inventoryItems: 0,
    employeesCount: 0,
    alerts: 0
  });
  
  // Realtime interactive lists
  const [recentSales, setRecentSales] = useState([]);
  const [recentInventory, setRecentInventory] = useState([]);
  const [salesByDay, setSalesByDay] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [invSearch, setInvSearch] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch Sales Stats
      let salesQuery = supabase.from('sales').select('amount', { count: 'exact' });
      if (user?.role === 'Sotuvchi') {
        salesQuery = salesQuery.eq('employee_id', user.id);
      }
      const { data: salesData, count: salesCount } = await salesQuery;
      const revenue = salesData ? salesData.reduce((acc, sale) => acc + (Number(sale.amount) || 0), 0) : 0;

      // Fetch Recent Sales List (dynamic/interactive)
      let recentSalesQuery = supabase
        .from('sales')
        .select(`
          id,
          date,
          amount,
          quantity,
          status,
          clients (company_name),
          inventory (name),
          employees (name)
        `)
        .order('date', { ascending: false })
        .limit(10);
      
      if (user?.role === 'Sotuvchi') {
        recentSalesQuery = recentSalesQuery.eq('employee_id', user.id);
      }
      const { data: rsData } = await recentSalesQuery;
      setRecentSales(rsData || []);

      // Fetch Recent Inventory (dynamic/interactive)
      const { data: riData } = await supabase
        .from('inventory')
        .select('*')
        .order('stock_level', { ascending: true }) // low stock first
        .limit(10);
      setRecentInventory(riData || []);

      // Boshqalar uchun umumiy stat
      let invCount = 0;
      let empCount = 0;
      let alertsCount = 0;

      if (user?.role === 'Bosh Admin' || user?.role === 'Meneger') {
        const { count: iCount } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
        invCount = iCount || 0;
      }

      if (user?.role === 'Bosh Admin') {
        const { count: eCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });
        empCount = eCount || 0;
      }

      const { count: aCount } = await supabase.from('alert_logs').select('*', { count: 'exact', head: true });
      alertsCount = aCount || 0;

      setStats({
        totalSales: salesCount || 0,
        totalRevenue: revenue,
        inventoryItems: invCount,
        employeesCount: empCount,
        alerts: alertsCount
      });

      // Fetch category distribution
      const { data: invData } = await supabase.from('inventory').select('category, stock_level');
      const catMap = {};
      invData?.forEach(item => {
        if (item.category) {
          catMap[item.category] = (catMap[item.category] || 0) + (Number(item.stock_level) || 0);
        }
      });
      const catList = Object.keys(catMap).map(cat => ({
        category: cat,
        value: catMap[cat]
      })).sort((a, b) => b.value - a.value);
      setCategoryDistribution(catList);

      // Fetch sales for last 7 days
      const { data: weekSales } = await supabase
        .from('sales')
        .select('date, amount');
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return {
          dateStr: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          rawDate: d.toDateString(),
          amount: 0
        };
      }).reverse();

      weekSales?.forEach(sale => {
        const saleDate = new Date(sale.date).toDateString();
        const found = last7Days.find(d => d.rawDate === saleDate);
        if (found) {
          found.amount += Number(sale.amount) || 0;
        }
      });
      setSalesByDay(last7Days);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Live filter computed states
  const filteredSales = useMemo(() => {
    return recentSales.filter(sale => 
      (sale.clients?.company_name || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
      (sale.inventory?.name || '').toLowerCase().includes(salesSearch.toLowerCase())
    );
  }, [recentSales, salesSearch]);

  const filteredInventory = useMemo(() => {
    return recentInventory.filter(item => 
      item.name.toLowerCase().includes(invSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(invSearch.toLowerCase())
    );
  }, [recentInventory, invSearch]);

  if (loading) {
    return <Loader variant="block" text="Statistika yuklanmoqda..." />;
  }

  // Common styles for sections
  const renderRecentSalesPanel = () => (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            So'nggi Sotuv Amallari
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Oxirgi amalga oshirilgan savdo tranzaksiyalari</p>
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Qidirish..." 
            value={salesSearch} 
            onChange={(e) => setSalesSearch(e.target.value)} 
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 sm:mx-0 flex-1">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead>
              <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Mijoz / Tovar</th>
                <th className="px-4 py-3">Sotuvchi</th>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSales.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-xs">Sotuvlar topilmadi</td></tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{sale.clients?.company_name || 'Noma\'lum Mijoz'}</div>
                      <div className="text-xs text-slate-400 font-medium">{sale.inventory?.name || 'Noma\'lum Tovar'} ({sale.quantity || 0} dona)</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {sale.employees?.name || 'Admin'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{(sale.amount || 0).toLocaleString()} so'm</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                        sale.status === "To'langan" ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' :
                        sale.status === "Kutilmoqda" ? 'bg-amber-100 text-amber-700 ring-amber-600/20' :
                        'bg-red-100 text-red-700 ring-red-600/20'
                      }`}>
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
    </div>
  );

  // Sotuvchi Dashboardi
  if (user?.role === 'Sotuvchi') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Xush kelibsiz, {user.name}</h1>
          <p className="text-slate-500">Sizning shaxsiy sotuvlar panelingiz.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="w-6 h-6"/></div>
              <span className="font-medium text-blue-100">Jami Qilgan Savdoyingiz</span>
            </div>
            <div className="text-3xl font-bold">{stats.totalRevenue.toLocaleString()} so'm</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ShoppingCart className="w-6 h-6"/></div>
              <span className="font-medium text-slate-500">Mijozlarga Xizmat</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stats.totalSales} <span className="text-lg text-slate-400 font-medium">ta tranzaksiya</span></div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp className="w-6 h-6"/></div>
              <span className="font-medium text-slate-500">Sizning Bonusingiz (5%)</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{(stats.totalRevenue * 0.05).toLocaleString()} so'm</div>
          </div>
        </div>

        {/* Sotuvchi uchun o'zining so'nggi savdo tranzaksiyalari */}
        <div className="grid grid-cols-1 gap-6">
          {renderRecentSalesPanel()}
        </div>
      </div>
    );
  }

  // Meneger yoki Bosh Admin Dashboardi
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Umumiy Ko'rsatkichlar</h1>
          <p className="text-sm text-slate-500 mt-1">Kompaniyaning asosiy moliyaviy holati</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Umumiy Daromad</p>
              <h3 className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} so'm</h3>
            </div>
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium relative z-10">
            <TrendingUp className="w-4 h-4" /> <span>+12.5% o'sish</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Sotuvlar Soni</p>
              <h3 className="text-3xl font-bold text-slate-800">{stats.totalSales} ta</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Ombordagi Turlar</p>
              <h3 className="text-3xl font-bold text-slate-800">{stats.inventoryItems} ta</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        {user?.role === 'Bosh Admin' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Xodimlar Soni</p>
                <h3 className="text-3xl font-bold text-slate-800">{stats.employeesCount} kishi</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {stats.alerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-red-100 rounded-xl text-red-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-lg mb-1">Tizimda Xavf Mavjud!</h3>
            <p className="text-red-600 font-medium">Sensorlardan {stats.alerts} ta ogohlantirish kelgan. Zudlik bilan "Sensorlar" sahifasini tekshiring!</p>
          </div>
        </div>
      )}

      {/* Real-time Sales and Stock Monitoring Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRecentSalesPanel()}

        {/* Low Stock Inventory Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Tovar Monitoringi (Qoldiqlar)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Zaxira miqdori kamaygan yoki tugagan mahsulotlar</p>
            </div>
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Qidirish..." 
                value={invSearch} 
                onChange={(e) => setInvSearch(e.target.value)} 
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 sm:mx-0 flex-1">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Tovar Nomi / SKU</th>
                    <th className="px-4 py-3">Kategoriya</th>
                    <th className="px-4 py-3">Qoldiq</th>
                    <th className="px-4 py-3">Holati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredInventory.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-xs">Tovarlar topilmadi</td></tr>
                  ) : (
                    filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400 font-medium">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{item.stock_level} {item.unit}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                            item.stock_level > 50 ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' :
                            item.stock_level > 0 ? 'bg-amber-100 text-amber-700 ring-amber-600/20' :
                            'bg-red-100 text-red-700 ring-red-600/20'
                          }`}>
                            {item.stock_level > 50 ? 'Yetarli' : item.stock_level > 0 ? 'Kam qolgan' : 'Tugagan'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Analitika va Interaktiv Diagrammalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Dynamics Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Sotuvlar Dinamikasi (So'nggi 7 kun)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Kunlik tranzaksiyalar hajmi va dinamik tahlili</p>
          </div>
          
          <div className="flex items-end justify-between gap-4 h-48 pt-6 border-b border-slate-100 pb-2">
            {salesByDay.map((day, idx) => {
              const maxAmount = Math.max(...salesByDay.map(d => d.amount), 100000);
              const heightPercent = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-10">
                    {day.amount.toLocaleString()} so'm
                  </div>
                  
                  {/* Column Bar */}
                  <div className="w-full bg-slate-50 hover:bg-slate-100 rounded-t-lg flex items-end h-full overflow-hidden transition-all duration-300">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg group-hover:from-blue-700 group-hover:to-blue-500 transition-all duration-500 ease-out"
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />
                  </div>
                  
                  {/* X Axis Label */}
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{day.dateStr}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Kategoriyalar bo'yicha Tovar Taqsimoti
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Ombordagi tovarlar ulushining kategoriya bo'yicha foizlarda taqsimoti</p>
          </div>
          
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {categoryDistribution.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Kategoriyalar topilmadi</div>
            ) : (
              categoryDistribution.slice(0, 4).map((cat, idx) => {
                const totalStock = categoryDistribution.reduce((acc, c) => acc + c.value, 0);
                const percentage = totalStock > 0 ? (cat.value / totalStock) * 100 : 0;
                const colors = [
                  { bg: 'bg-indigo-500' },
                  { bg: 'bg-emerald-500' },
                  { bg: 'bg-amber-500' },
                  { bg: 'bg-purple-500' }
                ];
                const color = colors[idx % colors.length];
                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 group-hover:text-slate-900 transition-colors">{cat.category}</span>
                      <span className="text-slate-500">{cat.value.toLocaleString()} kg/dona ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full ${color.bg} transition-all duration-700 ease-out`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};