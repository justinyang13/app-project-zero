import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CollectibleCatalogPanel } from "./CollectibleCatalogPanel";
import { DEFAULT_TIME_RANGE_HOURS, type TimeRangeHours } from "../utils/timeRange";

const items = [
  { id: "item-1", name: "Hello Kitty x Godzilla", imageUrl: "" },
  { id: "item-2", name: "Kuromi x Mechagodzilla", imageUrl: "" },
];

function ControlledPanel() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [timeRangeHours, setTimeRangeHours] = useState<TimeRangeHours>(DEFAULT_TIME_RANGE_HOURS);
  return (
    <CollectibleCatalogPanel
      items={items}
      selectedItemId={selectedItemId}
      onSelectItem={setSelectedItemId}
      timeRangeHours={timeRangeHours}
      onTimeRangeChange={setTimeRangeHours}
    />
  );
}

describe("CollectibleCatalogPanel", () => {
  it("renders nothing when the catalog is empty", () => {
    const { container } = render(
      <CollectibleCatalogPanel
        items={[]}
        selectedItemId={null}
        onSelectItem={vi.fn()}
        timeRangeHours={DEFAULT_TIME_RANGE_HOURS}
        onTimeRangeChange={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("hides the panel body until the toggle is opened", async () => {
    const user = userEvent.setup();
    render(
      <CollectibleCatalogPanel
        items={items}
        selectedItemId={null}
        onSelectItem={vi.fn()}
        timeRangeHours={DEFAULT_TIME_RANGE_HOURS}
        onTimeRangeChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Hello Kitty x Godzilla")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter" }));

    expect(screen.getByText("Hello Kitty x Godzilla")).toBeInTheDocument();
    expect(screen.getByText("Kuromi x Mechagodzilla")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "24h" })).toHaveAttribute("aria-checked", "true");
  });

  it("selects an item as the map filter when clicked, and clears it via the Clear control", async () => {
    const user = userEvent.setup();
    render(<ControlledPanel />);

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: /Hello Kitty x Godzilla/ }));

    expect(screen.getByRole("button", { name: /Hello Kitty x Godzilla/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Filtering: Hello Kitty x Godzilla")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByText(/Filtering:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hello Kitty x Godzilla/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a different time range when a pill is clicked", async () => {
    const user = userEvent.setup();
    render(<ControlledPanel />);

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("radio", { name: "1h" }));

    expect(screen.getByRole("radio", { name: "1h" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "24h" })).toHaveAttribute("aria-checked", "false");
  });
});
