import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Container, Play, Square, RotateCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';

let cachedContainers = [];

function DockerContainers() {
  const { API_URL } = useAuth();
  const [containers, setContainers] = useState(cachedContainers);
  const [filteredContainers, setFilteredContainers] = useState(cachedContainers);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(cachedContainers.length === 0);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (search) {
      setFilteredContainers(
        containers.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.image.toLowerCase().includes(search.toLowerCase())
        )
      );
    } else {
      setFilteredContainers(containers);
    }
  }, [search, containers]);

  const fetchContainers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/docker/containers`);
      const data = response.data.data || response.data;
      const nextContainers = data.containers || [];
      cachedContainers = nextContainers;
      setContainers(nextContainers);
      setFilteredContainers(nextContainers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching containers:', error);
      if (error.response?.status === 500) {
        toast.error('Docker is not available or not running');
      }
    }
  };

  const handleAction = async (containerId, action) => {
    try {
      await axios.post(`${API_URL}/api/docker/containers/${containerId}/${action}`);
      toast.success(`Container ${action}ed successfully`);
      setTimeout(fetchContainers, 1000);
    } catch (error) {
      toast.error(`Failed to ${action} container`);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'running') return 'text-green-500';
    if (status === 'exited') return 'text-red-500';
    return 'text-yellow-500';
  };

  if (loading) {
    return <div className="p-4 md:p-8">Loading containers...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Docker Containers</h1>
          <p className="text-gray-400">Manage and monitor your Docker containers</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search containers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full sm:w-64"
            />
          </div>
          <button onClick={fetchContainers} className="btn-secondary flex items-center space-x-2">
            <RotateCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Container Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-400">Total Containers</div>
          <div className="text-3xl font-bold">{containers.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Running</div>
          <div className="text-3xl font-bold text-green-500">
            {containers.filter(c => c.status === 'running').length}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Stopped</div>
          <div className="text-3xl font-bold text-red-500">
            {containers.filter(c => c.status === 'exited').length}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">Other</div>
          <div className="text-3xl font-bold text-yellow-500">
            {containers.filter(c => c.status !== 'running' && c.status !== 'exited').length}
          </div>
        </div>
      </div>

      {/* Containers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Image</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">CPU %</th>
                <th className="text-left py-3 px-4">Memory</th>
                <th className="text-left py-3 px-4">Ports</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContainers.map((container) => (
                <tr key={container.id} className="border-b border-dark-border hover:bg-dark-hover">
                  <td className="py-3 px-4 font-semibold">{container.name}</td>
                  <td className="py-3 px-4 text-sm font-mono">{container.image}</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${getStatusColor(container.status)}`}>
                      {container.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {container.stats?.cpu_percent !== undefined ? 
                      `${container.stats.cpu_percent}%` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {container.stats?.memory_percent !== undefined ? (
                      <div>
                        <div className="text-sm">{container.stats.memory_percent.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">
                          {(container.stats.memory_usage / (1024 ** 2)).toFixed(0)} MB
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {Object.keys(container.ports).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(container.ports).slice(0, 2).map(([key, value], i) => (
                          <div key={i} className="text-xs">
                            {key} → {value ? value.map(p => `${p.HostPort}`).join(', ') : 'N/A'}
                          </div>
                        ))}
                      </div>
                    ) : 'None'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      {container.status === 'running' ? (
                        <>
                          <button
                            onClick={() => handleAction(container.id, 'restart')}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                            title="Restart"
                          >
                            <RotateCw size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(container.id, 'stop')}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                            title="Stop"
                          >
                            <Square size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAction(container.id, 'start')}
                          className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                          title="Start"
                        >
                          <Play size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DockerContainers;
