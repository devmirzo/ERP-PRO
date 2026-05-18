import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Shield, DollarSign, Building, Key, Save, UserCircle } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [salesBonus, setSalesBonus] = useState(0);

  useEffect(() => {
    const fetchSalesBonus = async () => {
      try {
        const { data: salesData } = await supabase
          .from('sales')
          .select('amount')
          .eq('employee_id', user.id);
        const revenue = salesData ? salesData.reduce((acc, sale) => acc + (Number(sale.amount) || 0), 0) : 0;
        setSalesBonus(revenue * 0.05);
      } catch (error) {
        console.error("Sales bonus error:", error);
      }
    };
    if (user?.id) {
      fetchSalesBonus();
    }
  }, [user]);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const phoneLocal = formData.phone ? formData.phone.replace(/^\+998/, '') : '';
  const emailLocal = formData.email ? formData.email.split('@')[0] : '';

  const formatPhoneLocal = (digits) => {
    if (!digits) return '';
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 5);
    const part3 = digits.slice(5, 7);
    const part4 = digits.slice(7, 9);
    
    let formatted = part1;
    if (part2) formatted += ' ' + part2;
    if (part3) formatted += ' ' + part3;
    if (part4) formatted += ' ' + part4;
    return formatted;
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneLocalChange = (e) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 9);
    setFormData(prev => ({ ...prev, phone: `+998${digits}` }));
  };

  const handleEmailLocalChange = (e) => {
    const value = e.target.value;
    const localPart = value.replace(/[^a-zA-Z0-9._-]/g, '');
    setFormData(prev => ({ ...prev, email: localPart ? `${localPart}@erppro.uz` : '' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      return showNotification("Iltimos, barcha maydonlarni to'ldiring!", "warning");
    }

    if (formData.phone.length !== 13) {
      return showNotification("Telefon raqami noto'g'ri shakllantirilgan. Iltimos, 9 xonali raqam kiriting!", "warning");
    }

    const emailParts = formData.email.split('@');
    if (!emailParts[0] || emailParts[1] !== 'erppro.uz') {
      return showNotification("Email manzili noto'g'ri shakllantirilgan!", "warning");
    }

    try {
      setSavingProfile(true);
      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local storage and context state
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('erp_user', JSON.stringify(updatedUser));
      
      showNotification("Profil ma'lumotlari muvaffaqiyatli yangilandi!", "success");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error(error);
      showNotification("Profilni saqlashda xatolik: " + error.message, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      return showNotification("Parol maydonlarini to'ldiring!", "warning");
    }

    if (passwordData.currentPassword !== user.password) {
      return showNotification("Joriy parol noto'g'ri!", "error");
    }

    if (passwordData.newPassword.length < 6) {
      return showNotification("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!", "warning");
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return showNotification("Yangi parollar mos kelmadi!", "error");
    }

    try {
      setSavingPassword(true);
      const { error } = await supabase
        .from('employees')
        .update({ password: passwordData.newPassword })
        .eq('id', user.id);

      if (error) throw error;

      // Update storage
      const updatedUser = { ...user, password: passwordData.newPassword };
      localStorage.setItem('erp_user', JSON.stringify(updatedUser));

      showNotification("Parol muvaffaqiyatli o'zgartirildi!", "success");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error(error);
      showNotification("Parolni yangilashda xatolik yuz berdi!", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shaxsiy Profil</h1>
        <p className="text-sm text-slate-500 mt-1">Shaxsiy ma'lumotlaringiz va parolni boshqarish</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center h-fit">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-4 border-white shadow-lg flex items-center justify-center text-white mb-4">
            <span className="text-3xl font-bold uppercase">{user?.name ? user.name.charAt(0) : 'U'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">{user?.name}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">{user?.email}</p>
          
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
            <Shield className="w-3.5 h-3.5" />
            {user?.role}
          </div>

          <div className="w-full border-t border-slate-100 mt-6 pt-6 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><Building className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Bo'lim / Departament</p>
                <p className="text-sm font-semibold text-slate-700">{user?.department || 'Kiritilmagan'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 text-slate-400 rounded-lg mt-1"><DollarSign className="w-5 h-5 text-emerald-500" /></div>
              <div className="space-y-1 w-full">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Ish haqi tafsilotlari</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between gap-4">
                    <span>O'zgarmas maosh:</span>
                    <span className="font-semibold text-slate-700">{(user?.base_salary || 0).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Oylik Bonus (5%):</span>
                    <span className="font-semibold text-emerald-600">+ {((user?.base_salary || 0) * 0.05).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Savdo Bonusi (5%):</span>
                    <span className="font-semibold text-purple-600">+ {(salesBonus || 0).toLocaleString()} so'm</span>
                  </div>
                  <div className="border-t border-slate-100 pt-1.5 flex justify-between gap-4 text-sm font-bold text-slate-800 mt-1">
                    <span>Jami oylik:</span>
                    <span className="text-blue-600">{((user?.base_salary || 0) * 1.05 + salesBonus).toLocaleString()} so'm</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><UserCircle className="w-5 h-5 text-purple-500" /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Xodim ID</p>
                <p className="text-sm font-semibold text-slate-700">{user?.emp_id || 'Avtomatik'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit profile & Password forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Profil Ma'lumotlarini Tahrirlash
            </h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">To'liq ismingiz</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="text" name="name" value={formData.name} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email manzili</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <input 
                      required 
                      type="text" 
                      name="email_local" 
                      value={emailLocal} 
                      onChange={handleEmailLocalChange} 
                      placeholder="foydalanuvchi"
                      className="w-full pl-10 pr-32 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    />
                    <span className="absolute right-2 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs rounded-lg select-none">
                      @erppro.uz
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Telefon raqam</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <span className="absolute left-10 text-sm font-semibold text-slate-500 select-none bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    +998
                  </span>
                  <input 
                    required 
                    type="text" 
                    name="phone_local" 
                    value={formatPhoneLocal(phoneLocal)} 
                    onChange={handlePhoneLocalChange} 
                    placeholder="90 123 45 67"
                    className="w-full pl-24 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingProfile} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm">
                  {savingProfile ? 'Saqlanmoqda...' : <><Save className="w-4 h-4" /> Ma'lumotlarni saqlash</>}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Tizim Parolini O'zgartirish
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Joriy parol</label>
                <input required type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Yangi parol</label>
                  <input required type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Yangi parolni tasdiqlash</label>
                  <input required type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="••••••••" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingPassword} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-semibold shadow-sm">
                  {savingPassword ? 'Yangilanmoqda...' : <><Key className="w-4 h-4" /> Parolni yangilash</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
