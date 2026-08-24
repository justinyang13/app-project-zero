import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ALL_GENRES, GenreChips } from "./GenreChips";

describe("GenreChips", () => {
  it("marks the active chip and calls onSelect with the clicked genre", async () => {
    const onSelect = vi.fn();
    render(<GenreChips active={ALL_GENRES} onSelect={onSelect} />);

    expect(screen.getByText("All")).toHaveClass("chip--active");
    expect(screen.getByText("Fantasy")).not.toHaveClass("chip--active");

    await userEvent.click(screen.getByText("Fantasy"));
    expect(onSelect).toHaveBeenCalledWith("Fantasy");
  });

  it("shows short chip labels for the longer bucket names", () => {
    render(<GenreChips active={ALL_GENRES} onSelect={vi.fn()} />);
    expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
    expect(screen.getByText("Historical")).toBeInTheDocument();
    expect(screen.queryByText("Science Fiction")).not.toBeInTheDocument();
  });
});
