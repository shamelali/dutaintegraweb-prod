import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect } from "vitest";
import { TrendChart } from "./trend-chart";
import { formatMoney, type MetricPoint } from "../../lib/analytics";

const POINTS: readonly MetricPoint[] = [
  { date: "2026-08-21", revenue: 7900, orders: 1 },
  { date: "2026-08-22", revenue: 44900, orders: 1 },
  { date: "2026-08-23", revenue: 25800, orders: 1 },
];

test("renders an accessible trend chart with one point per datum", () => {
  render(<TrendChart points={POINTS} />);
  const svg = screen.getByRole("img", { name: /revenue trend/i });
  expect(screen.getByTitle("Revenue trend over time")).toBeInTheDocument();
  expect(svg.querySelectorAll("circle")).toHaveLength(3);
});

test("renders axes: a baseline and revenue labels", () => {
  render(<TrendChart points={POINTS} />);
  expect(screen.getByText(formatMoney(0))).toBeInTheDocument();
  expect(screen.getByText(formatMoney(44900))).toBeInTheDocument();
});

test("shows a tooltip with the hovered point's date, revenue, and orders", () => {
  render(<TrendChart points={POINTS} />);
  const dots = screen
    .getByRole("img", { name: /revenue trend/i })
    .querySelectorAll("circle");
  fireEvent.mouseOver(dots[1]);
  expect(
    screen.getByText("2026-08-22 · 449.00 · 1 order"),
  ).toBeInTheDocument();
  fireEvent.mouseOut(dots[1]);
  expect(
    screen.queryByText("2026-08-22 · 449.00 · 1 order"),
  ).not.toBeInTheDocument();
});

test("renders a single-point series without crashing", () => {
  render(<TrendChart points={[POINTS[0]]} />);
  expect(screen.getByRole("img", { name: /revenue trend/i })).toBeInTheDocument();
});
