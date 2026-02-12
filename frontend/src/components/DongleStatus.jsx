import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Radio, Signal, Smartphone, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatMelbourne } from '../utils/time';

let cachedDongleStatus = null;

function DongleStatus() {
  const { API_URL } = useAuth();
  const [dongleData, setDongleData] = useState(cachedDongleStatus);
  const [loading, setLoading] = useState(!cachedDongleStatus);

  useEffect(() => {
    fetchDongleData();
    const interval = setInterval(fetchDongleData, 7000);
    return () => clearInterval(interval);
  }, []);

  const fetchDongleData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dongle/status`);
      const nextData = response.data.data || response.data;
      cachedDongleStatus = nextData;
      setDongleData(nextData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dongle data:', error);
      toast.error('Failed to fetch dongle status');
    }
  };

  const deleteSMS = async (index) => {
    if (!window.confirm('Delete this SMS message?')) return;
    
    try {
      await axios.post(`${API_URL}/api/dongle/sms/${index}/delete`);
      toast.success('SMS deleted successfully');
      fetchDongleData();
    } catch (error) {
      toast.error('Failed to delete SMS');
    }
  };

  const getSignalBars = (strength) => {
    return Array.from({ length: 5 }, (_, i) => i < strength);
  };

  if (loading || !dongleData) {
    return <div className="p-4 md:p-8">Loading dongle status...</div>;
  }

  if (dongleData.error) {
    return (
      <div className="p-4 md:p-8">
        <div className="card">
          <div className="text-center py-8">
            <Radio size={64} className="mx-auto mb-4 text-gray-500" />
            <h2 className="text-2xl font-bold mb-2">Dongle Not Connected</h2>
            <p className="text-gray-400">{dongleData.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Huawei E3372 Dongle Monitor</h1>
          <p className="text-gray-400">Real-time dongle status and SMS messages</p>
        </div>
        <button onClick={fetchDongleData} className="btn-secondary flex items-center space-x-2">
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Signal Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Signal size={24} className="text-blue-500" />
            <h3 className="text-xl font-semibold">Signal Status</h3>
          </div>
          
          <div className="space-y-4">
            {/* Signal Bars */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400 w-24">Strength:</span>
              <div className="flex space-x-1">
                {getSignalBars(dongleData.signal.strength).map((filled, i) => (
                  <div
                    key={i}
                    className={`w-4 rounded-sm ${filled ? `bg-${dongleData.signal.color}-500` : 'bg-gray-700'}`}
                    style={{ 
                      height: `${(i + 1) * 6}px`,
                      backgroundColor: filled ? 
                        (dongleData.signal.color === 'green' ? '#10b981' : 
                         dongleData.signal.color === 'yellow' ? '#f59e0b' : '#ef4444') 
                        : '#374151'
                    }}
                  />
                ))}
              </div>
              <span className="font-semibold">{dongleData.signal.strength}/5</span>
            </div>

            {/* Signal Details */}
            <div className="bg-dark-hover p-4 rounded space-y-2 text-sm">
              {Object.entries(dongleData.signal.status).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Info */}
        {dongleData.device && (
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Radio size={24} className="text-green-500" />
              <h3 className="text-xl font-semibold">Device Information</h3>
            </div>
            <div className="bg-dark-hover p-4 rounded space-y-2 text-sm">
              {Object.entries(dongleData.device).slice(0, 10).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Network & Traffic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dongleData.network && Object.keys(dongleData.network).length > 0 && (
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Network Information</h3>
            <div className="bg-dark-hover p-4 rounded space-y-2 text-sm">
              {Object.entries(dongleData.network).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dongleData.traffic && Object.keys(dongleData.traffic).length > 0 && (
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Data Usage</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(dongleData.traffic).slice(0, 6).map(([key, value]) => (
                <div key={key} className="bg-dark-hover p-3 rounded">
                  <div className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-lg font-bold">
                    {typeof value === 'number' ? (value / (1024 ** 3)).toFixed(2) + ' GB' : value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SMS Messages */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Smartphone size={24} className="text-purple-500" />
            <h3 className="text-xl font-semibold">SMS Messages ({dongleData.sms_messages?.length || 0})</h3>
          </div>
        </div>

        {dongleData.sms_messages && dongleData.sms_messages.length > 0 ? (
          <div className="space-y-3">
            {dongleData.sms_messages.map((msg, index) => (
              <div key={index} className={`bg-dark-hover p-4 rounded ${msg.unread ? 'border-l-4 border-blue-500' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold">{msg.from}</span>
                      <span className="text-sm text-gray-400">{formatMelbourne(msg.timestamp)}</span>
                      {msg.unread && (
                        <span className="text-xs bg-blue-600 px-2 py-1 rounded">New</span>
                      )}
                    </div>
                    <p className="text-gray-300">{msg.message}</p>
                  </div>
                  <button
                    onClick={() => deleteSMS(msg.index)}
                    className="p-2 hover:bg-red-600 rounded transition-colors"
                    title="Delete SMS"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No SMS messages
          </div>
        )}
      </div>
    </div>
  );
}

export default DongleStatus;
