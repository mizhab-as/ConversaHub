/**
 * ConversaHub API Client
 * Centralised fetch wrapper for all backend HTTP calls.
 * Handles JWT bearer tokens from localStorage automatically.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ─────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  role: "customer" | "agent" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  status: "open" | "assigned" | "resolved";
  priority: "low" | "medium" | "high";
  messages?: string;
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
  collection?: string;
  message?: string;
}

export interface KBDocument {
  doc_id: string;
  title: string;
  filename: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
  chunks: number;
}

export interface StatsResponse {
  total_users: number;
  total_tickets: number;
  open_tickets: number;
  assigned_tickets: number;
  resolved_tickets: number;
  resolution_rate: number;
}

// ─── Token helpers ──────────────────────────────────────────
export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

export const setToken = (token: string) => localStorage.setItem("access_token", token);

export const clearToken = () => localStorage.removeItem("access_token");

// ─── Core fetch ─────────────────────────────────────────────
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

// ─── Auth ───────────────────────────────────────────────────
export const authApi = {
  /** Public signup — always creates a customer account */
  signup: (email: string, password: string) =>
    apiFetch<User>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, role: "customer" }),
    }),

  /** Login with email/password — stores access_token in localStorage */
  login: async (email: string, password: string): Promise<LoginResponse> => {
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

// ─── Chat ───────────────────────────────────────────────────
export const chatApi = {
  sendMessage: (message: string) =>
    apiFetch<ChatResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// ─── Tickets ────────────────────────────────────────────────
export const ticketsApi = {
  list: () => apiFetch<Ticket[]>("/api/v1/tickets"),

  get: (id: number) => apiFetch<Ticket>(`/api/v1/tickets/${id}`),

  create: (subject: string, description: string, priority: string) =>
    apiFetch<Ticket>("/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject, description, priority }),
    }),

  assign: (ticketId: number) =>
    apiFetch<Ticket>(`/api/v1/tickets/${ticketId}/assign`, { method: "PUT" }),

  unassign: (ticketId: number) =>
    apiFetch<Ticket>(`/api/v1/tickets/${ticketId}/unassign`, { method: "PUT" }),

  updateStatus: (id: number, status: string, assignedAgentId?: number | null) =>
    apiFetch<Ticket>(`/api/v1/tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        ...(assignedAgentId !== undefined && { assigned_agent_id: assignedAgentId }),
      }),
    }),

  sendMessage: (id: number, text: string) =>
    apiFetch<Ticket>(`/api/v1/tickets/${id}/message`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/api/v1/tickets/${id}`, { method: "DELETE" }),
};

// ─── Knowledge Base ─────────────────────────────────────────
export const kbApi = {
  status: async (): Promise<KBStatus> => {
    const raw = await apiFetch<{ collection_name: string; total_chunks: number }>("/api/v1/kb/status");
    return {
      count: raw.total_chunks,
      collection: raw.collection_name,
    };
  },

  upload: async (title: string, file: File): Promise<IngestionResponse> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/v1/kb/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? "Upload failed");
    }
    const data = await res.json();
    return {
      title: title,
      chunks: data.chunks,
      message: data.message,
    };
  },

  listDocuments: () => apiFetch<KBDocument[]>("/api/v1/kb/documents"),

  deleteDocument: (docId: string) =>
    apiFetch<{ message: string }>(`/api/v1/kb/documents/${docId}`, { method: "DELETE" }),

  clear: () =>
    apiFetch<{ message: string }>("/api/v1/kb/clear", { method: "POST" }),
};

// ─── Users (Admin only) ─────────────────────────────────────
export const usersApi = {
  list: () => apiFetch<User[]>("/api/v1/users"),

  setRole: (userId: number, role: string) =>
    apiFetch<User>(`/api/v1/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  setActive: (userId: number, is_active: boolean) =>
    apiFetch<User>(`/api/v1/users/${userId}/active`, {
      method: "PUT",
      body: JSON.stringify({ is_active }),
    }),

  delete: (userId: number) =>
    apiFetch<{ message: string; id: number }>(`/api/v1/users/${userId}`, {
      method: "DELETE",
    }),
};

// ─── Helpers ────────────────────────────────────────────────
/** Formats an ISO timestamp as "Jul 9, 10:32 AM" */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Formats an ISO timestamp as relative "2 hours ago" */
export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
