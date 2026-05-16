import React, { useState, useEffect } from 'react';
import { Radio, Thermometer, Droplets, Wind, Flame, AlertTriangle, Wifi, WifiOff, RefreshCcw, Activity, Plus, X, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Sensors = () => {
  const [sensors, setSensors] = useState([]);
  const [alertLog, setAlertLog] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Temperature',
    location: 'Ombor A'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: sData } = await supabase.from('sensors').select('*').order('updated_at', { ascending: false });
      const { data: aData } = await supabase.from('alert_logs').select('*').order('date', { ascending: false });
      
      setSensors(sData || []);
      setAlertLog(aData || []);
    } catch (error) {
      console.error(error);
    }
  };

  const getSensorStyles = (type) => {
    switch (type) {
      case 'Temperature': return { icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-100' };
      case 'Humidity': return { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'Smoke': return { icon: Wind, color: 'text-emerald-500', bg: 'bg-emerald-100' };
      case 'Fire': return { icon: Flame, color: 'text-red-500', bg: 'bg-red-100' };
      default: return { icon: Radio, color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    let newRawValue, newUnit;
    switch(formData.type) {
      case 'Temperature': newRawValue = 20; newUnit = '°C'; break;
      case 'Humidity': newRawValue = 40; newUnit = '%'; break;
      case 'Smoke': newRawValue = 0.01; newUnit = ' ppm'; break;
      case 'Fire': newRawValue = 0; newUnit = ''; break;
      default: newRawValue = 0; newUnit = '';
    }

    const payload = {
      snr_id: `SNR-${Math.floor(Math.random() * 10000)}`,
      name: `${formData.name} (${formData.location})`,
      type: formData.type,
      raw_value: newRawValue,
      unit: newUnit,
      status: 'Normal',
      connection: 'Online',
      location: formData.location
    };

    try {
      await supabase.from('sensors').insert([payload]);
      setIsModalOpen(false);
      setFormData({ name: '', type: 'Temperature', location: 'Ombor A' });
      fetchData();
    } catch(err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Bu qurilmani o'chirmoqchimisiz?")) {
      await supabase.from('sensors').delete().eq('id', id);
      fetchData();
    }
  };

  const clearLogs = async () => {
    if(window.confirm("Jurnalni tozalaysizmi?")) {
      // Supabase'da truncate yoki delete all uchun:
      const { data } = await supabase.from('alert_logs').select('id');
      if (data && data.length > 0) {
        await supabase.from('alert_logs').delete().in('id', data.map(d => d.id));
      }
      fetchData();
    }
  };

  // Simulating live data update
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    let newAlerts = [];
    
    for (let sensor of sensors) {
      if (sensor.connection === 'Offline') continue;

      let updatedVal = sensor.raw_value;
      let newStatus = 'Normal';
      
      if (sensor.type === 'Temperature') {
        updatedVal = sensor.raw_value + (Math.random() * 2 - 1);
        if (updatedVal > 28) newStatus = 'Warning';
      } else if (sensor.type === 'Humidity') {
        updatedVal = sensor.raw_value + (Math.random() * 4 - 2);
        if (updatedVal < 30 || updatedVal > 60) newStatus = 'Warning';
      } else if (sensor.type === 'Smoke') {
        updatedVal = sensor.raw_value + (Math.random() * 0.02 - 0.01); 
        if (updatedVal < 0) updatedVal = 0;
        if (updatedVal > 0.05) newStatus = 'Warning';
      }

      updatedVal = Number(updatedVal.toFixed(2));

      await supabase.from('sensors').update({ raw_value: updatedVal, status: newStatus, updated_at: new Date().toISOString() }).eq('id', sensor.id);

      if (newStatus === 'Warning' && sensor.status === 'Normal') {
        newAlerts.push({
          sensor_info: `${sensor.snr_id} (${sensor.name})`,
          message: `Xavfli ko'rsatkich: ${updatedVal}${sensor.unit}`,
          level: 'Yuqori'
        });
      }
    }

    if (newAlerts.length > 0) {
      await supabase.from('alert_logs').insert(newAlerts);
    }
    
    setTimeout(() => {
      fetchData();
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IoT Sensorlar</h1>
          <p className="text-sm text-slate-500 mt-1">Ombor va hududlardagi real vaqt holati nazorati (Supabase)</p>
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
          const styles = getSensorStyles(sensor.type);
          const Icon = styles.icon;
          const isOnline = sensor.connection === 'Online';
          const isWarning = sensor.status === 'Warning';
          let displayValue = sensor.type === 'Fire' ? (isWarning ? 'Xavf aniqlandi' : 'Xavf yo\'q') : `${sensor.raw_value}${sensor.unit}`;

          return (
            <div key={sensor.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all relative overflow-hidden group ${isWarning ? 'border-red-300 shadow-red-100/50' : 'border-slate-200 hover:shadow-md'}`}>
              <button onClick={() => handleDelete(sensor.id)} className="absolute top-4 right-10 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                {isOnline ? (<><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><Wifi className="w-3.5 h-3.5 text-emerald-500" /></>) : (<><span className="relative flex h-2 w-2"><span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span></span><WifiOff className="w-3.5 h-3.5 text-slate-400" /></>)}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isWarning ? 'bg-red-100 text-red-600 animate-pulse' : `${styles.bg} ${styles.color}`}`}><Icon className="w-6 h-6" /></div>
              <h3 className="text-sm font-medium text-slate-500 mb-1 line-clamp-1 pr-12">{sensor.name}</h3>
              <div className={`text-2xl font-bold mb-4 ${isWarning ? 'text-red-600' : 'text-slate-800'}`}>{displayValue}</div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium">{sensor.snr_id}</span>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isWarning ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{sensor.status}</span>
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
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Masalan: Harorat datchigi"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qurilma Turi</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="Temperature">Harorat</option><option value="Humidity">Namlik</option><option value="Smoke">Tutun/Gaz</option><option value="Fire">Yong'in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hudud</label>
                  <select name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="Ombor A">Ombor A</option><option value="Ombor B">Ombor B</option><option value="Zavod">Zavod</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium">Bekor qilish</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Ulush</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};