import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Activity, 
  Container, 
  Radio, 
  Settings, 
  LogOut,
  Cpu,
  HardDrive
} from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/system', icon: Activity, label: 'System Metrics' },
    { path: '/docker', icon: Container, label: 'Docker Containers' },
    { path: '/dongle', icon: Radio, label: 'Dongle Monitor' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-dark-card border-r border-dark-border flex flex-col">
      <div className="p-6 border-b border-dark-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pi Monitor</h1>
            <p className="text-xs text-gray-400">v1.0.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-dark-hover'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors w-full"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
