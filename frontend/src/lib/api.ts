// Mock API layer. Swap these out for real REST calls to FastAPI later.
import {
  mockThreads,
  mockDocuments,
  mockMembers,
  mockActivity,
  mockQueryVolume,
  type ChatThread,
  type ChatMessage,
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

export async function fetchChatThreads(): Promise<ChatThread[]> {
  await delay(200);
  return mockThreads;
}

export async function fetchChatThread(id: string): Promise<ChatThread | undefined> {
  await delay(150);
  return mockThreads.find((t) => t.id === id);
}

export async function sendChatMessage(_threadId: string, content: string): Promise<ChatMessage> {
  await delay(900);
  return {
    id: `m_${Date.now()}`,
    role: "assistant",
    content: `Based on the indexed documents, here's what I found regarding "${content}". The relevant policies and guidelines suggest a structured approach outlined in the team handbook.`,
    citations: [
      {
        id: `c_${Date.now()}`,
        docName: "Onboarding Guide.pdf",
        page: 3,
        snippet:
          "The structured approach described in this section provides a baseline for handling such requests across teams.",
      },
    ],
    createdAt: new Date().toISOString(),
  };
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
