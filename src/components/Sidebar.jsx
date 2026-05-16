import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Warehouse as WarehouseIcon, ShoppingCart, Users, Briefcase, FileText, Radio, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Bosh sahifa', path: '/', icon: LayoutDashboard, roles: ['Bosh Admin', 'Meneger', 'Sotuvchi'] },
    { name: 'Inventarizatsiya', path: '/inventory', icon: Package, roles: ['Bosh Admin', 'Meneger', 'Sotuvchi'] },
    { name: 'Ombor', path: '/warehouse', icon: WarehouseIcon, roles: ['Bosh Admin', 'Meneger'] },
    { name: 'Sotuvlar', path: '/sales', icon: ShoppingCart, roles: ['Bosh Admin', 'Meneger', 'Sotuvchi'] },
    { name: 'Xodimlar', path: '/employee', icon: Users, roles: ['Bosh Admin'] },
    { name: 'Mijozlar', path: '/clients', icon: Briefcase, roles: ['Bosh Admin'] },
    { name: 'Hisobotlar', path: '/reports', icon: FileText, roles: ['Bosh Admin', 'Meneger'] },
    { name: 'Sensorlar', path: '/sensors', icon: Radio, roles: ['Bosh Admin', 'Meneger', 'Sotuvchi'] },
  ];

  // Foydalanuvchi roliga qarab menyuni filtrlash
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300">
      <div className="h-16 flex items-center justify-center border-b border-slate-800">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-xl">E</span>
          </div>
          <span className="font-bold text-xl tracking-wider">ERP PRO</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
          <span>Sozlamalar</span>
        </button>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Chiqish</span>
        </button>
      </div>
    </aside>
  );
};
