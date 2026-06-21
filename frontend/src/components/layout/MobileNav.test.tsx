import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "./MobileNav";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("MobileNav", () => {
  it("renders all five nav items for an Admin user", () => {
    render(<MobileNav pathname="/chat" role="Admin" />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("hides admin-only items for a Member user", () => {
    render(<MobileNav pathname="/chat" role="Member" />);
    expect(screen.queryByText("Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("marks the current route's link as active", () => {
    render(<MobileNav pathname="/documents" role="Admin" />);
    const link = screen.getByText("Documents").closest("a");
    expect(link?.className).toContain("text-primary");
  });

  it("does not mark other routes as active", () => {
    render(<MobileNav pathname="/documents" role="Admin" />);
    const link = screen.getByText("Chat").closest("a");
    expect(link?.className).not.toContain("text-primary");
  });
});
