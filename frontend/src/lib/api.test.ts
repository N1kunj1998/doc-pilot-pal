import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChatThread,
  fetchChatThread,
  fetchChatThreads,
  fetchDocuments,
  sendChatMessage,
  uploadDocument,
} from "./api";
import { setToken } from "./session";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  setToken("fake.jwt.token");
});

describe("fetchDocuments", () => {
  it("GETs /documents with the bearer token and maps the backend shape to the frontend Document shape", async () => {
    const fetchMock = vi.fn().mockReturnValue(
      jsonResponse([
        {
          id: "d1",
          name: "Handbook.pdf",
          size: 1_258_291,
          status: "processing",
          created_at: "2026-06-21T16:03:43.861981",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const docs = await fetchDocuments();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/documents"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer fake.jwt.token" }),
      }),
    );
    expect(docs).toEqual([
      {
        id: "d1",
        name: "Handbook.pdf",
        uploadedBy: "—",
        uploadedAt: "2026-06-21",
        size: "1.2 MB",
        status: "Processing",
      },
    ]);
  });

  it("formats sizes under 1MB as whole KB", async () => {
    const fetchMock = vi.fn().mockReturnValue(
      jsonResponse([
        {
          id: "d1",
          name: "Notes.txt",
          size: 430_080,
          status: "processing",
          created_at: "2026-06-21T16:03:43.861981",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const docs = await fetchDocuments();
    expect(docs[0].size).toBe("420 KB");
  });
});

describe("uploadDocument", () => {
  it("POSTs a multipart form to /documents with the bearer token and maps the response", async () => {
    const fetchMock = vi.fn().mockReturnValue(
      jsonResponse(
        {
          id: "d2",
          name: "report.pdf",
          size: 2048,
          status: "processing",
          created_at: "2026-06-21T16:03:43.861981",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello world"], "report.pdf", { type: "application/pdf" });
    const doc = await uploadDocument(file);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/documents"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake.jwt.token" }),
        body: expect.any(FormData),
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect((options.body as FormData).get("file")).toBe(file);
    expect(doc).toEqual({
      id: "d2",
      name: "report.pdf",
      uploadedBy: "—",
      uploadedAt: "2026-06-21",
      size: "2 KB",
      status: "Processing",
    });
  });

  it("throws with the backend's error message when the upload is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValue(jsonResponse({ detail: "File exceeds the 25MB limit" }, 413));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["x"], "huge.pdf", { type: "application/pdf" });
    await expect(uploadDocument(file)).rejects.toThrow("File exceeds the 25MB limit");
  });
});

const backendThread = {
  id: "t1",
  title: "Onboarding question",
  created_at: "2026-06-21T16:03:43.861981",
  messages: [
    {
      id: "m1",
      role: "user",
      content: "What do new hires get?",
      citations: null,
      created_at: "2026-06-21T16:03:00",
    },
    {
      id: "m2",
      role: "assistant",
      content: "A laptop and a badge.",
      citations: [
        {
          chunk_id: "c1",
          doc_name: "Onboarding Guide.pdf",
          page: 3,
          snippet: "New hires get a laptop.",
        },
      ],
      created_at: "2026-06-21T16:03:10",
    },
  ],
};

describe("fetchChatThreads", () => {
  it("GETs /chat/threads with the bearer token and maps threads + messages + citations", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse([backendThread]));
    vi.stubGlobal("fetch", fetchMock);

    const threads = await fetchChatThreads();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/chat/threads"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer fake.jwt.token" }),
      }),
    );
    expect(threads).toEqual([
      {
        id: "t1",
        title: "Onboarding question",
        updatedAt: "2026-06-21T16:03:43.861981",
        messages: [
          {
            id: "m1",
            role: "user",
            content: "What do new hires get?",
            citations: undefined,
            createdAt: "2026-06-21T16:03:00",
          },
          {
            id: "m2",
            role: "assistant",
            content: "A laptop and a badge.",
            citations: [
              {
                id: "c1",
                docName: "Onboarding Guide.pdf",
                page: 3,
                snippet: "New hires get a laptop.",
              },
            ],
            createdAt: "2026-06-21T16:03:10",
          },
        ],
      },
    ]);
  });

  it("omits the citation's page when the backend doesn't know it", async () => {
    const threadWithUnknownPage = {
      ...backendThread,
      messages: [
        {
          id: "m2",
          role: "assistant",
          content: "A laptop and a badge.",
          citations: [{ chunk_id: "c1", doc_name: "notes.txt", page: null, snippet: "..." }],
          created_at: "2026-06-21T16:03:10",
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(jsonResponse([threadWithUnknownPage])));

    const threads = await fetchChatThreads();

    expect(threads[0].messages[0].citations).toEqual([
      { id: "c1", docName: "notes.txt", page: undefined, snippet: "..." },
    ]);
  });
});

describe("fetchChatThread", () => {
  it("finds the thread with the matching id from the full thread list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(jsonResponse([backendThread])));

    const thread = await fetchChatThread("t1");

    expect(thread?.id).toBe("t1");
  });

  it("returns undefined when no thread matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(jsonResponse([backendThread])));

    const thread = await fetchChatThread("does-not-exist");

    expect(thread).toBeUndefined();
  });
});

describe("createChatThread", () => {
  it("POSTs to /chat/threads with the bearer token and maps the response", async () => {
    const emptyThread = {
      id: "t2",
      title: "New conversation",
      created_at: "2026-06-21T16:04:00",
      messages: [],
    };
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(emptyThread, 201));
    vi.stubGlobal("fetch", fetchMock);

    const thread = await createChatThread();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/chat/threads"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake.jwt.token" }),
      }),
    );
    expect(thread).toEqual({
      id: "t2",
      title: "New conversation",
      updatedAt: "2026-06-21T16:04:00",
      messages: [],
    });
  });
});

describe("sendChatMessage", () => {
  it("POSTs the message content and returns the mapped assistant reply", async () => {
    const assistantReply = {
      id: "m3",
      role: "assistant",
      content: "Here's the answer.",
      citations: [{ chunk_id: "c2", doc_name: "doc.pdf", page: 1, snippet: "..." }],
      created_at: "2026-06-21T16:05:00",
    };
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(assistantReply, 201));
    vi.stubGlobal("fetch", fetchMock);

    const message = await sendChatMessage("t1", "What is the answer?");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/chat/threads/t1/messages"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake.jwt.token" }),
        body: JSON.stringify({ content: "What is the answer?" }),
      }),
    );
    expect(message).toEqual({
      id: "m3",
      role: "assistant",
      content: "Here's the answer.",
      citations: [{ id: "c2", docName: "doc.pdf", page: 1, snippet: "..." }],
      createdAt: "2026-06-21T16:05:00",
    });
  });

  it("throws with the backend's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(jsonResponse({ detail: "Thread not found" }, 404)),
    );

    await expect(sendChatMessage("missing", "hi")).rejects.toThrow("Thread not found");
  });
});
