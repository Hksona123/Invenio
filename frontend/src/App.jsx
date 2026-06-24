import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import './index.css';

const pageTitles = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/customers': 'Customers',
  '/orders': 'Orders',
};

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
      <div className="main-content">
        <TopBar onMenuToggle={() => setSidebarOpen(p => !p)} />
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/products"  element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/orders"    element={<Orders />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  );
}
