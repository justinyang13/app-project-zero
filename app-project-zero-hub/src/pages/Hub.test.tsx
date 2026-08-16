import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hub } from "./Hub";

describe("Hub", () => {
  it("renders a card linking out to each standalone project", () => {
    render(<Hub />);

    const helloWorldLink = screen.getByRole("link", { name: /open demo/i });
    expect(helloWorldLink).toHaveAttribute("href", "app-hello-world/");
    expect(helloWorldLink).toHaveAttribute("target", "_blank");

    const noteNinjaLink = screen.getByRole("link", { name: /play game/i });
    expect(noteNinjaLink).toHaveAttribute("href", "app-note-ninja/");
    expect(noteNinjaLink).toHaveAttribute("target", "_blank");
  });
});
