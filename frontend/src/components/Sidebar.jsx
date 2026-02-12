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
  X
} from 'lucide-react';

function Sidebar({ open, setOpen, collapsed, setCollapsed }) {
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
    <>
      {open && (
        <button
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu overlay"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen bg-dark-card border-r border-dark-border flex flex-col transition-all duration-200
        ${collapsed ? 'w-20' : 'w-64'}
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center space-x-3 text-left"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setOpen(false);
                return;
              }
              setCollapsed(!collapsed);
            }}
            title={collapsed ? 'Expand menu' : 'Hide menu'}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Cpu size={24} />
          </div>
          {!collapsed && (
            <div>
            <h1 className="text-xl font-bold">Pi Monitor</h1>
            <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          )}
          </button>
          <button className="lg:hidden p-1 rounded hover:bg-dark-hover" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-dark-hover'
              }`}
            >
              <Icon size={20} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-dark-border ${collapsed ? 'px-2' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          {!collapsed && (
            <div>
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-gray-400">Administrator</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`flex items-center text-red-400 hover:text-red-300 transition-colors w-full ${collapsed ? 'justify-center' : 'space-x-2'}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
      </aside>
    </>
  );
}

export default Sidebar;
