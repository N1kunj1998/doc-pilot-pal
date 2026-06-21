export type Role = "Admin" | "Member";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgName: string;
};

export type Citation = {
  id: string;
  docName: string;
  page?: number;
  snippet: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type DocStatus = "Processing" | "Indexed" | "Failed";
export type Document = {
  id: string;
  name: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  status: DocStatus;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
};

export type Activity = {
  id: string;
  user: string;
  query: string;
  at: string;
};

export const mockThreads: ChatThread[] = [
  {
    id: "t1",
    title: "Onboarding process for new hires",
    updatedAt: "2026-06-16T10:12:00Z",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "What's our onboarding process for new engineers?",
        createdAt: "2026-06-16T10:10:00Z",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "New engineers go through a 2-week structured onboarding. Week 1 covers environment setup and codebase orientation. Week 2 focuses on shipping a small starter task with a mentor.",
        citations: [
          {
            id: "c1",
            docName: "Onboarding Guide.pdf",
            page: 3,
            snippet:
              "All new engineering hires complete a 2-week onboarding program. Week one is dedicated to environment setup, account provisioning, and codebase orientation with a buddy.",
          },
          {
            id: "c2",
            docName: "Engineering Handbook.pdf",
            page: 12,
            snippet:
              "By the end of week two, the new hire is expected to ship a small starter task under the guidance of an assigned mentor.",
          },
        ],
        createdAt: "2026-06-16T10:12:00Z",
      },
    ],
  },
  {
    id: "t2",
    title: "PTO policy questions",
    updatedAt: "2026-06-15T16:40:00Z",
    messages: [],
  },
  {
    id: "t3",
    title: "Q2 product roadmap summary",
    updatedAt: "2026-06-14T09:01:00Z",
    messages: [],
  },
  {
    id: "t4",
    title: "Security review checklist",
    updatedAt: "2026-06-12T13:22:00Z",
    messages: [],
  },
];

export const mockDocuments: Document[] = [
  { id: "d1", name: "Onboarding Guide.pdf", uploadedBy: "Sarah Chen", uploadedAt: "2026-06-10", size: "1.2 MB", status: "Indexed" },
  { id: "d2", name: "Engineering Handbook.pdf", uploadedBy: "Marcus Lee", uploadedAt: "2026-06-09", size: "3.8 MB", status: "Indexed" },
  { id: "d3", name: "Q2 Roadmap.docx", uploadedBy: "Priya Patel", uploadedAt: "2026-06-08", size: "420 KB", status: "Indexed" },
  { id: "d4", name: "Security Policy.pdf", uploadedBy: "Sarah Chen", uploadedAt: "2026-06-07", size: "880 KB", status: "Processing" },
  { id: "d5", name: "Brand Guidelines.pdf", uploadedBy: "Jordan Kim", uploadedAt: "2026-06-05", size: "5.1 MB", status: "Indexed" },
  { id: "d6", name: "Vendor Contracts.zip", uploadedBy: "Marcus Lee", uploadedAt: "2026-06-02", size: "12 MB", status: "Failed" },
];

export const mockMembers: Member[] = [
  { id: "u1", name: "Sarah Chen", email: "sarah@acme.com", role: "Admin", joinedAt: "2026-01-12" },
  { id: "u2", name: "Marcus Lee", email: "marcus@acme.com", role: "Admin", joinedAt: "2026-02-03" },
  { id: "u3", name: "Priya Patel", email: "priya@acme.com", role: "Member", joinedAt: "2026-03-18" },
  { id: "u4", name: "Jordan Kim", email: "jordan@acme.com", role: "Member", joinedAt: "2026-04-21" },
  { id: "u5", name: "Alex Rivera", email: "alex@acme.com", role: "Member", joinedAt: "2026-05-09" },
];

export const mockActivity: Activity[] = [
  { id: "a1", user: "Priya Patel", query: "What's our PTO carryover policy?", at: "2 min ago" },
  { id: "a2", user: "Jordan Kim", query: "Summarize the Q2 roadmap doc", at: "18 min ago" },
  { id: "a3", user: "Alex Rivera", query: "Who owns the security review checklist?", at: "1 hr ago" },
  { id: "a4", user: "Sarah Chen", query: "Latest brand color palette?", at: "3 hr ago" },
  { id: "a5", user: "Marcus Lee", query: "Vendor onboarding steps", at: "Yesterday" },
];

export const mockQueryVolume = Array.from({ length: 30 }).map((_, i) => ({
  day: `${i + 1}`,
  queries: Math.round(40 + Math.sin(i / 3) * 18 + Math.random() * 30),
}));
