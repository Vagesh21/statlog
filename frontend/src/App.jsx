import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SystemMetrics from './components/SystemMetrics';
import DockerContainers from './components/DockerContainers';
import DongleStatus from './components/DongleStatus';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" />;
}

function App() {
  const { token } = useAuth();

  return (
    <Router>
      <div className="min-h-screen">
        <ToastContainer theme="dark" position="top-right" />
        {token ? (
          <div className="flex">
            <Sidebar />
            <div className="flex-1 ml-64">
              <Routes>
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/system" element={<PrivateRoute><SystemMetrics /></PrivateRoute>} />
                <Route path="/docker" element={<PrivateRoute><DockerContainers /></PrivateRoute>} />
                <Route path="/dongle" element={<PrivateRoute><DongleStatus /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
