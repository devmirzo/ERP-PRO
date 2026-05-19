import React, { useState, useEffect } from 'react';
import { Radio, Thermometer, Droplets, AlertTriangle, Wifi, WifiOff, RefreshCcw, Activity, Plus, X, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Sensors = () => {
  const [sensors, setSensors] = useState([]);
  const [alertLog, setAlertLog] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    snr_id: '',
    temperature: '',
    humidity: '',
    connection: 'Online'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: sData } = await supabase
        .from('sensors')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: aData } = await supabase
        .from('alert_logs')
        .select('*')
        .order('date', { ascending: false });
      
      setSensors(sData || []);
      setAlertLog(aData || []);
    } catch (error) {
      console.error("Datchiklarni yuklashda xatolik:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.snr_id) {
      return alert("Nomi va SNR-ID kiritilishi shart!");
    }

    const payload = {
      snr_id: formData.snr_id,
      name: formData.name,
      temperature: formData.temperature !== '' ? Number(formData.temperature) : null,
      humidity: formData.humidity !== '' ? Number(formData.humidity) : null,
      connection: formData.connection
    };

    try {
      const { error } = await supabase.from('sensors').insert([payload]);
      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({ name: '', snr_id: '', temperature: '', humidity: '', connection: 'Online' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu qurilmani o'chirmoqchimisiz?")) {
      try {
        const { error } = await supabase.from('sensors').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err) {
        console.error(err);
        alert("O'chirishda xatolik yuz berdi: " + err.message);
      }
    }
  };

  const clearLogs = async () => {
    if (window.confirm("Jurnalni tozalaysizmi?")) {
      try {
        const { data } = await supabase.from('alert_logs').select('id');
        if (data && data.length > 0) {
          await supabase.from('alert_logs').delete().in('id', data.map(d => d.id));
        }
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IoT Sensorlar</h1>
          <p className="text-sm text-slate-500 mt-1">Ombor va hududlardagi real vaqt datchiklari nazorati (Supabase)</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-colors text-sm font-medium disabled:opacity-50">
            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} /> {isRefreshing ? 'Yangilanmoqda...' : 'Yangilash'}
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Qurilma Qo'shish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {sensors.map((sensor) => {
          const isOnline = sensor.connection === 'Online' || sensor.connection === 'online';
          
          // Warning thresholds
          const isTempWarning = sensor.temperature !== null && (sensor.temperature > 35 || sensor.temperature < 10);
          const isHumWarning = sensor.humidity !== null && (sensor.humidity > 75 || sensor.humidity < 25);
          const isWarning = isTempWarning || isHumWarning;

          const tempStatus = sensor.temperature === null ? 'Ulanmagan' : 
            sensor.temperature > 35 ? 'Issiq' : 
            sensor.temperature < 10 ? 'Sovuq' : 'Normal';
            
          const humStatus = sensor.humidity === null ? 'Ulanmagan' : 
            sensor.humidity > 75 ? 'Yuqori' : 
            sensor.humidity < 25 ? 'Quruq' : 'Normal';

          return (
            <div key={sensor.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all relative overflow-hidden group ${isWarning ? 'border-red-300 shadow-red-100/50' : 'border-slate-200 hover:shadow-md'}`}>
              
              {/* Header: Name and status dot */}
              <div className="flex justify-between items-start mb-4 pr-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-base line-clamp-1">{sensor.name}</h3>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{sensor.snr_id}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
                  {isOnline ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Online</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Body: Temperature and Humidity details */}
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-50">
                {/* Temperature block */}
                <div className={`p-3 rounded-xl flex flex-col justify-between ${
                  isTempWarning ? 'bg-red-50/55 border border-red-100 animate-pulse' : 'bg-orange-50/40 border border-orange-100/60'
                }`}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Thermometer className={`w-4 h-4 ${isTempWarning ? 'text-red-500' : 'text-orange-500'}`} />
                    <span>Harorat</span>
                  </div>
                  <div>
                    <span className={`text-xl font-extrabold ${isTempWarning ? 'text-red-600' : 'text-slate-800'}`}>
                      {sensor.temperature !== null ? `${sensor.temperature} °C` : '--'}
                    </span>
                    <span className={`block text-[10px] font-bold uppercase mt-1 tracking-wider ${
                      tempStatus === 'Normal' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tempStatus}
                    </span>
                  </div>
                </div>

                {/* Humidity block */}
                <div className={`p-3 rounded-xl flex flex-col justify-between ${
                  isHumWarning ? 'bg-red-50/55 border border-red-100 animate-pulse' : 'bg-blue-50/40 border border-blue-100/60'
                }`}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Droplets className={`w-4 h-4 ${isHumWarning ? 'text-red-500' : 'text-blue-500'}`} />
                    <span>Namlik</span>
                  </div>
                  <div>
                    <span className={`text-xl font-extrabold ${isHumWarning ? 'text-red-600' : 'text-slate-800'}`}>
                      {sensor.humidity !== null ? `${sensor.humidity} %` : '--'}
                    </span>
                    <span className={`block text-[10px] font-bold uppercase mt-1 tracking-wider ${
                      humStatus === 'Normal' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {humStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium">
                  {sensor.created_at ? new Date(sensor.created_at).toLocaleString('uz-UZ') : 'Noma\'lum vaqt'}
                </span>
                <button 
                  onClick={() => handleDelete(sensor.id)} 
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Qurilmani o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Activity className="w-5 h-5 text-slate-500" /> So'nggi Ogohlantirishlar</h2>
          <button onClick={clearLogs} className="text-sm text-red-600 font-medium hover:text-red-700">Jurnalni tozalash</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vaqt</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qurilma</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Xabar</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Daraja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alertLog.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500">Hech qanday xavf yoki ogohlantirish qayd etilmagan</td></tr>
              ) : (
                alertLog.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(log.date).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{log.sensor_info}</td>
                    <td className="px-6 py-4 text-sm text-slate-600"><div className="flex items-center gap-2">{log.level === 'Yuqori' && <AlertTriangle className="w-4 h-4 text-red-500" />} {log.message}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${log.level === 'Yuqori' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{log.level}</span></td>
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
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Radio className="w-5 h-5 text-blue-600"/> Yangi Qurilma</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddDevice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Datchik Nomi</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="Masalan: Harorat datchigi"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SNR-ID (Unique)</label>
                <input required type="text" name="snr_id" value={formData.snr_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="Masalan: snr_01 yoki NodeMCU-MAC"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harorat (°C)</label>
                  <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="Masalan: 24.5"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Namlik (%)</label>
                  <input type="number" step="0.1" name="humidity" value={formData.humidity} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="Masalan: 45"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Aloqa Holati</label>
                <select name="connection" value={formData.connection} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm">
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium text-sm">Bekor qilish</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4" /> Qo'shish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};