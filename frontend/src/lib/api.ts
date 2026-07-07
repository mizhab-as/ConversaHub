/**
 * ConversaHub API Client
 * Centralised fetch wrapper for all backend HTTP calls.
 * Handles JWT bearer tokens from localStorage automatically.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface ChatResponse {
  response: string;
  routing_target: string;
  routing_reason: string;
}

export interface Ticket {
  id: number;
  user_id: number;
  assigned_agent_id: number | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface KBStatus {
  count: number;
  collection: string;
}

export interface IngestionResponse {
  title: string;
  chunks: number;
  collection: string;
}

// ─── Token helpers ─────────────────────────────────────────
export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

export const setToken = (token: string) => localStorage.setItem("access_token", token);

export const clearToken = () => localStorage.removeItem("access_token");

// ─── Core fetch ────────────────────────────────────────────
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────
export const authApi = {
  /** Sign up a new user */
  signup: (email: string, password: string, role: string) =>
    apiFetch<User>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    }),

  /** Login with email/password, returns access_token */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Backend expects form-encoded data for OAuth2 login
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail ?? "Login failed");
    }
    const data: LoginResponse = await res.json();
    setToken(data.access_token);
    return data;
  },

  /** Get current user profile */
  me: () => apiFetch<User>("/api/v1/auth/me"),

  logout: () => clearToken(),
};

// ─── Chat ──────────────────────────────────────────────────
export const chatApi = {
  sendMessage: (message: string) =>
    apiFetch<ChatResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// ─── Tickets ───────────────────────────────────────────────
export const ticketsApi = {
  list: () => apiFetch<Ticket[]>("/api/v1/tickets"),

  create: (subject: string, description: string, priority: string) =>
    apiFetch<Ticket>("/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject, description, priority }),
    }),

  assign: (ticketId: number) =>
    apiFetch<Ticket>(`/api/v1/tickets/${ticketId}/assign`, { method: "PUT" }),

  updateStatus: (ticketId: number, status: string) =>
    apiFetch<Ticket>(`/api/v1/tickets/${ticketId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

// ─── Knowledge Base ────────────────────────────────────────
export const kbApi = {
  status: () => apiFetch<KBStatus>("/api/v1/kb/status"),

  upload: (title: string, content: string) =>
    apiFetch<IngestionResponse>("/api/v1/kb/upload", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    }),

  clear: () =>
    apiFetch<{ message: string }>("/api/v1/kb/clear", { method: "POST" }),
};
