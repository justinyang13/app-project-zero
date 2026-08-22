import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CollectibleCatalogPanel } from "./CollectibleCatalogPanel";

const items = [
  { id: "item-1", name: "Hello Kitty x Godzilla", imageUrl: "" },
  { id: "item-2", name: "Kuromi x Mechagodzilla", imageUrl: "" },
];

describe("CollectibleCatalogPanel", () => {
  it("renders nothing when the catalog is empty", () => {
    const { container } = render(<CollectibleCatalogPanel items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("hides the catalog list until the toggle is opened", async () => {
    const user = userEvent.setup();
    render(<CollectibleCatalogPanel items={items} />);

    expect(screen.queryByText("Hello Kitty x Godzilla")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collectible Catalog" }));

    expect(screen.getByText("Hello Kitty x Godzilla")).toBeInTheDocument();
    expect(screen.getByText("Kuromi x Mechagodzilla")).toBeInTheDocument();
  });
});
