import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CitationChip } from "./CitationChip";

const citation = {
  id: "c1",
  docName: "Onboarding Guide.pdf",
  page: 3,
  snippet: "Relevant policy text goes here.",
};

describe("CitationChip", () => {
  it("renders the citation index, doc name, and page number", () => {
    render(<CitationChip citation={citation} index={1} />);

    expect(screen.getByText("[1]")).toBeInTheDocument();
    expect(screen.getByText("Onboarding Guide.pdf")).toBeInTheDocument();
    expect(screen.getByText("· p.3")).toBeInTheDocument();
  });

  it("reveals the source snippet when clicked", async () => {
    const user = userEvent.setup();
    render(<CitationChip citation={citation} index={1} />);

    expect(screen.queryByText(/Relevant policy text/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button"));

    expect(await screen.findByText(/Relevant policy text/)).toBeInTheDocument();
  });
});
