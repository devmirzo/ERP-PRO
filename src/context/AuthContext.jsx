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
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Employees bazasidan email va parolni tekshiramiz
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error("Email yoki parol noto'g'ri!");
      }

      if (data.status !== 'Faol') {
        throw new Error("Sizning akkauntingiz faol emas. Adminga murojaat qiling!");
      }

      // Login muvaffaqiyatli
      setUser(data);
      localStorage.setItem('erp_user', JSON.stringify(data));
      return { success: true, user: data };
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
