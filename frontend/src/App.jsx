import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import CustomerLogin from './pages/CustomerLogin.jsx';
import CustomerShop from './pages/CustomerShop.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Menu from './pages/Menu.jsx';
import Orders from './pages/Orders.jsx';
import Customers from './pages/Customers.jsx';
import Faqs from './pages/Faqs.jsx';
import Conversations from './pages/Conversations.jsx';
import Settings from './pages/Settings.jsx';
import Layout from './components/Layout.jsx';

function isAuthed() {
  return !!localStorage.getItem('smartserve_token');
}

function Protected({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function CustomerProtected({ children }) {
  if (!localStorage.getItem('smartserve_customer_token')) return <Navigate to="/customer/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/order" element={<CustomerProtected><CustomerShop /></CustomerProtected>} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/menu" element={<Protected><Menu /></Protected>} />
      <Route path="/orders" element={<Protected><Orders /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/faqs" element={<Protected><Faqs /></Protected>} />
      <Route path="/conversations" element={<Protected><Conversations /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
