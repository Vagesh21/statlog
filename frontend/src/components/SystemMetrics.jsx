import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { HardDrive, Usb } from 'lucide-react';
import { toast } from 'react-toastify';

let cachedDiskMetrics = null;
let cachedUsbDevices = null;

function SystemMetrics() {
  const { API_URL } = useAuth();
  const [disk, setDisk] = useState(cachedDiskMetrics);
  const [usb, setUsb] = useState(cachedUsbDevices);
  const [loading, setLoading] = useState(!(cachedDiskMetrics && cachedUsbDevices));

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [diskRes, usbRes] = await Promise.all([
        axios.get(`${API_URL}/api/metrics/disk`),
        axios.get(`${API_URL}/api/usb/devices`)
      ]);

      const diskData = diskRes.data.data || diskRes.data;
      const usbData = usbRes.data.data || usbRes.data;
      cachedDiskMetrics = diskData;
      cachedUsbDevices = usbData;
      setDisk(diskData);
      setUsb(usbData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch system metrics');
    }
  };

  if (loading || !disk || !usb) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Metrics</h1>
        <p className="text-gray-400">Detailed storage and device information</p>
      </div>

      {/* Storage Devices */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <HardDrive size={24} className="text-purple-500" />
          <h3 className="text-xl font-semibold">Storage Devices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-3 px-4">Device</th>
                <th className="text-left py-3 px-4">Mount Point</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Total</th>
                <th className="text-left py-3 px-4">Used</th>
                <th className="text-left py-3 px-4">Free</th>
                <th className="text-left py-3 px-4">Usage</th>
              </tr>
            </thead>
            <tbody>
              {disk.filesystems.map((fs, index) => (
                <tr key={index} className="border-b border-dark-border hover:bg-dark-hover">
                  <td className="py-3 px-4 font-mono text-sm">{fs.device}</td>
                  <td className="py-3 px-4">{fs.mountpoint}</td>
                  <td className="py-3 px-4">{fs.fstype}</td>
                  <td className="py-3 px-4">{(fs.total / (1024 ** 3)).toFixed(2)} GB</td>
                  <td className="py-3 px-4">{(fs.used / (1024 ** 3)).toFixed(2)} GB</td>
                  <td className="py-3 px-4">{(fs.free / (1024 ** 3)).toFixed(2)} GB</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-dark-hover rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            fs.percent > 90 ? 'bg-red-500' :
                            fs.percent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${fs.percent}%` }}
                        />
                      </div>
                      <span className="text-sm">{fs.percent.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disk I/O Stats */}
      {disk.io_stats && Object.keys(disk.io_stats).length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Disk I/O Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-hover p-4 rounded">
              <div className="text-sm text-gray-400">Read Bytes</div>
              <div className="text-xl font-bold">{(disk.io_stats.read_bytes / (1024 ** 3)).toFixed(2)} GB</div>
            </div>
            <div className="bg-dark-hover p-4 rounded">
              <div className="text-sm text-gray-400">Write Bytes</div>
              <div className="text-xl font-bold">{(disk.io_stats.write_bytes / (1024 ** 3)).toFixed(2)} GB</div>
            </div>
            <div className="bg-dark-hover p-4 rounded">
              <div className="text-sm text-gray-400">Read Count</div>
              <div className="text-xl font-bold">{disk.io_stats.read_count.toLocaleString()}</div>
            </div>
            <div className="bg-dark-hover p-4 rounded">
              <div className="text-sm text-gray-400">Write Count</div>
              <div className="text-xl font-bold">{disk.io_stats.write_count.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* USB Devices */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Usb size={24} className="text-blue-500" />
          <h3 className="text-xl font-semibold">USB Devices ({usb.devices.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-3 px-4">Bus</th>
                <th className="text-left py-3 px-4">Device</th>
                <th className="text-left py-3 px-4">Vendor ID</th>
                <th className="text-left py-3 px-4">Product ID</th>
                <th className="text-left py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {usb.devices.map((device, index) => (
                <tr key={index} className="border-b border-dark-border hover:bg-dark-hover">
                  <td className="py-3 px-4">{device.bus}</td>
                  <td className="py-3 px-4">{device.device}</td>
                  <td className="py-3 px-4 font-mono text-sm">{device.vendor_id}</td>
                  <td className="py-3 px-4 font-mono text-sm">{device.product_id}</td>
                  <td className="py-3 px-4">{device.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SystemMetrics;
