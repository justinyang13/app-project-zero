import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoldingState } from "./HoldingState";

describe("HoldingState", () => {
  it("renders the given title and message", () => {
    render(<HoldingState title="No active hunt right now" message="Check back soon." />);

    expect(screen.getByRole("heading", { name: "No active hunt right now" })).toBeInTheDocument();
    expect(screen.getByText("Check back soon.")).toBeInTheDocument();
  });
});
