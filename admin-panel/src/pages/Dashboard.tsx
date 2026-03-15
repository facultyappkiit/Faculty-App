import { useState, useEffect } from 'react'
import { Users, FileText, Clock, CheckCircle, TrendingUp, Activity } from 'lucide-react'
import { getDashboardStats, getRequests, type SubstituteRequest, type DashboardStats } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
  })
  const [recentRequests, setRecentRequests] = useState<SubstituteRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsData, requestsData] = await Promise.all([
        getDashboardStats(),
        getRequests(),
      ])
      setStats(statsData)
      setRecentRequests(requestsData.slice(0, 5))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Total Requests', 
      value: stats.totalRequests, 
      icon: FileText, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    { 
      label: 'Pending', 
      value: stats.pendingRequests, 
      icon: Clock, 
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    { 
      label: 'Accepted', 
      value: stats.acceptedRequests, 
      icon: CheckCircle, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to the admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={stat.textColor} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
            </div>
          </div>
          <div className="p-6">
            {recentRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No requests yet</p>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">{request.subject}</p>
                      <p className="text-sm text-gray-500">{request.teacher_name}</p>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${request.status === 'accepted' ? 'bg-green-100 text-green-700' : ''}
                      ${request.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Acceptance Rate</span>
              <span className="font-semibold text-gray-900">
                {stats.totalRequests > 0 
                  ? `${Math.round((stats.acceptedRequests / stats.totalRequests) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ 
                  width: stats.totalRequests > 0 
                    ? `${(stats.acceptedRequests / stats.totalRequests) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
            <div className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active Users</span>
                <span className="font-medium">{stats.totalUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pending Requests</span>
                <span className="font-medium text-yellow-600">{stats.pendingRequests}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Accepted Requests</span>
                <span className="font-medium text-green-600">{stats.acceptedRequests}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
