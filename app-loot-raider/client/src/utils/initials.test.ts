import { describe, expect, it } from "vitest";
import { getInitials } from "./initials";

describe("getInitials", () => {
  it("takes the first letter of each side of an 'x' pairing", () => {
    expect(getInitials("Hello Kitty x Godzilla")).toBe("HG");
    expect(getInitials("Kuromi x Mechagodzilla")).toBe("KM");
    expect(getInitials("Badtz-Maru x Rodan")).toBe("BR");
  });

  it("is case-insensitive about the 'x' separator", () => {
    expect(getInitials("Foo X Bar")).toBe("FB");
  });

  it("falls back to the first two words when there is no 'x' pairing", () => {
    expect(getInitials("Golden Trophy")).toBe("GT");
    expect(getInitials("Solo")).toBe("S");
  });
});
