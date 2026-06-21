import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

function renderTheme() {
  return renderHook(() => useTheme(), { wrapper: ThemeProvider });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("useTheme", () => {
  it("defaults to system", () => {
    const { result } = renderTheme();
    expect(result.current.theme).toBe("system");
  });

  it("applies the dark class when set to dark", () => {
    const { result } = renderTheme();
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class when set to light", () => {
    const { result } = renderTheme();
    act(() => result.current.setTheme("dark"));
    act(() => result.current.setTheme("light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists the choice to localStorage", () => {
    const { result } = renderTheme();
    act(() => result.current.setTheme("dark"));
    expect(localStorage.getItem("docpilot_theme")).toBe("dark");
  });

  it("restores the persisted choice on mount", () => {
    localStorage.setItem("docpilot_theme", "dark");
    const { result } = renderTheme();
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("system theme follows prefers-color-scheme: dark", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { result } = renderTheme();
    act(() => result.current.setTheme("system"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("defaults to system without throwing when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderTheme();
    expect(result.current.theme).toBe("system");
  });

  it("still updates in-memory state when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderTheme();
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("rejects an invalid stored value and stays at system", () => {
    localStorage.setItem("docpilot_theme", "banana");
    const { result } = renderTheme();
    expect(result.current.theme).toBe("system");
  });
});
