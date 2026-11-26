import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import { Sidebar } from "./sidebar";

test("renders the Pulse brand and active Dashboard navigation", () => {
  render(<Sidebar />);

  expect(screen.getByText("Pulse")).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: /navigation/i }),
  ).toBeInTheDocument();
  const dashboard = screen.getByRole("link", { name: /dashboard/i });
  expect(dashboard).toHaveAttribute("aria-current", "page");
});
