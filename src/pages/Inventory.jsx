import React, { useState, useMemo, useEffect } from 'react';
import { Package, Search, Filter, Plus, Edit, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Elektronika',
    stock_level: '',
    unit: 'dona',
    price: ''
  });

  // Fetch data
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error.message);
      alert("Ma'lumotlarni yuklashda xatolik yuz berdi!");
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (stock) => {
    if (stock > 50) return { label: 'Yetarli', color: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' };
    if (stock > 0) return { label: 'Kam qolgan', color: 'bg-amber-100 text-amber-700 ring-amber-600/20' };
    return { label: 'Tugagan', color: 'bg-red-100 text-red-700 ring-red-600/20' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ sku: '', name: '', category: 'Elektronika', stock_level: '', unit: 'dona', price: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      stock_level: product.stock_level,
      unit: product.unit,
      price: product.price
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const stock = parseInt(formData.stock_level) || 0;
      const statusLabel = getStatus(stock).label;
      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        stock_level: stock,
        unit: formData.unit,
        price: parseFloat(formData.price) || 0,
        status: statusLabel
      };

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('inventory')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('inventory')
          .insert([payload]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchProducts(); // Refresh list
    } catch (error) {
      console.error("Error saving product:", error.message);
      alert("Saqlashda xatolik yuz berdi! SKU takrorlanmaganiga ishonch hosil qiling.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Rostdan ham bu mahsulotni o'chirmoqchimisiz?")) {
      try {
        const { error } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchProducts(); // Refresh list
      } catch (error) {
        console.error("Error deleting product:", error.message);
        alert("O'chirishda xatolik yuz berdi. Mahsulot boshqa jadvallarga bog'langan bo'lishi mumkin.");
      }
    }
  };

  // Filter
  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Hisob-kitob (Metrics)
  const metrics = useMemo(() => {
    const totalItems = products.length;
    const lowStock = products.filter(p => p.stock_level > 0 && p.stock_level <= 50).length;
    const outOfStock = products.filter(p => p.stock_level === 0).length;
    return { totalItems, lowStock, outOfStock };
  }, [products]);

  return (
    <div className="space-y-6 relative">
      {/* Sarlavha qismi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventarizatsiya</h1>
          <p className="text-sm text-slate-500 mt-1">Ombordagi barcha tovarlar va ularning qoldig'i (Supabase)</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Yangi Tovar
        </button>
      </div>

      {/* Statistika Kartochkalari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package className="w-5 h-5"/></div>
            <h3 className="text-sm font-medium text-slate-500">Jami Tovar Turlari</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.totalItems} ta</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><AlertCircle className="w-5 h-5"/></div>
            <h3 className="text-sm font-medium text-slate-500">Kam qolganlar (≤50)</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.lowStock} ta</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><X className="w-5 h-5"/></div>
            <h3 className="text-sm font-medium text-slate-500">Tugaganlar</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.outOfStock} ta</p>
        </div>
      </div>

      {/* Qidiruv va Jadval qismi */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tovar nomi yoki SKU qidiruvi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mahsulot Nomi</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategoriya</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qoldiq</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Narx</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Holati</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-500">Yuklanmoqda...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-500">Hech narsa topilmadi</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const statusObj = getStatus(product.stock_level);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">{product.sku}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{product.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        {product.stock_level} <span className="text-xs text-slate-400 font-normal ml-1">{product.unit}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${product.price.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${statusObj.color}`}>
                          {statusObj.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <><Edit className="w-5 h-5 text-blue-600"/> Tovarni Tahrirlash</> : <><Plus className="w-5 h-5 text-blue-600"/> Yangi Tovar Qo'shish</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU (Kod)</label>
                  <input required type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Masalan: EL-001" disabled={editingId ? true : false}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kategoriya</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm">
                    <option value="Quruq meva 1-sort">Quruq meva 1-sort</option>
                    <option value="Quruq meva 2-sort">Quruq meva 2-sort</option>
                    <option value="Quruq meva 3-sort">Quruq meva 3-sort</option>
                    <option value="Don don">Don don</option>
                    <option value="Ho'l meva 1-sort">Ho'l meva 1-sort</option>
                    <option value="Ho'l meva 2-sort">Ho'l meva 2-sort</option>
                    <option value="Ho'l meva 3-sort">Ho'l meva 3-sort</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mahsulot Nomi</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Noutbuk HP Pavilion"/>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qoldiq</label>
                  <input required type="number" name="stock_level" value={formData.stock_level} onChange={handleChange} min="0" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">O'lchov</label>
                  <select name="unit" value={formData.unit} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm">
                    <option value="dona">Dona</option>
                    <option value="kg">Kg</option>
                    <option value="quti">Quti</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Narxi ($)</label>
                  <input required type="number" name="price" value={formData.price} onChange={handleChange} min="0" step="0.01" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"/>
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