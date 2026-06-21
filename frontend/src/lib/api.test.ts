import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDocuments, uploadDocument } from "./api";
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
