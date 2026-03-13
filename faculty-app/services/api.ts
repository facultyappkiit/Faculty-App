import { Platform } from 'react-native';

// Production API URL (deployed on Render)
const API_BASE_URL = 'https://faculty-app-j8ct.onrender.com/api';

// For local development, uncomment below and comment above:
// const LOCAL_IP = '10.5.85.207';
// const API_BASE_URL = Platform.OS === 'web' 
//   ? 'http://localhost:8000/api'
//   : `http://${LOCAL_IP}:8000/api`;

console.log('API URL:', API_BASE_URL); // Debug log

// Helper to append @kiit.ac.in to email
export const formatEmail = (username: string): string => {
  return `${username.toLowerCase().trim()}@kiit.ac.in`;
};

// Health check
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
};

// Auth APIs
export const signup = async (data: {
  username: string;
  password: string;
  name: string;
  department?: string;
  phone?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formatEmail(data.username),
      password: data.password,
      name: data.name,
      department: data.department,
      phone: data.phone,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Signup failed');
  }
  
  return response.json();
};

export const login = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formatEmail(username),
      password,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  return response.json();
};

export const resetPassword = async (email: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password?email=${encodeURIComponent(email)}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send reset link');
  }
  
  return response.json();
};

// Requests APIs
export const getPendingRequests = async () => {
  const response = await fetch(`${API_BASE_URL}/requests`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch requests');
  }
  
  return response.json();
};

export const getTeacherRequests = async (teacherId: number) => {
  const response = await fetch(`${API_BASE_URL}/requests/teacher/${teacherId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch teacher requests');
  }
  
  return response.json();
};

export const getAcceptedRequests = async (teacherId: number) => {
  const response = await fetch(`${API_BASE_URL}/requests/accepted-by/${teacherId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch accepted requests');
  }
  
  return response.json();
};

export const createRequest = async (data: {
  teacher_id: number;
  subject: string;
  date: string;
  time: string;
  duration: number;
  classroom: string;
  notes?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create request');
  }
  
  return response.json();
};

export const acceptRequest = async (requestId: number, teacherId: number) => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/accept`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacher_id: teacherId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to accept request');
  }
  
  return response.json();
};

export const cancelRequest = async (requestId: number, teacherId: number) => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacher_id: teacherId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to cancel request');
  }
  
  return response.json();
};

// Users APIs
export const getUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/users`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
};

export const getUser = async (userId: number) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  
  return response.json();
};

// Update user's push notification token
export const updatePushToken = async (userId: number, pushToken: string) => {
  console.log(`[Push] Updating push token for user ${userId}: ${pushToken}`);

  const putResponse = await fetch(`${API_BASE_URL}/users/${userId}/push-token`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ push_token: pushToken }),
  });

  if (putResponse.ok) {
    const result = await putResponse.json();
    console.log('[Push] Push token updated via PUT:', result);
    return result;
  }

  let putErrorDetail = 'Failed to update push token';
  try {
    const errorJson = await putResponse.json();
    putErrorDetail = errorJson?.detail || putErrorDetail;
  } catch {
    // ignore JSON parse errors
  }

  console.warn('[Push] PUT failed, retrying with POST query param endpoint:', putErrorDetail);

  const postResponse = await fetch(
    `${API_BASE_URL}/users/${userId}/push-token?push_token=${encodeURIComponent(pushToken)}`,
    { method: 'POST' }
  );

  if (!postResponse.ok) {
    let postErrorDetail = 'Failed to update push token';
    try {
      const postErrorJson = await postResponse.json();
      postErrorDetail = postErrorJson?.detail || postErrorDetail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(postErrorDetail);
  }

  const postResult = await postResponse.json();
  console.log('[Push] Push token updated via POST fallback:', postResult);
  return postResult;
};

export const getPushTokenStatus = async (userId: number) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/push-token/status`);

  if (!response.ok) {
    let detail = 'Failed to fetch push token status';
    try {
      const error = await response.json();
      detail = error?.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  return response.json();
};

export const sendPushTokenDebug = async (userId: number, payload: Record<string, unknown>) => {
  await fetch(`${API_BASE_URL}/users/${userId}/push-token/debug`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

// Update user profile
export const updateUser = async (userId: number, data: {
  name?: string;
  department?: string;
  phone?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user');
  }
  
  return response.json();
};
