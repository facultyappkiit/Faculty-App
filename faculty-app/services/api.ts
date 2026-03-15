import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production API URL (deployed on Render)
const API_BASE_URL = 'https://faculty-app-j8ct.onrender.com/api';

// For local development, uncomment below and comment above:
// const LOCAL_IP = '10.5.85.207';
// const API_BASE_URL = Platform.OS === 'web' 
//   ? 'http://localhost:8000/api'
//   : `http://${LOCAL_IP}:8000/api`;

console.log('API URL:', API_BASE_URL); // Debug log

// Helper to get auth headers with JWT token
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export type SubstituteRequestType = 'class' | 'exam';

export type SubstituteRequest = {
  id: number;
  teacher_id: number;
  request_type: SubstituteRequestType;
  subject?: string | null;
  date: string;
  time: string;
  duration: number;
  classroom?: string | null;
  campus?: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  notes?: string | null;
  accepted_by?: number | null;
  teacher_name?: string;
  teacher_email?: string;
  teacher_department?: string;
  teacher_phone?: string;
  acceptor_name?: string;
  acceptor_email?: string;
  acceptor_department?: string;
  acceptor_phone?: string;
};

type SubstituteRequestPayload = {
  request_type: SubstituteRequestType;
  subject?: string;
  date: string;
  time: string;
  duration: number;
  classroom?: string;
  campus?: string;
  notes?: string;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const error = await response.json();
    return error.detail || fallback;
  } catch {
    return fallback;
  }
};

// Helper to append @kiit.ac.in to email
export const formatEmail = (username: string): string => {
  return `${username.toLowerCase().trim()}@kiit.ac.in`;
};

// Health check
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
};

// Auth APIs (no auth required)
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

// Requests APIs (auth required)
export const getPendingRequests = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    throw new Error('Failed to fetch requests');
  }
  
  return response.json() as Promise<SubstituteRequest[]>;
};

export const getTeacherRequests = async (teacherId: number) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests/teacher/${teacherId}`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('Not authorized to view these requests');
    throw new Error('Failed to fetch teacher requests');
  }
  
  return response.json() as Promise<SubstituteRequest[]>;
};

export const getAcceptedRequests = async (teacherId: number) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests/accepted-by/${teacherId}`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('Not authorized to view these requests');
    throw new Error('Failed to fetch accepted requests');
  }
  
  return response.json() as Promise<SubstituteRequest[]>;
};

export const getRequest = async (requestId: number) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
    headers
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    throw new Error(await readErrorMessage(response, 'Failed to fetch request'));
  }

  return response.json() as Promise<SubstituteRequest>;
};

export const createRequest = async (data: {
  teacher_id: number;
  request_type: SubstituteRequestType;
  subject?: string;
  date: string;
  time: string;
  duration: number;
  classroom?: string;
  campus?: string;
  notes?: string;
}) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('You can only create requests for yourself');
    throw new Error(await readErrorMessage(response, 'Failed to create request'));
  }
  
  return response.json() as Promise<SubstituteRequest>;
};

export const updateRequest = async (
  requestId: number,
  teacherId: number,
  data: Partial<SubstituteRequestPayload>
) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}?teacher_id=${teacherId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('You can only update your own requests');
    throw new Error(await readErrorMessage(response, 'Failed to update request'));
  }

  return response.json() as Promise<SubstituteRequest>;
};

export const acceptRequest = async (requestId: number, teacherId: number) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/accept`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ teacher_id: teacherId }),
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('You can only accept requests as yourself');
    throw new Error(await readErrorMessage(response, 'Failed to accept request'));
  }
  
  return response.json();
};

export const cancelRequest = async (requestId: number, teacherId: number) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ teacher_id: teacherId }),
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('You can only cancel your own requests');
    throw new Error(await readErrorMessage(response, 'Failed to cancel request'));
  }
  
  return response.json();
};

// Users APIs (auth required)
export const getUsers = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
};

export const getUser = async (userId: number) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('Not authorized to view this profile');
    throw new Error('Failed to fetch user');
  }
  
  return response.json();
};

// Update user's push notification token
export const updatePushToken = async (userId: number, pushToken: string) => {
  console.log(`[Push] Updating push token for user ${userId}: ${pushToken}`);
  
  const headers = await getAuthHeaders();

  const putResponse = await fetch(`${API_BASE_URL}/users/${userId}/push-token`, {
    method: 'PUT',
    headers,
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
    { method: 'POST', headers }
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
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users/${userId}/push-token/status`, {
    headers
  });

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
  const headers = await getAuthHeaders();
  await fetch(`${API_BASE_URL}/users/${userId}/push-token/debug`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
};

// Update user profile
export const updateUser = async (userId: number, data: {
  name?: string;
  department?: string;
  phone?: string;
}) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired - Please login again');
    if (response.status === 403) throw new Error('Not authorized to update this profile');
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user');
  }
  
  return response.json();
};
