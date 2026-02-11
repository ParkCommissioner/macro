// Client-side API client with automatic JWT injection

const TOKEN_KEY = 'macro_auth_token';

export const auth = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  getUserFromToken(): { id: string; email: string } | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  },
};

export class APIError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = auth.getToken();

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    auth.clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new APIError('Unauthorized', 401, 'unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new APIError(error.message || 'API request failed', response.status, error.error || 'unknown');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// API methods
export const api = {
  auth: {
    signup: (email: string, password: string) =>
      apiClient<{ user: { id: string; email: string; created_at: string }; token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    login: (email: string, password: string) =>
      apiClient<{ user: { id: string; email: string; created_at: string }; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  entries: {
    create: (raw_text: string, timestamp?: string) =>
      apiClient<{
        entry: { id: string; user_id: string; raw_text: string; timestamp: string; created_at: string };
        items: Array<{
          id: string;
          entry_id: string;
          name: string;
          calories: { min: number; mid: number; max: number };
          protein: { min: number; mid: number; max: number };
          carbs: { min: number; mid: number; max: number };
          fat: { min: number; mid: number; max: number };
          fiber: { min: number; mid: number; max: number };
          confidence: 'low' | 'medium' | 'high';
          created_at: string;
        }>;
        totals: {
          calories: { min: number; mid: number; max: number };
          protein: { min: number; mid: number; max: number };
          carbs: { min: number; mid: number; max: number };
          fat: { min: number; mid: number; max: number };
          fiber: { min: number; mid: number; max: number };
        };
      }>('/entries', {
        method: 'POST',
        body: JSON.stringify({ raw_text, timestamp }),
      }),

    list: (params?: { from?: string; to?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      const query = searchParams.toString();
      return apiClient<{
        entries: Array<{
          id: string;
          user_id: string;
          raw_text: string;
          timestamp: string;
          created_at: string;
          items: Array<{
            id: string;
            entry_id: string;
            name: string;
            calories: { min: number; mid: number; max: number };
            protein: { min: number; mid: number; max: number };
            carbs: { min: number; mid: number; max: number };
            fat: { min: number; mid: number; max: number };
            fiber: { min: number; mid: number; max: number };
            confidence: 'low' | 'medium' | 'high';
            created_at: string;
          }>;
        }>;
        total: number;
        has_more: boolean;
      }>(`/entries${query ? `?${query}` : ''}`);
    },

    get: (id: string) =>
      apiClient<{
        entry: {
          id: string;
          user_id: string;
          raw_text: string;
          timestamp: string;
          created_at: string;
          items: Array<{
            id: string;
            entry_id: string;
            name: string;
            calories: { min: number; mid: number; max: number };
            protein: { min: number; mid: number; max: number };
            carbs: { min: number; mid: number; max: number };
            fat: { min: number; mid: number; max: number };
            fiber: { min: number; mid: number; max: number };
            confidence: 'low' | 'medium' | 'high';
            created_at: string;
          }>;
        };
      }>(`/entries/${id}`),

    update: (id: string, raw_text: string, timestamp?: string) =>
      apiClient<{
        entry: { id: string; user_id: string; raw_text: string; timestamp: string; created_at: string };
        items: Array<{
          id: string;
          entry_id: string;
          name: string;
          calories: { min: number; mid: number; max: number };
          protein: { min: number; mid: number; max: number };
          carbs: { min: number; mid: number; max: number };
          fat: { min: number; mid: number; max: number };
          fiber: { min: number; mid: number; max: number };
          confidence: 'low' | 'medium' | 'high';
          created_at: string;
        }>;
        totals: {
          calories: { min: number; mid: number; max: number };
          protein: { min: number; mid: number; max: number };
          carbs: { min: number; mid: number; max: number };
          fat: { min: number; mid: number; max: number };
          fiber: { min: number; mid: number; max: number };
        };
      }>(`/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ raw_text, timestamp }),
      }),

    delete: (id: string) => apiClient<void>(`/entries/${id}`, { method: 'DELETE' }),
  },

  dashboard: {
    today: () =>
      apiClient<{
        date: string;
        totals: {
          calories: { min: number; mid: number; max: number };
          protein: { min: number; mid: number; max: number };
          carbs: { min: number; mid: number; max: number };
          fat: { min: number; mid: number; max: number };
          fiber: { min: number; mid: number; max: number };
        };
        entries: Array<{
          id: string;
          raw_text: string;
          timestamp: string;
          totals: {
            calories: { min: number; mid: number; max: number };
            protein: { min: number; mid: number; max: number };
            carbs: { min: number; mid: number; max: number };
            fat: { min: number; mid: number; max: number };
            fiber: { min: number; mid: number; max: number };
          };
          item_count: number;
        }>;
        entry_count: number;
      }>('/dashboard/today'),

    history: (days?: number) =>
      apiClient<{
        days: Array<{
          date: string;
          totals: {
            calories: { min: number; mid: number; max: number };
            protein: { min: number; mid: number; max: number };
            carbs: { min: number; mid: number; max: number };
            fat: { min: number; mid: number; max: number };
            fiber: { min: number; mid: number; max: number };
          };
          entry_count: number;
        }>;
        period: { from: string; to: string };
      }>(`/dashboard/history${days ? `?days=${days}` : ''}`),

    weekly: () =>
      apiClient<{
        week: { start: string; end: string };
        averages: {
          calories: { min: number; mid: number; max: number };
          protein: { min: number; mid: number; max: number };
          carbs: { min: number; mid: number; max: number };
          fat: { min: number; mid: number; max: number };
          fiber: { min: number; mid: number; max: number };
        };
        daily_ranges: {
          calories: { min: number; max: number };
          protein: { min: number; max: number };
          carbs: { min: number; max: number };
          fat: { min: number; max: number };
          fiber: { min: number; max: number };
        };
        days_logged: number;
        consistency_score: number;
      }>('/dashboard/weekly'),
  },

  suggestions: {
    list: (limit?: number) =>
      apiClient<{
        suggestions: Array<{
          raw_text: string;
          last_used: string;
          use_count: number;
        }>;
      }>(`/suggestions${limit ? `?limit=${limit}` : ''}`),
  },
};
