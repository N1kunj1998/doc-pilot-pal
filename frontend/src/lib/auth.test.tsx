import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "./auth";

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
  localStorage.clear();
});

describe("useAuth", () => {
  it("starts logged out", () => {
    const { result } = renderAuth();
    expect(result.current.user).toBeNull();
  });

  it("logs in a user as Admin by default", () => {
    const { result } = renderAuth();

    act(() => result.current.login("sarah@acme.com", "password"));

    expect(result.current.user).toMatchObject({
      email: "sarah@acme.com",
      name: "sarah",
      role: "Admin",
    });
  });

  it("persists the logged-in user across remounts (localStorage)", () => {
    const { result, unmount } = renderAuth();
    act(() => result.current.login("sarah@acme.com", "password"));
    unmount();

    const { result: secondMount } = renderAuth();
    expect(secondMount.current.user?.email).toBe("sarah@acme.com");
  });

  it("logs out and clears persisted state", () => {
    const { result } = renderAuth();
    act(() => result.current.login("sarah@acme.com", "password"));
    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("docpilot_user")).toBeNull();
  });

  it("switches role between Admin and Member (used by the demo role-switcher)", () => {
    const { result } = renderAuth();
    act(() => result.current.login("sarah@acme.com", "password"));
    expect(result.current.user?.role).toBe("Admin");

    act(() => result.current.setRole("Member"));
    expect(result.current.user?.role).toBe("Member");
  });
});
