import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpaceBackground } from "./SpaceBackground";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response: Partial<Response> & { json: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, ...response } as Response),
  );
}

describe("SpaceBackground", () => {
  it("renders today's APOD photo as the background once loaded", async () => {
    mockFetch({
      json: () =>
        Promise.resolve({
          media_type: "image",
          url: "https://apod.nasa.gov/apod/image/today.jpg",
          title: "A Nice Nebula",
          copyright: "Jane Astronomer",
        }),
    });

    render(<SpaceBackground />);

    expect(await screen.findByText(/A Nice Nebula/)).toHaveTextContent("© Jane Astronomer");
  });

  it("falls back to the gradient sky when APOD is a video", async () => {
    mockFetch({
      json: () =>
        Promise.resolve({ media_type: "video", url: "https://example.com/video", title: "A Launch" }),
    });

    render(<SpaceBackground />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByText(/A Launch/)).not.toBeInTheDocument();
  });

  it("falls back to the gradient sky when the request fails, keeping the static NASA credit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<SpaceBackground />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByText("Background: NASA Astronomy Picture of the Day")).toBeInTheDocument();
    expect(document.querySelector(".space-bg__credit-detail")).not.toBeInTheDocument();
  });
});
