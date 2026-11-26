import { describe, expect, test } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  test("joins classes and drops falsy values", () => {
    expect(cn("a b", "c", undefined, false && "d", null)).toBe("a b c");
  });

  test("later classes win on tailwind conflicts", () => {
    expect(cn("px-2 px-3 py-1", "px-4")).toBe("py-1 px-4");
  });
});
