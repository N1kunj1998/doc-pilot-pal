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
  type Member,
  type Role,
} from "./mock-data";

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

export async function fetchDocuments(): Promise<Document[]> {
  await delay(250);
  return mockDocuments;
}

export async function uploadDocument(file: File): Promise<Document> {
  await delay(800);
  return {
    id: `d_${Date.now()}`,
    name: file.name,
    uploadedBy: "You",
    uploadedAt: new Date().toISOString().slice(0, 10),
    size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    status: "Processing",
  };
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
