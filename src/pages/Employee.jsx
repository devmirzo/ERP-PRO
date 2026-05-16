import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, Plus, Filter, MoreVertical, Mail, Phone, Building, Briefcase, X, CheckCircle2, DollarSign, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Employee = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('Barchasi');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    emp_id: '',
    name: '',
    role: '',
    department: 'Sotuv',
    base_salary: '',
    email: '',
    phone: '',
    password: '',
    status: 'Faol'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Fetch employees and their sales to calculate commission
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          sales (
            amount
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calculate total salary (base + 5% commission)
      const empData = (data || []).map(emp => {
        const totalSales = emp.sales?.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0) || 0;
        const commission = totalSales * 0.05; // 5% bonus
        return {
          ...emp,
          commission,
          total_salary: (Number(emp.base_salary) || 0) + commission
        };
      });

      setEmployees(empData);
    } catch (error) {
      console.error("Error fetching employees:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentColor = (dept) => {
    switch (dept) {
      case 'Sotuv': return 'bg-blue-100 text-blue-700 ring-blue-600/20';
      case 'Moliya': return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
      case 'IT': return 'bg-purple-100 text-purple-700 ring-purple-600/20';
      case 'Logistika': return 'bg-amber-100 text-amber-700 ring-amber-600/20';
      default: return 'bg-slate-100 text-slate-700 ring-slate-600/20';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ emp_id: `EMP-${Math.floor(Math.random() * 10000)}`, name: '', role: '', department: 'Sotuv', base_salary: '', email: '', phone: '', password: '', status: 'Faol' });
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingId(emp.id);
    setFormData({
      emp_id: emp.emp_id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      base_salary: emp.base_salary,
      email: emp.email,
      phone: emp.phone,
      password: emp.password || '',
      status: emp.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Rostdan ham bu xodimni o'chirmoqchimisiz?")) {
      try {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        fetchEmployees();
      } catch (error) {
        console.error(error);
        alert("O'chirishda xato! Xodim ma'lumotlari boshqa joyga bog'langan bo'lishi mumkin.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        base_salary: parseFloat(formData.base_salary) || 0
      };

      if (editingId) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error(error);
      alert("Saqlashda xatolik yuz berdi!");
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.role?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDept === 'Barchasi' || emp.department === filterDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, searchTerm, filterDept]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Xodimlar</h1>
          <p className="text-sm text-slate-500 mt-1">Kompaniya xodimlari va ularning oylik maoshlari</p>
        </div>
        <button onClick={openAddModal} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi Xodim
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Ism yoki lavozim qidiruvi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
            <option value="Barchasi">Barcha bo'limlar</option>
            <option value="Sotuv">Sotuv</option>
            <option value="Moliya">Moliya</option>
            <option value="IT">IT</option>
            <option value="Logistika">Logistika</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Yuklanmoqda...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-white rounded-xl border">Xodimlar topilmadi.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group relative">
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => openEditModal(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white/50 rounded-md transition-colors"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white/50 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>

              <div className="p-6 text-center relative">
                <div className={`absolute top-0 left-0 w-full h-24 ${getDepartmentColor(emp.department).split(' ')[0]} opacity-30`}></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto rounded-full border-4 border-white shadow-sm overflow-hidden bg-slate-100 mb-4 flex items-center justify-center text-2xl font-bold text-slate-400">
                    {emp.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{emp.name}</h3>
                  <p className="text-sm font-medium text-blue-600 mb-3">{emp.role}</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${getDepartmentColor(emp.department)}`}>
                    {emp.department}
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600"><Mail className="w-4 h-4 text-slate-400" /> <span className="truncate">{emp.email || 'Kiritilmagan'}</span></div>
                <div className="flex items-center gap-3 text-sm text-slate-600"><Phone className="w-4 h-4 text-slate-400" /> {emp.phone || 'Kiritilmagan'}</div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-emerald-50/30">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Asosiy Maosh: ${emp.base_salary}</span>
                  <span className="text-emerald-600 font-semibold">+ ${emp.commission} (Bonus)</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-700">Jami Maosh:</span>
                  <span className="text-lg text-emerald-600">${emp.total_salary.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Edit className="w-5 h-5 text-blue-600"/> : <Plus className="w-5 h-5 text-blue-600"/>}
                {editingId ? "Xodimni Tahrirlash" : "Yangi Xodim Qo'shish"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Xodim ID (Avto)</label>
                   <input required type="text" name="emp_id" value={formData.emp_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={editingId ? true : false}/>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Bo'lim</label>
                   <select required name="department" value={formData.department} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                     <option value="Sotuv">Sotuv</option>
                     <option value="Moliya">Moliya</option>
                     <option value="IT">IT</option>
                     <option value="Logistika">Logistika</option>
                   </select>
                 </div>
               </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism Sharif</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Aliyev Vali"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lavozimi (Rol)</label>
                  <select required name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="" disabled>Tanlang...</option>
                    <option value="Sotuvchi">Sotuvchi</option>
                    <option value="Meneger">Meneger</option>
                    <option value="Bosh Admin">Bosh Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asosiy Oylik ($)</label>
                  <input required type="number" name="base_salary" value={formData.base_salary} onChange={handleChange} min="0" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="500"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+998 90 ..."/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                     <option value="Faol">Faol</option>
                     <option value="Ta'tilda">Ta'tilda</option>
                     <option value="Bo'shatilgan">Bo'shatilgan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (Login uchun)</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ali@erp.com"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parol (Kirish uchun)</label>
                  <input required type="text" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Yangi parol..."/>
                </div>
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