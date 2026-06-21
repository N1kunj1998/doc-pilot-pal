// Mock API layer. Swap these out for real REST calls to FastAPI later.
import {
  mockDocuments,
  mockMembers,
  mockActivity,
  mockQueryVolume,
  type ChatThread,
  type ChatMessage,
  type Citation,
  type Document,
  type DocStatus,
  type Member,
  type Role,
} from "./mock-data";
import { getToken } from "./session";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Real call to FastAPI backend — proves frontend/backend connection works.
export async function pingBackend(): Promise<{ message: string } | { error: string }> {
  try {
    const res = await fetch(`${API_URL}/api/hello`);
    if (!res.ok) throw new Error(`Backend responded ${res.status}`);
    return await res.json();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Backend unreachable" };
  }
}

type BackendCitation = {
  chunk_id: string;
  doc_name: string;
  page: number | null;
  snippet: string;
};

type BackendChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: BackendCitation[] | null;
  created_at: string;
};

type BackendChatThread = {
  id: string;
  title: string;
  created_at: string;
  messages: BackendChatMessage[];
};

function toCitation(c: BackendCitation): Citation {
  return { id: c.chunk_id, docName: c.doc_name, page: c.page ?? undefined, snippet: c.snippet };
}

function toMessage(m: BackendChatMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citations: m.citations ? m.citations.map(toCitation) : undefined,
    createdAt: m.created_at,
  };
}

function toThread(t: BackendChatThread): ChatThread {
  return {
    id: t.id,
    title: t.title,
    updatedAt: t.created_at,
    messages: t.messages.map(toMessage),
  };
}

export async function fetchChatThreads(): Promise<ChatThread[]> {
  const res = await fetch(`${API_URL}/chat/threads`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load chat threads (${res.status})`);
  const threads: BackendChatThread[] = await res.json();
  return threads.map(toThread);
}

export async function fetchChatThread(id: string): Promise<ChatThread | undefined> {
  const threads = await fetchChatThreads();
  return threads.find((t) => t.id === id);
}

export async function createChatThread(): Promise<ChatThread> {
  const res = await fetch(`${API_URL}/chat/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Failed to create chat thread");
  return toThread(data as BackendChatThread);
}

export async function sendChatMessage(threadId: string, content: string): Promise<ChatMessage> {
  const res = await fetch(`${API_URL}/chat/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Failed to send message");
  return toMessage(data as BackendChatMessage);
}

type BackendDocument = {
  id: string;
  name: string;
  size: number;
  status: string;
  created_at: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return `${mb.endsWith(".0") ? mb.slice(0, -2) : mb} MB`;
}

function toDocument(backendDoc: BackendDocument): Document {
  return {
    id: backendDoc.id,
    name: backendDoc.name,
    // The backend doesn't track/expose the uploader's identity yet.
    uploadedBy: "—",
    uploadedAt: backendDoc.created_at.slice(0, 10),
    size: formatSize(backendDoc.size),
    status: (backendDoc.status.charAt(0).toUpperCase() + backendDoc.status.slice(1)) as DocStatus,
  };
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_URL}/documents`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load documents (${res.status})`);
  const docs: BackendDocument[] = await res.json();
  return docs.map(toDocument);
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/documents`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail ?? "Failed to upload document");
  }
  return toDocument(data as BackendDocument);
}

export async function fetchOrgUsers(): Promise<Member[]> {
  await delay(200);
  return mockMembers;
}

export async function inviteMember(email: string, role: Role): Promise<Member> {
  await delay(500);
  return {
    id: `u_${Date.now()}`,
    name: email.split("@")[0],
    email,
    role,
    joinedAt: new Date().toISOString().slice(0, 10),
  };
}

export async function fetchAdminStats() {
  await delay(200);
  return {
    totalDocs: mockDocuments.filter((d) => d.status === "Indexed").length,
    monthlyQueries: 1284,
    activeMembers: mockMembers.length,
    queryVolume: mockQueryVolume,
    activity: mockActivity,
  };
}
