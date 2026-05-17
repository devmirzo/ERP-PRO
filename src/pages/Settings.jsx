import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Settings as SettingsIcon, Building, ShieldAlert, Bell, Save, Percent, Thermometer, Droplets, Volume2, Mail, Globe } from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('company');

  // Load from localStorage or use defaults
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('erp_config');
    if (saved) return JSON.parse(saved);
    return {
      companyName: 'ERP PRO LLC',
      taxRate: 12,
      currency: 'so\'m',
      minStockLevel: 50,
      maxTemperature: 30,
      minHumidity: 40,
      enableSound: true,
      enableEmail: false,
      enablePush: true
    };
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user?.role !== 'Bosh Admin' && user?.role !== 'Meneger') {
      return showNotification("Sizda sozlamalarni o'zgartirish ruxsati yo'q!", "error");
    }

    localStorage.setItem('erp_config', JSON.stringify(config));
    showNotification("ERP tizimi sozlamalari muvaffaqiyatli saqlandi!", "success");
    
    // Broadcast config update
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const tabs = [
    { id: 'company', name: 'Kompaniya', icon: Building, roles: ['Bosh Admin'] },
    { id: 'thresholds', name: 'Tizim Chegaralari', icon: ShieldAlert, roles: ['Bosh Admin', 'Meneger'] },
    { id: 'notifications', name: 'Bildirishnomalar', icon: Bell, roles: ['Bosh Admin', 'Meneger', 'Sotuvchi'] }
  ];

  const filteredTabs = tabs.filter(t => t.roles.includes(user?.role));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tizim Sozlamalari</h1>
        <p className="text-sm text-slate-500 mt-1">ERP tizimining global parametrlarini sozlash</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar inside Settings */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1 h-fit">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* COMPANY SETTINGS */}
            {activeTab === 'company' && user?.role === 'Bosh Admin' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Kompaniya Sozlamalari</h3>
                  <p className="text-xs text-slate-400 mt-0.5">ERP hisobotlari va kvitansiyalarida foydalaniladigan ma'lumotlar</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Kompaniya Nomi</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required type="text" name="companyName" value={config.companyName} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Soliq stavkasi (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required type="number" name="taxRate" value={config.taxRate} onChange={handleChange} min="0" max="100" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Valyuta birligi</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="text" name="currency" value={config.currency} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* THRESHOLDS SETTINGS */}
            {activeTab === 'thresholds' && (user?.role === 'Bosh Admin' || user?.role === 'Meneger') && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tizim Chegaralari va Limitlari</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Zaxiralar va sensorlar uchun minimal/maksimal ko'rsatkichlar</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Zaxira ogohlantirish chegarasi (kg/dona)</label>
                    <input required type="number" name="minStockLevel" value={config.minStockLevel} onChange={handleChange} min="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                    <span className="text-[10px] text-slate-400 mt-1 block">Qoldiq bu sondan kamayganda "Kam qolgan" statusi beriladi.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Maksimal xavfsiz harorat (°C)</label>
                    <div className="relative">
                      <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required type="number" name="maxTemperature" value={config.maxTemperature} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Datchik harorati oshganda signal beriladi.</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Minimal namlik (%)</label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="number" name="minHumidity" value={config.minHumidity} onChange={handleChange} min="0" max="100" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ombor namligi tushib ketganda datchik xabar beradi.</span>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS SETTINGS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Bildirishnoma Sozlamalari</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Xabarlar va datchik signallarining yetkazib berilish usullari</p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <input type="checkbox" name="enableSound" checked={config.enableSound} onChange={handleChange} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Datchik tovushli signallari</p>
                        <p className="text-xs text-slate-400">Harorat oshib ketganda yoki namlik buzilganda chiquvchi ovozli signal</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <input type="checkbox" name="enableEmail" checked={config.enableEmail} onChange={handleChange} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Email orqali hisobotlar jo'natish</p>
                        <p className="text-xs text-slate-400">Har hafta yakunida tizimda moliyaviy hisobotlarni emailga yuborish</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <input type="checkbox" name="enablePush" checked={config.enablePush} onChange={handleChange} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Browser Push-bildirishnomalari</p>
                        <p className="text-xs text-slate-400">Yangi tranzaksiyalar yoki savdolar haqida browser push bildirishnomalari</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {(user?.role === 'Bosh Admin' || user?.role === 'Meneger' || activeTab === 'notifications') && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm">
                  <Save className="w-4 h-4" /> Sozlamalarni saqlash
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
