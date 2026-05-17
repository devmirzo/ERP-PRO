import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const Layouts = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 font-inter">
      {/* Yon menyu */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Asosiy kontent qismi */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Yuqori panel */}
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        {/* Sahifalar */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};