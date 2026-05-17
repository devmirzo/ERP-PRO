import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, Plus, MapPin, Phone, Building2, UserCircle, Briefcase, X, CheckCircle2, Edit, Trash2, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Loader } from '../components/Loader';

export const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    cli_id: '',
    company_name: '',
    contact_person: '',
    phone: '',
    address: '',
    status: 'Faol'
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Faol': return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
      case 'Nofaol': return 'bg-slate-100 text-slate-700 ring-slate-600/20';
      case 'Qarzdor': return 'bg-red-100 text-red-700 ring-red-600/20';
      default: return 'bg-slate-100 text-slate-700 ring-slate-600/20';
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ cli_id: `CLI-${Math.floor(Math.random() * 10000)}`, company_name: '', contact_person: '', phone: '', address: '', status: 'Faol' });
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingId(client.id);
    setFormData({
      cli_id: client.cli_id,
      company_name: client.company_name,
      contact_person: client.contact_person,
      phone: client.phone,
      address: client.address,
      status: client.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm("Rostdan ham bu mijozni o'chirmoqchimisiz?")) {
      try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
        fetchClients();
      } catch(error) {
        console.error(error);
        alert("O'chirishda xatolik! Mijoz boshqa jadvallarga bog'langan bo'lishi mumkin.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      if (editingId) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert("Xato: " + (error?.message || JSON.stringify(error)));
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mijozlar</h1>
          <p className="text-sm text-slate-500 mt-1">Hamkorlar va mijozlar ro'yxatini boshqarish</p>
        </div>
        <button onClick={openAddModal} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi Mijoz
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Firma yoki mas'ul shaxs qidiruvi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
        </div>
      </div>

      {loading ? (
        <Loader variant="block" text="Mijozlar yuklanmoqda..." />
      ) : filteredClients.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">Mijoz topilmadi</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group relative">
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(client)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Tahrirlash"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(client.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="O'chirish"><Trash2 className="w-4 h-4"/></button>
              </div>

              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 bg-blue-100 text-blue-600`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="pr-12">
                    <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{client.company_name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <UserCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800">{client.contact_person}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  {client.phone}
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{client.address}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal oynasi */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <><Edit className="w-5 h-5 text-blue-600"/> Mijozni Tahrirlash</> : <><Plus className="w-5 h-5 text-blue-600"/> Yangi Mijoz Qo'shish</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mijoz ID (Avto)</label>
                  <input required type="text" name="cli_id" value={formData.cli_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 text-slate-500 cursor-not-allowed" placeholder="Avtomatik..." disabled={true}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Firma / Mijoz Nomi</label>
                  <input required type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Masalan: Farg'ona Quruq Meva"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mas'ul Shaxs</label>
                  <input required type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Aliyev Vali"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon Raqami</label>
                  <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="+998 90 123 45 67"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manzil</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Masalan: Farg'ona shahar..."/>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mijoz Holati</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm">
                  <option value="Faol">Faol</option>
                  <option value="Nofaol">Nofaol</option>
                  <option value="Qarzdor">Qarzdor</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">Bekor qilish</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
