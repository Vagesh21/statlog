import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, Plus, Trash2, ExternalLink, Edit2, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { normalizeLinkUrl } from '../utils/links';

let cachedSettingsData = null;

function serviceFavicon(url) {
  try {
    return `${new URL(normalizeLinkUrl(url)).origin}/favicon.ico`;
  } catch (e) {
    return '';
  }
}

function Settings() {
  const { API_URL } = useAuth();
  const [settings, setSettings] = useState(cachedSettingsData);
  const [loading, setLoading] = useState(!cachedSettingsData);
  const [activeTab, setActiveTab] = useState('services');
  const [editingService, setEditingService] = useState(null);
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'admin', is_active: true });
  const [passwordReset, setPasswordReset] = useState({ username: '', new_password: '' });
  const [passwordChange, setPasswordChange] = useState({ current_password: '', new_password: '' });
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    url: '',
    icon: '🔗',
    enabled: true,
    show_on_dashboard: true,
    container_name: '',
    description: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'smtp') {
      fetchSmtpStatus();
    }
  }, [activeTab]);

  const resolvedSettingsUrl = useMemo(() => {
    const host = window.location.hostname;
    return `${API_URL}/api/settings/resolved/${host}`;
  }, [API_URL]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(resolvedSettingsUrl);
      cachedSettingsData = response.data;
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
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
      await axios.post(`${API_URL}/api/settings/service-links`, {
        ...newService,
        url: normalizeLinkUrl(newService.url)
      });
      toast.success('Service added successfully');
      setNewService({
        name: '',
        url: '',
        icon: '🔗',
        enabled: true,
        show_on_dashboard: true,
        container_name: '',
        description: ''
      });
      fetchSettings();
    } catch (error) {
      toast.error('Failed to add service');
    }
  };

  const startEditService = (service) => {
    setEditingService({ ...service });
  };

  const saveEditedService = async () => {
    if (!editingService?.id) return;
    try {
      await axios.put(`${API_URL}/api/settings/service-links/${editingService.id}`, {
        ...editingService,
        url: normalizeLinkUrl(editingService.url)
      });
      toast.success('Service updated');
      setEditingService(null);
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update service');
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

  const updateServiceLinkField = async (serviceId, updates) => {
    const existing = settings?.service_links?.find((link) => link.id === serviceId);
    if (!existing) return;

    const updated = { ...existing, ...updates };

    const updatedLinks = settings.service_links.map((link) =>
      link.id === serviceId ? updated : link
    );
    setSettings({ ...settings, service_links: updatedLinks });

    try {
      await axios.put(`${API_URL}/api/settings/service-links/${serviceId}`, {
        ...updated,
        url: normalizeLinkUrl(updated.url)
      });
    } catch (error) {
      const revertedLinks = settings.service_links.map((link) =>
        link.id === serviceId ? existing : link
      );
      setSettings({ ...settings, service_links: revertedLinks });
      toast.error('Failed to update link setting');
    }
  };

  const toggleServiceEnabled = async (serviceId) => {
    const existing = settings?.service_links?.find((link) => link.id === serviceId);
    if (!existing) return;
    await updateServiceLinkField(serviceId, { enabled: !existing.enabled });
  };

  const toggleServiceDashboardVisibility = async (serviceId) => {
    const existing = settings?.service_links?.find((link) => link.id === serviceId);
    if (!existing) return;
    await updateServiceLinkField(serviceId, {
      show_on_dashboard: !(existing.show_on_dashboard ?? true)
    });
  };

  const saveSMTPSettings = async () => {
    try {
      await axios.put(`${API_URL}/api/settings/smtp`, settings.smtp_settings);
      toast.success('SMTP settings saved successfully');
      fetchSmtpStatus();
    } catch (error) {
      toast.error('Failed to save SMTP settings');
    }
  };

  const fetchSmtpStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/smtp/status`);
      setSmtpStatus(response.data);
    } catch (error) {
      setSmtpStatus(null);
    }
  };

  const sendSmtpTest = async () => {
    setSmtpTesting(true);
    try {
      await axios.post(`${API_URL}/api/settings/smtp/test`, {
        to_email: settings.smtp_settings?.email_to || '',
        subject: 'Pi Monitor SMTP Test',
        message: 'SMTP test successful. Auto-forward for new SMS is enabled when SMTP is configured.'
      });
      toast.success('Test email sent');
      fetchSmtpStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setSmtpTesting(false);
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

  const createUser = async () => {
    if (!userForm.username || !userForm.password) {
      toast.error('Username and password are required');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/users`, userForm);
      toast.success('User created');
      setUserForm({ username: '', password: '', role: 'admin', is_active: true });
      fetchUsers();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const updateUser = async (username, updates) => {
    try {
      await axios.patch(`${API_URL}/api/users/${username}`, updates);
      toast.success('User updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const resetPassword = async () => {
    if (!passwordReset.username || !passwordReset.new_password) {
      toast.error('Username and new password required');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/users/${passwordReset.username}/reset-password`, {
        new_password: passwordReset.new_password
      });
      toast.success('Password reset');
      setPasswordReset({ username: '', new_password: '' });
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const changePassword = async () => {
    if (!passwordChange.current_password || !passwordChange.new_password) {
      toast.error('Current and new password required');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/users/me/change-password`, passwordChange);
      toast.success('Password changed');
      setPasswordChange({ current_password: '', new_password: '' });
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  if (loading && !settings) {
    return <div className="p-8">Loading settings...</div>;
  }

  if (!settings) {
    return (
      <div className="p-8">
        <div className="card">
          <div className="text-center py-6">
            <div className="text-xl font-semibold mb-2">Settings unavailable</div>
            <div className="text-gray-400 mb-4">Failed to load settings. Please try again.</div>
            <button onClick={fetchSettings} className="btn-primary">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400">Configure your dashboard preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 md:gap-4 border-b border-dark-border pb-2">
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
        <button
          onClick={() => {
            setActiveTab('users');
            fetchUsers();
          }}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'users'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Users
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
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-2xl">{service.icon}</span>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{service.name}</h4>
                        {service.container_name && (
                          <p className="text-xs text-gray-400 truncate">{service.container_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 shrink-0">
                      <button
                        onClick={() => startEditService(service)}
                        className="p-1 hover:bg-blue-600 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
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
                    href={normalizeLinkUrl(service.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                  >
                    {serviceFavicon(service.url) ? (
                      <img
                        src={serviceFavicon(service.url)}
                        alt={service.name}
                        className="w-4 h-4 rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="truncate">{normalizeLinkUrl(service.url)}</span>
                    <ExternalLink size={14} />
                  </a>
                  {service.description && (
                    <p className="text-xs text-gray-400 mt-2">{service.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-300">Show in Dashboard</span>
                    <button
                      onClick={() => toggleServiceDashboardVisibility(service.id)}
                      className={`px-3 py-1 rounded ${service.show_on_dashboard ?? true ? 'bg-green-600' : 'bg-gray-600'}`}
                      title={service.show_on_dashboard ?? true ? 'Visible in dashboard' : 'Hidden in dashboard'}
                    >
                      {service.show_on_dashboard ?? true ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
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
                <div className="flex items-center justify-between bg-dark-card px-3 py-2 rounded md:col-span-2">
                  <span className="text-sm text-gray-300">Show this link on dashboard quick links</span>
                  <button
                    type="button"
                    onClick={() => setNewService({ ...newService, show_on_dashboard: !newService.show_on_dashboard })}
                    className={`px-3 py-1 text-sm rounded ${newService.show_on_dashboard ? 'bg-green-600' : 'bg-gray-600'}`}
                  >
                    {newService.show_on_dashboard ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
              <button onClick={addService} className="btn-primary mt-4 flex items-center space-x-2">
                <Plus size={18} />
                <span>Add Service</span>
              </button>
            </div>

            {editingService && (
              <div className="bg-dark-hover p-6 rounded mt-6">
                <h4 className="font-semibold mb-4">Edit Service Link</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Service Name"
                    value={editingService.name}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={editingService.url}
                    onChange={(e) => setEditingService({ ...editingService, url: e.target.value })}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Icon"
                    value={editingService.icon || ''}
                    onChange={(e) => setEditingService({ ...editingService, icon: e.target.value })}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Container Name"
                    value={editingService.container_name || ''}
                    onChange={(e) => setEditingService({ ...editingService, container_name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={editingService.description || ''}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    className="input md:col-span-2"
                  />
                  <div className="flex items-center justify-between bg-dark-card px-3 py-2 rounded md:col-span-2">
                    <span className="text-sm text-gray-300">Show this link on dashboard quick links</span>
                    <button
                      type="button"
                      onClick={() => setEditingService({
                        ...editingService,
                        show_on_dashboard: !(editingService.show_on_dashboard ?? true)
                      })}
                      className={`px-3 py-1 text-sm rounded ${editingService.show_on_dashboard ?? true ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                      {editingService.show_on_dashboard ?? true ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button onClick={saveEditedService} className="btn-primary">Save</button>
                  <button onClick={() => setEditingService(null)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

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

          <div className="mb-6 p-4 rounded bg-dark-hover border border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">SMS Auto Forwarding</div>
                <div className="text-sm text-gray-400">
                  {smtpStatus?.active ? 'Active' : 'Inactive'} | {smtpStatus?.configured ? 'SMTP configured' : 'SMTP not configured'}
                </div>
                {smtpStatus?.last_sent_at && (
                  <div className="text-xs text-gray-400">Last sent: {smtpStatus.last_sent_at}</div>
                )}
                {smtpStatus?.last_forwarded_sms && (
                  <div className="text-xs text-gray-300 mt-1">
                    Last SMS: {smtpStatus.last_forwarded_sms.from || 'Unknown'} | {smtpStatus.last_forwarded_sms.timestamp || ''} | {smtpStatus.last_forwarded_sms.preview || ''}
                  </div>
                )}
                {smtpStatus?.last_error && (
                  <div className="text-xs text-red-400">Last error: {smtpStatus.last_error}</div>
                )}
              </div>
              <button
                onClick={fetchSmtpStatus}
                className="btn-secondary"
              >
                Refresh Status
              </button>
            </div>
          </div>

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
            <button
              onClick={sendSmtpTest}
              className="btn-secondary flex items-center space-x-2"
              disabled={smtpTesting}
            >
              <span>{smtpTesting ? 'Sending Test...' : 'Send Test Email'}</span>
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

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Users size={20} className="text-blue-500" />
              <h3 className="text-xl font-semibold">User Management</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-3 px-4">Username</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Active</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.username} className="border-b border-dark-border hover:bg-dark-hover">
                      <td className="py-3 px-4">{u.username}</td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role || 'admin'}
                          onChange={(e) => updateUser(u.username, { role: e.target.value })}
                          className="input"
                        >
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => updateUser(u.username, { is_active: !u.is_active })}
                          className={`px-3 py-1 rounded ${u.is_active ? 'bg-green-600' : 'bg-gray-600'}`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setPasswordReset({ username: u.username, new_password: '' })}
                          className="btn-secondary"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h4 className="text-lg font-semibold mb-4">Create User</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                className="input"
              />
              <input
                type="password"
                placeholder="Password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="input"
              />
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="input"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={userForm.is_active ? 'active' : 'inactive'}
                onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === 'active' })}
                className="input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button onClick={createUser} className="btn-primary mt-4 flex items-center space-x-2">
              <Plus size={18} />
              <span>Create User</span>
            </button>
          </div>

          <div className="card">
            <h4 className="text-lg font-semibold mb-4">Reset Password</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={passwordReset.username}
                onChange={(e) => setPasswordReset({ ...passwordReset, username: e.target.value })}
                className="input"
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordReset.new_password}
                onChange={(e) => setPasswordReset({ ...passwordReset, new_password: e.target.value })}
                className="input"
              />
            </div>
            <button onClick={resetPassword} className="btn-primary mt-4">
              Reset Password
            </button>
          </div>

          <div className="card">
            <h4 className="text-lg font-semibold mb-4">Change My Password</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="password"
                placeholder="Current password"
                value={passwordChange.current_password}
                onChange={(e) => setPasswordChange({ ...passwordChange, current_password: e.target.value })}
                className="input"
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordChange.new_password}
                onChange={(e) => setPasswordChange({ ...passwordChange, new_password: e.target.value })}
                className="input"
              />
            </div>
            <button onClick={changePassword} className="btn-primary mt-4">
              Change Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
