import { useState, useEffect } from 'react'
import { Bell, Send, Users, Building, User, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getUsers, getDepartments, sendNotification, User as UserType } from '../services/api'

type TargetType = 'all' | 'specific' | 'department'

const Notifications = () => {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('all')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  
  const [users, setUsers] = useState<UserType[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersData, deptData] = await Promise.all([
        getUsers(),
        getDepartments()
      ])
      setUsers(usersData)
      setDepartments(deptData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setResult({ success: false, message: 'Please enter both title and message' })
      return
    }

    if (targetType === 'specific' && selectedUsers.length === 0) {
      setResult({ success: false, message: 'Please select at least one user' })
      return
    }

    if (targetType === 'department' && !selectedDepartment) {
      setResult({ success: false, message: 'Please select a department' })
      return
    }

    setSending(true)
    setResult(null)

    try {
      const response = await sendNotification({
        title: title.trim(),
        body: body.trim(),
        target_type: targetType,
        user_ids: targetType === 'specific' ? selectedUsers : undefined,
        department: targetType === 'department' ? selectedDepartment : undefined,
      })

      setResult({
        success: response.success,
        message: response.message + (response.failed_count > 0 ? ` (${response.failed_count} without push tokens)` : '')
      })

      if (response.success && response.sent_count > 0) {
        setTitle('')
        setBody('')
        setSelectedUsers([])
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to send notification' })
    } finally {
      setSending(false)
    }
  }

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u.id))
  }

  const clearSelection = () => {
    setSelectedUsers([])
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getUsersWithTokenCount = () => {
    if (targetType === 'all') {
      return users.filter(u => u.push_token).length
    }
    if (targetType === 'specific') {
      return users.filter(u => selectedUsers.includes(u.id) && u.push_token).length
    }
    if (targetType === 'department') {
      return users.filter(u => u.department === selectedDepartment && u.push_token).length
    }
    return 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Send Notifications</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compose Notification</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your notification message..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{body.length}/500</p>
            </div>

            {/* Target Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTargetType('all')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                    targetType === 'all' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">All Users</span>
                </button>
                <button
                  onClick={() => setTargetType('specific')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                    targetType === 'specific' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Specific</span>
                </button>
                <button
                  onClick={() => setTargetType('department')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                    targetType === 'department' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-5 h-5" />
                  <span className="font-medium">Department</span>
                </button>
              </div>
            </div>

            {/* Department Selection */}
            {targetType === 'department' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Choose a department...</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Recipients with push tokens:</span>
                <span className="font-semibold text-primary-600">{getUsersWithTokenCount()}</span>
              </div>
              {targetType === 'specific' && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Selected users:</span>
                  <span className="font-semibold">{selectedUsers.length}</span>
                </div>
              )}
            </div>

            {/* Result Message */}
            {result && (
              <div className={`flex items-center gap-2 p-4 rounded-lg ${
                result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {result.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{result.message}</span>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>

        {/* User Selection Panel */}
        {targetType === 'specific' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Users</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllUsers}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    selectedUsers.includes(user.id)
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedUsers.includes(user.id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedUsers.includes(user.id) && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{user.department || 'N/A'}</p>
                    {user.push_token ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Has Token
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        No Token
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-500 py-8">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Preview Panel */}
        {targetType !== 'specific' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            
            <div className="bg-gray-900 rounded-xl p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Facultyfy</p>
                  <p className="font-medium mt-1">{title || 'Notification Title'}</p>
                  <p className="text-sm text-gray-300 mt-1">{body || 'Your notification message will appear here...'}</p>
                </div>
                <p className="text-xs text-gray-400">now</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-medium text-gray-700">Target Summary</h3>
              {targetType === 'all' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800">
                    This notification will be sent to <strong>all {users.length} users</strong>.
                    {users.filter(u => u.push_token).length < users.length && (
                      <span className="block text-sm mt-1">
                        Only {users.filter(u => u.push_token).length} users have push notifications enabled.
                      </span>
                    )}
                  </p>
                </div>
              )}
              {targetType === 'department' && selectedDepartment && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-purple-800">
                    This notification will be sent to all users in <strong>{selectedDepartment}</strong> department.
                    <span className="block text-sm mt-1">
                      {users.filter(u => u.department === selectedDepartment).length} users in this department,{' '}
                      {users.filter(u => u.department === selectedDepartment && u.push_token).length} with push enabled.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
