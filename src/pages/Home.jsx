import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Package, ShoppingCart, DollarSign, Activity, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';

// Chart.js modullarini import qilish va ro'yxatdan o'tkazish
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
      let salesTrendQuery = supabase.from('sales').select('date, amount');
      if (user?.role === 'Sotuvchi') {
        salesTrendQuery = salesTrendQuery.eq('employee_id', user.id);
      }
      const { data: weekSales } = await salesTrendQuery;
      
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

  // ─── CHART.JS SOZLAMALARI VA DATA STRUKTURALARI ───
  
  // 1. Sotuvlar dinamikasi (Chiziqli Grafik) Sozlamalari
  const salesChartData = {
    labels: salesByDay.map(d => d.dateStr),
    datasets: [
      {
        fill: true,
        label: "Sotuv hajmi (so'm)",
        data: salesByDay.map(d => d.amount),
        borderColor: '#2563eb', // blue-600
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
          gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
          return gradient;
        },
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#2563eb',
        pointHoverBackgroundColor: '#1d4ed8',
      }
    ]
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 10,
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => ` ${context.raw.toLocaleString()} so'm`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#94a3b8',
          font: { size: 11, weight: '600' },
          callback: (value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString()
        }
      }
    }
  };

  // 2. Kategoriya taqsimoti (Doughnut) Sozlamalari
  const topCategories = categoryDistribution.slice(0, 5);
  const doughnutChartData = {
    labels: topCategories.map(c => c.category),
    datasets: [
      {
        data: topCategories.map(c => c.value),
        backgroundColor: [
          '#6366f1', // indigo-500
          '#10b981', // emerald-500
          '#f59e0b', // amber-500
          '#8b5cf6', // purple-500
          '#ec4899', // pink-500
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 15,
          color: '#334155',
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        padding: 10,
        backgroundColor: '#0f172a',
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` Qoldiq: ${value.toLocaleString()} kg/dona (${percentage}%)`;
          }
        }
      }
    },
    cutout: '70%'
  };

  if (loading) {
    return <Loader variant="block" text="Statistika yuklanmoqda..." />;
  }

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

        {/* Sotuvchining o'z dinamikasi (Grafik) va so'nggi savdolari */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {renderRecentSalesPanel()}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-full">
            <div className="mb-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Sizning Sotuv Dinamikangiz
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Oxirgi 7 kunlik shaxsiy savdo grafigingiz</p>
            </div>
            <div className="h-[260px] w-full pt-4">
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          </div>
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

      {/* Analitika va Interaktiv Diagrammalar Panelı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Dynamics Chart (Chiziqli) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Sotuvlar Dinamikasi (So'nggi 7 kun)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Kunlik tranzaksiyalar hajmi va dinamik tahlili</p>
          </div>
          <div className="h-[240px] w-full pt-4">
            <Line data={salesChartData} options={salesChartOptions} />
          </div>
        </div>

        {/* Categories Distribution (Doughnut - Aylanma) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Kategoriyalar bo'yicha Tovar Taqsimoti
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Ombordagi top 5 kategoriyadagi tovarlar ulushining taqsimoti</p>
          </div>
          <div className="h-[240px] w-full pt-4 flex items-center justify-center">
            {categoryDistribution.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Kategoriyalar topilmadi</div>
            ) : (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};