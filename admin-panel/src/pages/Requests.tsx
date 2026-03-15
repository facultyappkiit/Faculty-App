import { useState, useEffect } from 'react'
import { Search, Trash2, X, Check, Filter, Calendar, Clock, MapPin } from 'lucide-react'
import { getRequests, deleteRequest, type SubstituteRequest, type Admin } from '../services/api'

interface RequestsProps {
  admin: Admin
}

export default function Requests({ admin }: RequestsProps) {
  const isSuperAdmin = admin.role === 'super_admin'
  const [requests, setRequests] = useState<SubstituteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<SubstituteRequest | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const data = await getRequests()
      setRequests(data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = async (id: number) => {
    try {
      await deleteRequest(id)
      setRequests(requests.filter(r => r.id !== id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Failed to delete request')
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
        <p className="text-gray-500">{requests.length} substitute requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((request) => (
          <div 
            key={request.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedRequest(request)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{request.subject}</h3>
                <p className="text-sm text-gray-500">{request.teacher_name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                {request.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                {request.date}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                {request.time}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                {request.room}
              </div>
            </div>

            {request.acceptor_name && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm">
                  <span className="text-gray-500">Accepted by: </span>
                  <span className="font-medium text-green-600">{request.acceptor_name}</span>
                </p>
              </div>
            )}

            <div className="flex items-center justify-end mt-4 pt-3 border-t border-gray-100">
              {isSuperAdmin && (
                deleteConfirm === request.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRequest(request.id); }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(request.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500">
          No requests found
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedRequest.subject}</h2>
                <p className="text-gray-500">Request #{selectedRequest.id}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Requested By</span>
                <span className="font-medium">{selectedRequest.teacher_name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{selectedRequest.date}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Time</span>
                <span className="font-medium">{selectedRequest.time}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-500">Room</span>
                <span className="font-medium">{selectedRequest.room}</span>
              </div>
              {selectedRequest.acceptor_name && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-500">Accepted By</span>
                  <span className="font-medium text-green-600">{selectedRequest.acceptor_name}</span>
                </div>
              )}
              {selectedRequest.notes && (
                <div className="py-2">
                  <span className="text-gray-500 block mb-1">Notes</span>
                  <p className="text-gray-700">{selectedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => { setDeleteConfirm(selectedRequest.id); setSelectedRequest(null); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
