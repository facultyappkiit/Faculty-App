import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Mail, 
  User, 
  Building, 
  Phone,
  Download,
  ArrowLeft,
  Lock
} from 'lucide-react'

const API_BASE_URL = 'https://faculty-app-j8ct.onrender.com/api'

interface InviteData {
  email: string
  name: string
  department?: string
  phone?: string
}

export default function CompleteRegistration() {
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Token can come from query param (?token=xxx) or hash fragment (#access_token=xxx)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null)

  useEffect(() => {
    // Check for our custom invite token in query params
    const urlParams = new URLSearchParams(window.location.search)
    const customToken = urlParams.get('token')
    
    // Check for Supabase token in hash fragment
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const tokenType = hashParams.get('type')
    
    if (customToken) {
      // Our custom invite flow
      setInviteToken(customToken)
      fetchInviteDetails(customToken)
    } else if (accessToken && tokenType === 'invite') {
      // Supabase invite flow
      setSupabaseToken(accessToken)
      fetchUserFromSupabase(accessToken)
    } else {
      setError('No invite token provided. Please use the link from your invitation email.')
      setLoading(false)
    }
  }, [])

  const fetchInviteDetails = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/invite/${token}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 404) {
          throw new Error('This invite link is invalid. Please contact your administrator for a new invite.')
        } else if (response.status === 410) {
          throw new Error('This invite link has expired. Please contact your administrator for a new invite.')
        }
        throw new Error(errorData.detail || 'Failed to load invite details')
      }
      
      const data = await response.json()
      setInviteData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite details')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserFromSupabase = async (accessToken: string) => {
    try {
      // Get user info from Supabase using the access token
      const response = await fetch(`${API_BASE_URL}/auth/verify-invite-token?access_token=${accessToken}`)
      
      if (!response.ok) {
        throw new Error('Invalid or expired invite link. Please contact your administrator.')
      }
      
      const data = await response.json()
      setInviteData({
        email: data.email,
        name: data.name || data.email.split('@')[0],
        department: data.department,
        phone: data.phone
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify invite')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)

    try {
      let response: Response

      if (inviteToken) {
        // Our custom flow
        response = await fetch(`${API_BASE_URL}/auth/complete-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken, password })
        })
      } else if (supabaseToken) {
        // Supabase flow - update password using Supabase token
        response = await fetch(`${API_BASE_URL}/auth/complete-supabase-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            access_token: supabaseToken, 
            password,
            name: inviteData?.name,
            department: inviteData?.department,
            phone: inviteData?.phone
          })
        })
      } else {
        throw new Error('No valid token')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Registration failed')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your invite...</p>
        </div>
      </div>
    )
  }

  // Error State (no valid invite)
  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-gray-600 mb-6">
            Welcome, <span className="font-semibold">{inviteData?.name}</span>! Your account has been created successfully.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">Your login credentials:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-600">{inviteData?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lock size={16} className="text-gray-400" />
                <span className="text-gray-600">Your chosen password</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Download the Faculty Substitute App to login and start using the platform.
          </p>

          <Link
            to="/download"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium"
          >
            <Download size={20} />
            Download App
          </Link>
        </div>
      </div>
    )
  }

  // Registration Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Registration</h1>
          <p className="text-gray-500 mt-1">Set your password to activate your account</p>
        </div>

        {/* Pre-filled Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <User size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{inviteData?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{inviteData?.email}</p>
            </div>
          </div>
          {inviteData?.department && (
            <div className="flex items-center gap-3">
              <Building size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium text-gray-900">{inviteData.department}</p>
              </div>
            </div>
          )}
          {inviteData?.phone && (
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{inviteData.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none pr-12"
                placeholder="Create a password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none pr-12"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/download" className="text-primary-600 hover:text-primary-700 font-medium">
            Download the app to login
          </Link>
        </p>
      </div>
    </div>
  )
}
