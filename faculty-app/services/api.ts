import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production API URL (deployed on Render)
const API_BASE_URL = 'https://faculty-app-j8ct.onrender.com/api';

// For local development, uncomment below and comment above:
// const LOCAL_IP = '10.5.85.207';
// const API_BASE_URL = Platform.OS === 'web' 
//   ? 'http://localhost:8000/api'
//   : `http://${LOCAL_IP}:8000/api`;

console.log('API URL:', API_BASE_URL); // Debug log

const UNAUTHORIZED_MESSAGE = 'Session ended login again';

let unauthorizedHandler: (() => Promise<void> | void) | null = null;
let unauthorizedInProgress = false;

export const setUnauthorizedHandler = (handler: (() => Promise<void> | void) | null) => {
  unauthorizedHandler = handler;
};

export const logoutFromBackend = async (accessToken?: string | null) => {
  if (!accessToken) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.warn('[Auth] Backend logout request failed:', error);
  }
};

const handleUnauthorized = async () => {
  if (unauthorizedInProgress) {
    return;
  }

  unauthorizedInProgress = true;
  const token = await AsyncStorage.getItem('token');
  await logoutFromBackend(token);

  Alert.alert('Session Ended', UNAUTHORIZED_MESSAGE, [
    {
      text: 'OK',
      onPress: () => {
        Promise.resolve(unauthorizedHandler?.())
          .catch((error) => console.error('[Auth] Unauthorized handler failed:', error))
          .finally(() => {
            unauthorizedInProgress = false;
          });
      },
    },
  ]);
};

const isUnauthorized = (response: Response) => response.status === 401 || response.status === 403;

const getAccessToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem('token');
};

// Helper to get auth headers with JWT token
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const token = await getAccessToken();
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

// Refresh authentication token
export const refreshAuthToken = async (refreshToken: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to refresh token');
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
  if (isUnauthorized(putResponse)) {
    await handleUnauthorized();
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
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
    if (isUnauthorized(postResponse)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
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
  const response = await fetch(`${API_BASE_URL}/users/${userId}/push-token/debug`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok && isUnauthorized(response)) {
    await handleUnauthorized();
    throw new Error(UNAUTHORIZED_MESSAGE);
  }
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
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user');
  }
  
  return response.json();
};

export const uploadClassSchedule = async (
  userId: number,
  file: { uri: string; name: string; mimeType?: string | null }
) => {
  const token = await getAccessToken();
  const formData = new FormData();

  const filePart = {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as any;

  // Keep both keys for backward compatibility with deployed backends.
  formData.append('schedule_file', filePart);
  formData.append('file', filePart);

  const response = await fetch(`${API_BASE_URL}/users/${userId}/class-schedule/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    if (isUnauthorized(response)) {
      await handleUnauthorized();
      throw new Error(UNAUTHORIZED_MESSAGE);
    }
    throw new Error(await readErrorMessage(response, 'Failed to upload class schedule'));
  }

  return response.json();
};
