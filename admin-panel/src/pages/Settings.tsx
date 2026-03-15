import { useState } from 'react'
import { Save, Bell, Shield, Database, RefreshCw } from 'lucide-react'
import { type Admin } from '../services/api'

interface SettingsProps {
  admin: Admin
}

export default function Settings({ admin }: SettingsProps) {
  const isSuperAdmin = admin.role === 'super_admin'
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    autoApprove: false,
    maintenanceMode: false,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In a real app, this would save to the backend
    localStorage.setItem('adminSettings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const settingSections = [
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive email alerts for new requests and updates',
        },
        {
          key: 'pushNotifications',
          label: 'Push Notifications',
          description: 'Enable push notifications for mobile app users',
        },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      settings: [
        {
          key: 'autoApprove',
          label: 'Auto-Approve Requests',
          description: 'Automatically approve substitute requests without admin review',
        },
      ],
    },
    {
      title: 'System',
      icon: Database,
      settings: [
        {
          key: 'maintenanceMode',
          label: 'Maintenance Mode',
          description: 'Enable maintenance mode to prevent new requests',
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage system configuration</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Save size={20} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingSections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <section.icon className="text-primary-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {section.settings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{setting.label}</p>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[setting.key as keyof typeof settings]}
                      onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* API Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-blue-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">API Configuration</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
            <input
              type="text"
              value="https://faculty-app-j8ct.onrender.com/api"
              readOnly
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backend Status</label>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone - Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200">
          <div className="p-6 border-b border-red-100 bg-red-50 rounded-t-xl">
            <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
            <p className="text-sm text-red-600">Irreversible actions</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Clear All Requests</p>
                <p className="text-sm text-gray-500">Delete all substitute requests from the database</p>
              </div>
              <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition">
                Clear Requests
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Reset System</p>
                <p className="text-sm text-gray-500">Reset all settings to default values</p>
              </div>
              <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
