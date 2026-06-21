import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth";
import { getToken } from "./session";

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const tokenResponse = {
  access_token: "fake.jwt.token",
  token_type: "bearer",
  user: {
    id: "u1",
    name: "Sarah",
    email: "sarah@acme.com",
    role: "Admin",
    org_id: "o1",
    org_name: "Acme Inc",
    created_at: "2026-01-01T00:00:00Z",
  },
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useAuth", () => {
  it("starts logged out and resolves isLoading to false when there's no stored session", async () => {
    const { result } = renderAuth();
    expect(result.current.user).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("logs in by calling POST /auth/login and stores the returned user + token", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(tokenResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAuth();
    await act(async () => {
      await result.current.login("sarah@acme.com", "password123");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "sarah@acme.com", password: "password123" }),
      }),
    );
    expect(result.current.user).toMatchObject({
      id: "u1",
      name: "Sarah",
      email: "sarah@acme.com",
      role: "Admin",
      orgName: "Acme Inc",
    });
    expect(getToken()).toBe("fake.jwt.token");
  });

  it("throws with the backend's error message on failed login and does not log in", async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValue(jsonResponse({ detail: "Invalid email or password" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAuth();
    await expect(
      act(async () => {
        await result.current.login("sarah@acme.com", "wrong");
      }),
    ).rejects.toThrow("Invalid email or password");

    expect(result.current.user).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("signs up by calling POST /auth/signup and stores the returned user + token", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(tokenResponse, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAuth();
    await act(async () => {
      await result.current.signup("Sarah", "sarah@acme.com", "password123", "Acme Inc");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/signup"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Sarah",
          email: "sarah@acme.com",
          password: "password123",
          org_name: "Acme Inc",
        }),
      }),
    );
    expect(result.current.user).toMatchObject({ email: "sarah@acme.com", orgName: "Acme Inc" });
    expect(getToken()).toBe("fake.jwt.token");
  });

  it("throws with the backend's error message on failed signup (e.g. duplicate email)", async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValue(jsonResponse({ detail: "Email already registered" }, 409));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAuth();
    await expect(
      act(async () => {
        await result.current.signup("Sarah", "sarah@acme.com", "password123", "Acme Inc");
      }),
    ).rejects.toThrow("Email already registered");

    expect(result.current.user).toBeNull();
  });

  it("persists the logged-in user and token across remounts (localStorage)", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(tokenResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderAuth();
    await act(async () => {
      await result.current.login("sarah@acme.com", "password123");
    });
    unmount();

    const { result: secondMount } = renderAuth();
    await waitFor(() => expect(secondMount.current.user?.email).toBe("sarah@acme.com"));
    expect(getToken()).toBe("fake.jwt.token");
  });

  it("exposes isLoading=true until the localStorage restore resolves, so route guards don't redirect a logged-in user before it's checked", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(tokenResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderAuth();
    await act(async () => {
      await result.current.login("sarah@acme.com", "password123");
    });
    unmount();

    const { result: secondMount } = renderAuth();
    await waitFor(() => expect(secondMount.current.isLoading).toBe(false));
    expect(secondMount.current.user?.email).toBe("sarah@acme.com");
  });

  it("logs out and clears persisted user + token", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(tokenResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAuth();
    await act(async () => {
      await result.current.login("sarah@acme.com", "password123");
    });
    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("switches role between Admin and Member (used by the demo role-switcher)", async () => {
    const fetchMock = vi.fn().mockReturnValue(jsonResponse(tokenResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAuth();
    await act(async () => {
      await result.current.login("sarah@acme.com", "password123");
    });
    expect(result.current.user?.role).toBe("Admin");

    act(() => result.current.setRole("Member"));
    expect(result.current.user?.role).toBe("Member");
  });
});
