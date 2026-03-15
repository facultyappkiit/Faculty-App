const API_BASE_URL = 'https://faculty-app-j8ct.onrender.com/api'

// For local development:
// const API_BASE_URL = 'http://localhost:8000/api'

// Admin types
export interface Admin {
  id: number
  admin_id: string
  name: string
  role: 'super_admin' | 'manager'
  is_active: boolean
  created_at?: string
  last_login?: string
}

export interface AdminLoginResponse {
  access_token: string
  admin: Admin
}

// Admin login
export const adminLogin = async (adminId: string, password: string): Promise<AdminLoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_id: adminId, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Login failed')
  }

  return response.json()
}

// Get all admins (super_admin only)
export const getAdmins = async (): Promise<Admin[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/`)
  if (!response.ok) throw new Error('Failed to fetch admins')
  return response.json()
}

// Create admin (super_admin only)
export const createAdmin = async (data: { admin_id: string; password: string; name: string; role: string }) => {
  const response = await fetch(`${API_BASE_URL}/admin/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create admin')
  }
  return response.json()
}

// Update admin (super_admin only)
export const updateAdmin = async (id: number, data: { name?: string; role?: string; is_active?: boolean }) => {
  const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update admin')
  return response.json()
}

// Delete admin (super_admin only)
export const deleteAdmin = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete admin')
  return response.json()
}

export interface User {
  id: number
  name: string
  email: string
  department: string
  phone: string
  is_admin?: boolean
  email_verified?: boolean
  created_at?: string
  push_token?: string
}

export interface SubstituteRequest {
  id: number
  teacher_id: number
  teacher_name: string
  subject: string
  date: string
  time: string
  room: string
  notes: string
  status: 'pending' | 'accepted' | 'cancelled'
  accepted_by: number | null
  acceptor_name: string | null
  created_at: string
}

export interface DashboardStats {
  totalUsers: number
  totalRequests: number
  pendingRequests: number
  acceptedRequests: number
}

// Admin login
export const adminLogin = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Login failed')
  }

  return response.json()
}

// Get all users
export const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/users`)
  if (!response.ok) throw new Error('Failed to fetch users')
  return response.json()
}

// Get user by ID
export const getUser = async (id: number): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`)
  if (!response.ok) throw new Error('Failed to fetch user')
  return response.json()
}

// Update user
export const updateUser = async (id: number, data: Partial<User>) => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update user')
  return response.json()
}

// Delete user
export const deleteUser = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete user')
  return response.json()
}

// Get pending requests only
export const getPendingRequests = async (): Promise<SubstituteRequest[]> => {
  const response = await fetch(`${API_BASE_URL}/requests/`)
  if (!response.ok) throw new Error('Failed to fetch requests')
  return response.json()
}

// Get all requests (pending, accepted, cancelled) - for admin panel
export const getRequests = async (): Promise<SubstituteRequest[]> => {
  const response = await fetch(`${API_BASE_URL}/requests/all`)
  if (!response.ok) throw new Error('Failed to fetch all requests')
  return response.json()
}

// Delete request
export const deleteRequest = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete request')
  return response.json()
}

// Get dashboard stats
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const [users, allRequests] = await Promise.all([
      getUsers(),
      getRequests(),
    ])

    return {
      totalUsers: users.length,
      totalRequests: allRequests.length,
      pendingRequests: allRequests.filter(r => r.status === 'pending').length,
      acceptedRequests: allRequests.filter(r => r.status === 'accepted').length,
    }
  } catch {
    return {
      totalUsers: 0,
      totalRequests: 0,
      pendingRequests: 0,
      acceptedRequests: 0,
    }
  }
}
