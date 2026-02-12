import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import GaugeChart from './charts/GaugeChart';
import DonutChart from './charts/DonutChart';
import TimeSeriesChart from './charts/TimeSeriesChart';
import { Activity, Cpu, HardDrive, Thermometer, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { normalizeLinkUrl } from '../utils/links';

let cachedDashboardSummary = null;
let cachedDashboardHealth = null;
let cachedDashboardHistory = [];
let cachedDashboardSettings = null;

function getServiceLogo(service) {
  try {
    const url = normalizeLinkUrl(service?.url || '');
    const parsed = new URL(url);
    return `${parsed.origin}/favicon.ico`;
  } catch (e) {
    return null;
  }
}

function Dashboard() {
  const { API_URL } = useAuth();
  const [summary, setSummary] = useState(cachedDashboardSummary);
  const [health, setHealth] = useState(cachedDashboardHealth);
  const [history, setHistory] = useState(cachedDashboardHistory);
  const [refreshRate, setRefreshRate] = useState(2);
  const [loading, setLoading] = useState(!cachedDashboardSummary);
  const [settings, setSettings] = useState(cachedDashboardSettings);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, Math.max(refreshRate, 2) * 1000);
    return () => clearInterval(interval);
  }, [refreshRate]);

  const fetchData = async () => {
    try {
      const [summaryRes, healthRes, historyRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/metrics/summary`),
        axios.get(`${API_URL}/api/health`),
        axios.get(`${API_URL}/api/metrics/history`),
        axios.get(`${API_URL}/api/settings/resolved/${window.location.hostname}`)
      ]);

      const summaryData = summaryRes.data.data || summaryRes.data;
      const healthData = healthRes.data.data || healthRes.data;
      const historyData = historyRes.data.data || historyRes.data;
      const settingsData = settingsRes.data;

      const now = Date.now();
      if (now - lastUpdateRef.current > 900) {
        cachedDashboardSummary = summaryData;
        cachedDashboardHealth = healthData;
        cachedDashboardHistory = Array.isArray(historyData) ? historyData : [];
        cachedDashboardSettings = settingsData;
        setSummary(summaryData);
        setHealth(healthData);
        if (Array.isArray(historyData)) {
          setHistory(historyData);
        }
        setSettings(settingsData);
        lastUpdateRef.current = now;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to fetch metrics');
    }
  };

  if (loading || !summary) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center text-2xl">Loading dashboard...</div>
      </div>
    );
  }

  const visibleQuickLinks = (settings?.service_links || []).filter(
    (l) => l.enabled && (l.show_on_dashboard ?? true)
  );

  const getHealthBadge = () => {
    const colors = {
      healthy: 'bg-green-500',
      warning: 'bg-yellow-500',
      critical: 'bg-red-500'
    };
    
    return (
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${colors[health?.status] || 'bg-gray-500'}`}>
        {health?.status === 'healthy' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
        <span className="font-semibold capitalize">{health?.status || 'unknown'}</span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {visibleQuickLinks.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Quick Access Links</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleQuickLinks.map((service) => (
              <a
                key={service.id}
                href={normalizeLinkUrl(service.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-dark-hover p-4 rounded border border-dark-border hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {getServiceLogo(service) ? (
                    <img
                      src={getServiceLogo(service)}
                      alt={service.name}
                      className="w-6 h-6 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="text-2xl">{service.icon || '🔗'}</span>
                  <div>
                    <div className="font-semibold">{service.name}</div>
                    <div className="text-xs text-gray-400 truncate">{normalizeLinkUrl(service.url)}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold">System Dashboard</h1>
          <p className="text-gray-400">Real-time monitoring of your Raspberry Pi</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {getHealthBadge()}
          <select
            value={refreshRate}
            onChange={(e) => setRefreshRate(Number(e.target.value))}
            className="input"
          >
            <option value={1}>1s refresh</option>
            <option value={2}>2s refresh</option>
            <option value={3}>3s refresh</option>
            <option value={5}>5s refresh</option>
          </select>
        </div>
      </div>

      {/* Status Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cpu className="text-blue-500" size={24} />
              <h3 className="text-lg font-semibold">CPU Usage</h3>
            </div>
          </div>
          <div className="text-3xl font-bold">{summary.cpu.overall_usage.toFixed(1)}%</div>
          <div className="text-sm text-gray-400 mt-2">
            Load: {summary.cpu.load_average['1_min'].toFixed(2)} / {summary.cpu.load_average['5_min'].toFixed(2)} / {summary.cpu.load_average['15_min'].toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="text-green-500" size={24} />
              <h3 className="text-lg font-semibold">Memory</h3>
            </div>
          </div>
          <div className="text-3xl font-bold">{summary.memory.percent.toFixed(1)}%</div>
          <div className="text-sm text-gray-400 mt-2">
            {(summary.memory.used / (1024 ** 3)).toFixed(2)} GB / {(summary.memory.total / (1024 ** 3)).toFixed(2)} GB
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Thermometer className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold">Temperature</h3>
            </div>
          </div>
          <div className="text-3xl font-bold">{summary.temperature.cpu_temp.toFixed(1)}°C</div>
          <div className="text-sm text-gray-400 mt-2">
            {summary.temperature.cpu_temp > 80 ? 'Critical' : summary.temperature.cpu_temp > 70 ? 'Warning' : 'Normal'}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="text-purple-500" size={24} />
              <h3 className="text-lg font-semibold">Disk Usage</h3>
            </div>
          </div>
          <div className="text-3xl font-bold">
            {summary.disk.filesystems[0]?.percent.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Root filesystem
          </div>
        </div>
      </div>

      {/* Gauges and Donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-6">System Status</h3>
          <div className="flex flex-wrap justify-around gap-4">
            <GaugeChart
              value={summary.cpu.overall_usage}
              maxValue={100}
              label="CPU %"
              thresholds={{ warning: 70, critical: 90 }}
            />
            <GaugeChart
              value={summary.temperature.cpu_temp}
              maxValue={100}
              label="Temperature °C"
              thresholds={{ warning: 70, critical: 80 }}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-6">Resource Usage</h3>
          <div className="flex flex-wrap justify-around gap-4">
            <DonutChart
              value={summary.memory.percent}
              maxValue={100}
              label="RAM"
              color="#10b981"
            />
            <DonutChart
              value={summary.disk.filesystems[0]?.percent || 0}
              maxValue={100}
              label="Disk"
              color="#8b5cf6"
            />
          </div>
        </div>
      </div>

      {/* Historical Charts */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Historical Metrics (Last 15 minutes)</h3>
        <TimeSeriesChart
          data={history}
          dataKeys={['cpu', 'memory', 'temp']}
          colors={['#3b82f6', '#10b981', '#ef4444']}
          height={300}
        />
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Wifi size={24} className="text-blue-500" />
            <h3 className="text-xl font-semibold">Network Interfaces</h3>
          </div>
          <div className="space-y-3">
            {summary.network.interfaces.map((iface, index) => (
              <div key={index} className="bg-dark-hover p-3 rounded">
                <div className="font-semibold">{iface.name}</div>
                {iface.addresses.map((addr, i) => (
                  <div key={i} className="text-sm text-gray-400">
                    {addr.type}: {addr.address}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">CPU Per Core</h3>
          <div className="space-y-2">
            {summary.cpu.per_core_usage.map((usage, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>Core {index}</span>
                  <span>{usage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-dark-hover rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
