import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layouts } from "./layouts/Layouts";
import { Home, Inventory, Warehouse, Sales, Employee, Reports, Sensors, Clients, Login, Profile, Settings, Messages } from "./pages/index";
import { Loader } from "./components/Loader";

// Ruxsatsiz kirish sahifasi (redirect loop oldini oladi)
const Unauthorized = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center gap-4">
    <div className="p-4 bg-red-100 rounded-full text-red-600 text-4xl">🚫</div>
    <h2 className="text-2xl font-bold text-slate-800">Ruxsat Yo'q</h2>
    <p className="text-slate-500">Bu sahifaga kirishga ruxsatingiz yo'q.</p>
    <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
      Bosh sahifaga qaytish
    </a>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader variant="fullscreen" text="Yuklanmoqda..." />;
  if (!user) return <Navigate to="/login" replace />;

  // FIX: / ga redirect o'rniga /unauthorized ga yuboriladi (cheksiz loop yo'q)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layouts />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />

          <Route path="inventory" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger", "Sotuvchi"]}>
              <Inventory />
            </ProtectedRoute>
          } />

          <Route path="warehouse" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger"]}>
              <Warehouse />
            </ProtectedRoute>
          } />

          <Route path="sales" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger", "Sotuvchi"]}>
              <Sales />
            </ProtectedRoute>
          } />

          <Route path="employee" element={
            <ProtectedRoute allowedRoles={["Bosh Admin"]}>
              <Employee />
            </ProtectedRoute>
          } />

          <Route path="clients" element={
            <ProtectedRoute allowedRoles={["Bosh Admin"]}>
              <Clients />
            </ProtectedRoute>
          } />

          <Route path="reports" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger"]}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="sensors" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger", "Sotuvchi"]}>
              <Sensors />
            </ProtectedRoute>
          } />

          <Route path="profile" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger", "Sotuvchi"]}>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="settings" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger", "Sotuvchi"]}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="messages" element={
            <ProtectedRoute allowedRoles={["Bosh Admin", "Meneger", "Sotuvchi"]}>
              <Messages />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}
