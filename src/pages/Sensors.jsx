import React, { useState, useEffect, useRef } from 'react';
import { Radio, Thermometer, Droplets, RefreshCcw, Plus, X, CheckCircle2, Calendar, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Chart.js modullari
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export const Sensors = () => {
  const [sensors, setSensors] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Custom HTML Tooltip uchun holat (state)
  const [tooltipState, setTooltipState] = useState({
    opacity: 0,
    top: 0,
    left: 0,
    title: '',
    value: '',
    date: '',
    type: 'Harorat', // 'Harorat' yoki 'Namlik'
  });

  const [formData, setFormData] = useState({
    name: '',
    snr_id: '',
    temperature: '',
    humidity: '',
    connection: 'Online'
  });

  // ─── REALTIME OBUNA VA MA'LUMOTLARNI YUKLASH ───
  useEffect(() => {
    // 1. Dastlabki ma'lumotlarni bazadan o'qish
    fetchData();

    // 2. Supabase Realtime kanalini sozlash
    const channel = supabase
      .channel('realtime-sensors')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE va hamma o'zgarishlarni eshitadi
          schema: 'public',
          table: 'sensors',
        },
        (payload) => {
          console.log("Bazada o'zgarish bo'ldi:", payload);
          
          if (payload.eventType === 'INSERT') {
            // Yangi qator qo'shilsa, uni state'ning eng tepasiga qo'shamiz
            setSensors((prevSensors) => [payload.new, ...prevSensors]);
          } else if (payload.eventType === 'UPDATE') {
            // Agar mavjud datchik qiymati yangilansa (Upsert bo'lsa)
            setSensors((prevSensors) =>
              prevSensors.map((sensor) =>
                sensor.snr_id === payload.new.snr_id ? payload.new : sensor
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Ma'lumot o'chirilganda
            setSensors((prevSensors) =>
              prevSensors.filter((sensor) => sensor.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Komponent ekrandan yo'qolganda obunani o'chirish (Memory leak bo'lmasligi uchun)
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: sData } = await supabase
        .from('sensors')
        .select('*')
        .order('created_at', { ascending: false });
      
      setSensors(sData || []);
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
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi: " + err.message);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Ma'lumotlarni tartiblash
  const orderedSensors = [...sensors].reverse(); 
  const labels = orderedSensors.map(s => s.name ? s.name.split(' (')[0] : 'Datchik');
  const fullNames = orderedSensors.map(s => s.name || "Noma'lum Datchik");
  
  // Sana va vaqt formatlash funksiyasi
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const timestamps = orderedSensors.map(s => formatDateTime(s.created_at));

  // ─── JORIY ENGLI OXIRGI MA'LUMOTLARNI ANIQLASH (KARTALAR UCHUN) ───
  // sensors massivining 0-elementi har doim eng oxirgi kelgan ma'lumot bo'ladi (order: created_at desc bo'lgani uchun)
  const latestSensor = sensors[0] || null;
  const currentTemp = latestSensor && latestSensor.temperature !== null ? latestSensor.temperature.toFixed(1) : '--';
  const currentHum = latestSensor && latestSensor.humidity !== null ? latestSensor.humidity.toFixed(1) : '--';
  const latestSensorName = latestSensor ? latestSensor.name : 'Datchik ulanmagan';
  const latestSensorTime = latestSensor ? formatDateTime(latestSensor.created_at) : '';

  // Custom HTML Tooltip Generator funksiyasi
  const customTooltipHandler = (chartType, context) => {
    const { tooltip, chart } = context;
    
    // Agar tooltip ko'rinmasligi kerak bo'lsa
    if (tooltip.opacity === 0) {
      if (tooltipState.opacity !== 0) {
        setTooltipState(prev => ({ ...prev, opacity: 0 }));
      }
      return;
    }

    const dataIndex = tooltip.dataPoints[0].dataIndex;
    const chartPosition = chart.canvas.getBoundingClientRect();

    // Tooltip holatini React state-ga yuklaymiz
    setTooltipState({
      opacity: 1,
      left: chartPosition.left + window.scrollX + tooltip.caretX,
      top: chartPosition.top + window.scrollY + tooltip.caretY - 10,
      title: fullNames[dataIndex],
      value: Number(tooltip.dataPoints[0].raw).toFixed(1),
      date: timestamps[dataIndex],
      type: chartType
    });
  };

  // Chart sozlamalari (Options)
  const createChartOptions = (chartType) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: (context) => customTooltipHandler(chartType, context),
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  });

  // Harorat Grafigi Data
  const temperatureData = {
    labels,
    datasets: [
      {
        label: 'Harorat',
        data: orderedSensors.map(s => s.temperature ?? 0),
        borderColor: '#f97316',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
          gradient.addColorStop(1, 'rgba(249, 115, 22, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f97316',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    ]
  };

  // Namlik Grafigi Data
  const humidityData = {
    labels,
    datasets: [
      {
        label: 'Namlik',
        data: orderedSensors.map(s => s.humidity ?? 0),
        borderColor: '#3b82f6',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    ]
  };

  return (
    <div className="space-y-6 relative w-full overflow-hidden">
      
      {/* ─── REAL REACT PORTAL TOOLTIP ─── */}
      <div
        className="fixed z-50 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-2xl pointer-events-none transition-opacity duration-150 space-y-2 min-w-[180px]"
        style={{
          opacity: tooltipState.opacity,
          top: tooltipState.top,
          left: tooltipState.left,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
          <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="font-bold text-slate-200 text-xs truncate max-w-[150px]">
            {tooltipState.title}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {tooltipState.type === 'Harorat' ? (
              <Thermometer className="w-4 h-4 text-orange-500" />
            ) : (
              <Droplets className="w-4 h-4 text-blue-500" />
            )}
            <span>{tooltipState.type}:</span>
          </div>
          <span className="text-sm font-extrabold text-white">
            {tooltipState.value} {tooltipState.type === 'Harorat' ? '°C' : '%'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span className="font-medium tracking-wide">{tooltipState.date}</span>
        </div>
      </div>

      {/* Header Secion */}
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

      {/* ─── REAL VAQTDA O'ZGARUVCHAN JORIY KARTALAR PANELİ ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Joriy Harorat Kartasi */}
        <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-2xl border border-orange-100 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
          <div className="space-y-2 min-w-0">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Real-time Harorat
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-800 tracking-tight transition-all duration-300">
                {currentTemp}
              </span>
              <span className="text-xl font-bold text-slate-500">°C</span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-[250px]">
              Datchik: <span className="font-semibold text-slate-600">{latestSensorName}</span>
            </p>
          </div>
          <div className="p-4 bg-orange-500/10 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
            <Thermometer className="w-8 h-8" />
          </div>
          {latestSensor && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-orange-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] text-slate-500 font-medium">{latestSensorTime.split(' ')[1]}</span>
            </div>
          )}
        </div>

        {/* Joriy Namlik Kartasi */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
          <div className="space-y-2 min-w-0">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Real-time Namlik
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-800 tracking-tight transition-all duration-300">
                {currentHum}
              </span>
              <span className="text-xl font-bold text-slate-500">%</span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-[250px]">
              Datchik: <span className="font-semibold text-slate-600">{latestSensorName}</span>
            </p>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
            <Droplets className="w-8 h-8" />
          </div>
          {latestSensor && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-blue-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] text-slate-500 font-medium">{latestSensorTime.split(' ')[1]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Charts Panel */}
      {sensors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Temperature Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full min-w-0">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-500" />
                Harorat Ko'rsatkichlari (°C)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Datchiklarning joriy harorat darajalari tahlili</p>
            </div>
            <div className="h-[220px] w-full">
              <Line data={temperatureData} options={createChartOptions('Harorat')} />
            </div>
          </div>

          {/* Humidity Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full min-w-0">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                Namlik Ko'rsatkichlari (%)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Datchiklarning joriy namlik darajalari tahlili</p>
            </div>
            <div className="h-[220px] w-full">
              <Line data={humidityData} options={createChartOptions('Namlik')} />
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
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