import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout va Sahifalarni import qilish
import { Layouts } from './layouts/Layouts';
import { Home, Inventory, Warehouse, Sales, Employee, Reports, Sensors, Clients, Login, Profile, Settings, Messages } from './pages/index';

import { Loader } from './components/Loader';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader variant="fullscreen" text="Yuklanmoqda..." />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Agar roli to'g'ri kelmasa, ruxsat etilgan birinchi sahifasiga yoki Bosh sahifaga yuboriladi
    return <Navigate to="/" replace />;
  }

  return children;
};

// MUHIM: Bu yerda 'export default' bo'lishi shart
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layouts />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          
          {/* Sotuvchi ruxsatlari: Inventory, Sales, Sensors */}
          {/* Meneger ruxsatlari: Inventory, Warehouse, Sales, Reports, Sensors */}
          {/* Bosh Admin: Hamma narsa */}
          
          <Route path="inventory" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger', 'Sotuvchi']}>
              <Inventory />
            </ProtectedRoute>
          } />
          
          <Route path="warehouse" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger']}>
              <Warehouse />
            </ProtectedRoute>
          } />
          
          <Route path="sales" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger', 'Sotuvchi']}>
              <Sales />
            </ProtectedRoute>
          } />
          
          <Route path="employee" element={
            <ProtectedRoute allowedRoles={['Bosh Admin']}>
              <Employee />
            </ProtectedRoute>
          } />
          
          <Route path="clients" element={
            <ProtectedRoute allowedRoles={['Bosh Admin']}>
              <Clients />
            </ProtectedRoute>
          } />
          
          <Route path="reports" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger']}>
              <Reports />
            </ProtectedRoute>
          } />
          
          <Route path="sensors" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger', 'Sotuvchi']}>
              <Sensors />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger', 'Sotuvchi']}>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger', 'Sotuvchi']}>
              <Settings />
            </ProtectedRoute>
          } />
          
          <Route path="messages" element={
            <ProtectedRoute allowedRoles={['Bosh Admin', 'Meneger', 'Sotuvchi']}>
              <Messages />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}