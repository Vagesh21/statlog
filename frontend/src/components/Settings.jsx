import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, Plus, Trash2, ExternalLink, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';

function Settings() {
  const { API_URL } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services');
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    url: '',
    icon: '🔗',
    enabled: true,
    container_name: '',
    description: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/`);
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    }
  };

  const saveSettings = async () => {
    try {
      await axios.put(`${API_URL}/api/settings/`, settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const addService = async () => {
    if (!newService.name || !newService.url) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/settings/service-links`, newService);
      toast.success('Service added successfully');
      setNewService({
        name: '',
        url: '',
        icon: '🔗',
        enabled: true,
        container_name: '',
        description: ''
      });
      fetchSettings();
    } catch (error) {
      toast.error('Failed to add service');
    }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm('Delete this service link?')) return;

    try {
      await axios.delete(`${API_URL}/api/settings/service-links/${serviceId}`);
      toast.success('Service deleted successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const toggleServiceEnabled = (serviceId) => {
    const updatedLinks = settings.service_links.map(link =>
      link.id === serviceId ? { ...link, enabled: !link.enabled } : link
    );
    setSettings({ ...settings, service_links: updatedLinks });
  };

  const saveSMTPSettings = async () => {
    try {
      await axios.put(`${API_URL}/api/settings/smtp`, settings.smtp_settings);
      toast.success('SMTP settings saved successfully');
    } catch (error) {
      toast.error('Failed to save SMTP settings');
    }
  };

  const saveAPIKeys = async () => {
    try {
      await axios.put(`${API_URL}/api/settings/api-keys`, settings.api_keys);
      toast.success('API keys saved successfully');
    } catch (error) {
      toast.error('Failed to save API keys');
    }
  };

  if (loading || !settings) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400">Configure your dashboard preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-dark-border">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'services'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Service Links
        </button>
        <button
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'smtp'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          SMTP Settings
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'api'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          API Keys
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'general'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          General
        </button>
      </div>

      {/* Service Links Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Quick Access Links</h3>
            <p className="text-gray-400 mb-6">
              Add links to your running services for quick access. Links will open in a new tab.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {settings.service_links?.map((service) => (
                <div
                  key={service.id}
                  className={`bg-dark-hover p-4 rounded border-2 ${
                    service.enabled ? 'border-blue-500' : 'border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{service.icon}</span>
                      <div>
                        <h4 className="font-semibold">{service.name}</h4>
                        {service.container_name && (
                          <p className="text-xs text-gray-400">{service.container_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleServiceEnabled(service.id)}
                        className={`p-1 rounded ${
                          service.enabled ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                        title={service.enabled ? 'Enabled' : 'Disabled'}
                      >
                        {service.enabled ? '✓' : '✗'}
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-1 hover:bg-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                  >
                    <span className="truncate">{service.url}</span>
                    <ExternalLink size={14} />
                  </a>
                  {service.description && (
                    <p className="text-xs text-gray-400 mt-2">{service.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-dark-hover p-6 rounded">
              <h4 className="font-semibold mb-4">Add New Service Link</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Service Name (e.g., Jellyfin)"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="URL (e.g., http://localhost:8096)"
                  value={newService.url}
                  onChange={(e) => setNewService({ ...newService, url: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Icon (emoji)"
                  value={newService.icon}
                  onChange={(e) => setNewService({ ...newService, icon: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Container Name (optional)"
                  value={newService.container_name}
                  onChange={(e) => setNewService({ ...newService, container_name: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="input md:col-span-2"
                />
              </div>
              <button onClick={addService} className="btn-primary mt-4 flex items-center space-x-2">
                <Plus size={18} />
                <span>Add Service</span>
              </button>
            </div>

            <button onClick={saveSettings} className="btn-primary mt-4 flex items-center space-x-2">
              <Save size={18} />
              <span>Save All Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* SMTP Settings Tab */}
      {activeTab === 'smtp' && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">SMTP Configuration</h3>
          <p className="text-gray-400 mb-6">
            Configure SMTP settings for SMS email forwarding from the dongle.
          </p>

          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SMTP Server</label>
                <input
                  type="text"
                  value={settings.smtp_settings?.server || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtp_settings: { ...settings.smtp_settings, server: e.target.value }
                    })
                  }
                  className="input w-full"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Port</label>
                <input
                  type="number"
                  value={settings.smtp_settings?.port || 465}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtp_settings: { ...settings.smtp_settings, port: parseInt(e.target.value) }
                    })
                  }
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Security</label>
              <select
                value={settings.smtp_settings?.secure || 'ssl'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    smtp_settings: { ...settings.smtp_settings, secure: e.target.value }
                  })
                }
                className="input w-full"
              >
                <option value="ssl">SSL (Port 465)</option>
                <option value="tls">TLS (Port 587)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={settings.smtp_settings?.username || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    smtp_settings: { ...settings.smtp_settings, username: e.target.value }
                  })
                }
                className="input w-full"
                placeholder="your_email@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">App Password</label>
              <input
                type="password"
                value={settings.smtp_settings?.app_password || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    smtp_settings: { ...settings.smtp_settings, app_password: e.target.value }
                  })
                }
                className="input w-full"
                placeholder="Enter your SMTP app password"
              />
              <p className="text-xs text-gray-400 mt-1">
                **Add your SMTP app password here** (Location: Settings → SMTP Settings → App Password)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">From Email</label>
              <input
                type="email"
                value={settings.smtp_settings?.email_from || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    smtp_settings: { ...settings.smtp_settings, email_from: e.target.value }
                  })
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">From Name</label>
              <input
                type="text"
                value={settings.smtp_settings?.email_from_name || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    smtp_settings: { ...settings.smtp_settings, email_from_name: e.target.value }
                  })
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">To Email</label>
              <input
                type="email"
                value={settings.smtp_settings?.email_to || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    smtp_settings: { ...settings.smtp_settings, email_to: e.target.value }
                  })
                }
                className="input w-full"
              />
            </div>

            <button onClick={saveSMTPSettings} className="btn-primary flex items-center space-x-2">
              <Save size={18} />
              <span>Save SMTP Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api' && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">API Keys</h3>
          <p className="text-gray-400 mb-6">
            Configure API keys for calendar and anime/movie tracking integrations.
          </p>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium mb-2">Google Calendar Credentials JSON</label>
              <textarea
                value={settings.api_keys?.google_calendar_credentials || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, google_calendar_credentials: e.target.value }
                  })
                }
                className="input w-full h-32"
                placeholder="Paste your Google Calendar credentials JSON here"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">AniList Client ID</label>
              <input
                type="text"
                value={settings.api_keys?.anilist_client_id || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, anilist_client_id: e.target.value }
                  })
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">AniList Client Secret</label>
              <input
                type="password"
                value={settings.api_keys?.anilist_client_secret || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, anilist_client_secret: e.target.value }
                  })
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">MyAnimeList Client ID</label>
              <input
                type="text"
                value={settings.api_keys?.myanimelist_client_id || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, myanimelist_client_id: e.target.value }
                  })
                }
                className="input w-full"
              />
            </div>

            <button onClick={saveAPIKeys} className="btn-primary flex items-center space-x-2">
              <Save size={18} />
              <span>Save API Keys</span>
            </button>
          </div>
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">General Settings</h3>
          
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium mb-2">Refresh Rate (seconds)</label>
              <input
                type="number"
                value={settings.refresh_rate || 2}
                onChange={(e) =>
                  setSettings({ ...settings, refresh_rate: parseInt(e.target.value) })
                }
                className="input w-full"
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPU Warning Threshold (%)</label>
              <input
                type="number"
                value={settings.cpu_warning_threshold || 80}
                onChange={(e) =>
                  setSettings({ ...settings, cpu_warning_threshold: parseInt(e.target.value) })
                }
                className="input w-full"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPU Critical Threshold (%)</label>
              <input
                type="number"
                value={settings.cpu_critical_threshold || 95}
                onChange={(e) =>
                  setSettings({ ...settings, cpu_critical_threshold: parseInt(e.target.value) })
                }
                className="input w-full"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Temperature Warning Threshold (°C)</label>
              <input
                type="number"
                value={settings.temperature_warning_threshold || 70}
                onChange={(e) =>
                  setSettings({ ...settings, temperature_warning_threshold: parseInt(e.target.value) })
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Temperature Critical Threshold (°C)</label>
              <input
                type="number"
                value={settings.temperature_critical_threshold || 80}
                onChange={(e) =>
                  setSettings({ ...settings, temperature_critical_threshold: parseInt(e.target.value) })
                }
                className="input w-full"
              />
            </div>

            <button onClick={saveSettings} className="btn-primary flex items-center space-x-2">
              <Save size={18} />
              <span>Save General Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
