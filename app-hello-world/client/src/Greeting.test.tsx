import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CombinedError, UseQueryResponse } from "urql";
import { Greeting } from "./Greeting";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("urql", () => ({ useQuery }));

function mockResult(result: Partial<UseQueryResponse[0]>) {
  useQuery.mockReturnValue([
    { fetching: false, stale: false, data: undefined, error: undefined, ...result },
    vi.fn(),
  ]);
}

describe("Greeting", () => {
  it("renders the greeting returned by the GraphQL API", () => {
    mockResult({ data: { hello: "Hello World" } });

    render(<Greeting />);

    expect(screen.getByRole("heading", { name: "Hello World" })).toBeInTheDocument();
  });

  it("shows a loading state while the query is in flight", () => {
    mockResult({ fetching: true });

    render(<Greeting />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("shows an error message when the query fails", () => {
    mockResult({ error: { message: "network error" } as CombinedError });

    render(<Greeting />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load greeting/i);
  });
});
