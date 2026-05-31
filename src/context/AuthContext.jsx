import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sahifa yuklanganda localStorage dan foydalanuvchini tekshiramiz
    const storedUser = localStorage.getItem('erp_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('erp_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // ✅ FIX: password SELECT dan olib tashlandi - faqat autentifikatsiya uchun ishlatiladi
      const { data, error } = await supabase
        .from('employees')
        .select('id, emp_id, name, role, email, department, base_salary, phone, status, avatar')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error("Email yoki parol noto'g'ri!");
      }

      if (data.status !== 'Faol') {
        throw new Error("Sizning akkauntingiz faol emas. Adminga murojaat qiling!");
      }

      // ✅ FIX: password localStorage ga SAQLANMAYDI
      const { ...safeUser } = data;
      setUser(safeUser);
      localStorage.setItem('erp_user', JSON.stringify(safeUser));
      return { success: true, user: safeUser };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
