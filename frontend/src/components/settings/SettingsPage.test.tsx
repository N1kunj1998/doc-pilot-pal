import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { SettingsPage } from "./SettingsPage";
import * as api from "@/lib/api";

function renderSettings() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe("SettingsPage backend connection indicator", () => {
  it("shows 'Connected to FastAPI backend' when the backend responds", async () => {
    vi.spyOn(api, "pingBackend").mockResolvedValue({ message: "Hello from DocPilot backend" });

    renderSettings();

    expect(screen.getByText("Checking...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Connected to FastAPI backend")).toBeInTheDocument();
    });
  });

  it("shows 'Backend unreachable' when the backend call fails", async () => {
    vi.spyOn(api, "pingBackend").mockResolvedValue({ error: "Backend unreachable" });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Backend unreachable")).toBeInTheDocument();
    });
  });
});

describe("SettingsPage usage limits", () => {
  it("renders all three usage limit rows with their values", () => {
    vi.spyOn(api, "pingBackend").mockResolvedValue({ message: "ok" });

    renderSettings();

    expect(screen.getByText("Documents indexed")).toBeInTheDocument();
    expect(screen.getByText("42 / 500")).toBeInTheDocument();
    expect(screen.getByText("Queries this month")).toBeInTheDocument();
    expect(screen.getByText("1,284 / 10,000")).toBeInTheDocument();
    expect(screen.getByText("Seats")).toBeInTheDocument();
    expect(screen.getByText("5 / 25")).toBeInTheDocument();
  });
});
