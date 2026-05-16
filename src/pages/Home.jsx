import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Package, ShoppingCart, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    inventoryItems: 0,
    employeesCount: 0,
    alerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch Sales
      let salesQuery = supabase.from('sales').select('amount', { count: 'exact' });
      // Agar foydalanuvchi sotuvchi bo'lsa, faqat o'zining savdolarini ko'radi
      if (user?.role === 'Sotuvchi') {
        salesQuery = salesQuery.eq('employee_id', user.id);
      }
      const { data: salesData, count: salesCount } = await salesQuery;
      
      const revenue = salesData ? salesData.reduce((acc, sale) => acc + (Number(sale.amount) || 0), 0) : 0;

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

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex items-center justify-center py-20 text-slate-500">Statistika yuklanmoqda...</div>;
  }

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
            <div className="text-4xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ShoppingCart className="w-6 h-6"/></div>
              <span className="font-medium text-slate-500">Mijozlarga Xizmat</span>
            </div>
            <div className="text-4xl font-bold text-slate-800">{stats.totalSales} <span className="text-lg text-slate-400 font-medium">ta tranzaksiya</span></div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp className="w-6 h-6"/></div>
              <span className="font-medium text-slate-500">Sizning Bonusingiz (5%)</span>
            </div>
            <div className="text-4xl font-bold text-purple-600">${(stats.totalRevenue * 0.05).toLocaleString()}</div>
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
              <h3 className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</h3>
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
              <h3 className="text-3xl font-bold text-slate-800">{stats.totalSales}</h3>
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
              <h3 className="text-3xl font-bold text-slate-800">{stats.inventoryItems}</h3>
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
                <h3 className="text-3xl font-bold text-slate-800">{stats.employeesCount}</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {stats.alerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl text-red-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-lg mb-1">Tizimda Xavf Mavjud!</h3>
            <p className="text-red-600 font-medium">Sensorlardan {stats.alerts} ta ogohlantirish kelgan. Zudlik bilan "Sensorlar" sahifasini tekshiring!</p>
          </div>
        </div>
      )}

      {/* Tizim faolligi (Mock Graphic o'rniga oddiy UI) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" /> Tizim Barqarorligi
        </h2>
        <div className="flex flex-col sm:flex-row gap-8">
           <div className="flex-1 space-y-4">
             <div>
               <div className="flex justify-between text-sm mb-1"><span className="text-slate-500 font-medium">Server (Supabase)</span><span className="text-emerald-600 font-bold">100% Onlayn</span></div>
               <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{width: '100%'}}></div></div>
             </div>
             <div>
               <div className="flex justify-between text-sm mb-1"><span className="text-slate-500 font-medium">Ma'lumotlar Sinxronizatsiyasi</span><span className="text-blue-600 font-bold">Faol</span></div>
               <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: '100%'}}></div></div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};