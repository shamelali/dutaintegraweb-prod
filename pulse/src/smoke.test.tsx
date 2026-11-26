import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";

test("renders the Pulse product shell", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /business overview/i })).toBeInTheDocument();
  expect(screen.getByText("Demo data")).toBeInTheDocument();
});
