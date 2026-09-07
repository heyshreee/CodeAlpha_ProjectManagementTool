const API_BASE = '/api/v1';

const ACCESS_TOKEN_KEY = 'pf_access_token';

export const authStore = {
  getToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = authStore.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    // Attempt refresh via httpOnly cookie, then retry once.
    const ok = await refresh();
    if (ok) return request<T>(path, options, false);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, body?.message || `Request failed (${res.status})`, body?.details);
  }
  return body.data as T;
}

async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      authStore.clear();
      return false;
    }
    const body = await res.json();
    if (body?.data?.accessToken) {
      authStore.setToken(body.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Uploads need raw multipart, no JSON content-type.
export async function uploadFile<T>(path: string, file: File, retry = true): Promise<T> {
  const token = authStore.getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  // Same 401-refresh-and-retry behaviour as the JSON client, so expiring access
  // tokens midway through an upload don't fail the request.
  if (res.status === 401 && retry) {
    const ok = await refresh();
    if (ok) return uploadFile<T>(path, file, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message || 'Upload failed');
  }
  return (await res.json()).data as T;
}

export const avatarUrl = (avatar?: string | null) =>
  avatar ? `/uploads/${avatar}` : undefined;
