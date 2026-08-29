import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SortControl } from "./SortControl";

describe("SortControl", () => {
  it("reflects the current value and calls onChange with the selected option", async () => {
    const onChange = vi.fn();
    render(<SortControl value="popularity" onChange={onChange} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("popularity");

    await userEvent.selectOptions(select, "title");
    expect(onChange).toHaveBeenCalledWith("title");
  });

  it("lists all four sort options", () => {
    render(<SortControl value="popularity" onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Popularity" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Author (last name)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Genre" })).toBeInTheDocument();
  });
});
