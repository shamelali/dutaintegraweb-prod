import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import { StatCard } from "./stat-card";

test("renders title and value", () => {
  render(<StatCard title="Revenue" value="$12,345.67" />);

  expect(screen.getByText("Revenue")).toBeInTheDocument();
  expect(screen.getByText("$12,345.67")).toBeInTheDocument();
});

test("renders a delta when provided", () => {
  render(<StatCard title="Orders" value="12" delta={{ label: "+5%", positive: true }} />);

  expect(screen.getByText("+5%")).toBeInTheDocument();
});

test("omits the delta line when not provided", () => {
  render(<StatCard title="AOV" value="$99.00" />);

  expect(screen.getByText("AOV")).toBeInTheDocument();
  expect(screen.queryByText("+5%")).not.toBeInTheDocument();
});
