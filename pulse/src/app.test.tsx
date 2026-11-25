import { render, screen, fireEvent, within } from "@testing-library/react";
import { test, expect } from "vitest";
import { App } from "./App";
import { DEMO_ORDERS } from "./lib/demo-data";
import { selectDashboard, formatMoney } from "./lib/analytics";

const now = new Date("2026-11-25T12:00:00Z");
const metrics = selectDashboard(
  DEMO_ORDERS,
  { range: "30d", channel: "all", status: "all", search: "" },
  now,
).metrics;

test("renders the shell, badge, and default 30d metrics", () => {
  render(<App now={now} />);

  expect(screen.getByRole("heading", { name: /business overview/i })).toBeInTheDocument();
  expect(screen.getByText("Demo data")).toBeInTheDocument();
  const metricsPanel = screen.getByLabelText(/key metrics/i);
  expect(within(metricsPanel).getByText(formatMoney(metrics.revenue))).toBeInTheDocument();
  expect(within(metricsPanel).getByText(String(metrics.orders))).toBeInTheDocument();
  expect(within(metricsPanel).getByText(formatMoney(metrics.aov))).toBeInTheDocument();
  expect(within(metricsPanel).getByText(`${metrics.conversionRate}%`)).toBeInTheDocument();
  expect(screen.getByLabelText(/filters/i)).toBeInTheDocument();
});

test("linked filters recompute the metrics", () => {
  render(<App now={now} />);

  const metricsPanel = screen.getByLabelText(/key metrics/i);
  expect(within(metricsPanel).getByText(formatMoney(metrics.revenue))).toBeInTheDocument();

  const sevenDayRevenue = selectDashboard(
    DEMO_ORDERS,
    { range: "7d", channel: "all", status: "all", search: "" },
    now,
  ).metrics.revenue;

  fireEvent.click(screen.getByRole("button", { name: /7 days/i }));
  expect(within(metricsPanel).getByText(formatMoney(sevenDayRevenue))).toBeInTheDocument();
});

test("exposes the orders panel for the orders table", () => {
  render(<App now={now} />);

  expect(screen.getByTestId("orders-panel")).toHaveAttribute("aria-label", "Orders");
});

test("orders panel renders orders newest first", () => {
  render(<App now={now} />);

  const panel = screen.getByTestId("orders-panel");
  const ids = within(panel)
    .getAllByText(/^demo-\d{4}$/)
    .map((el) => el.textContent!);

  expect(ids[0]).toBe("demo-0054");
  expect(
    ids.every((id, i) => i === 0 || Number(id.slice(5)) < Number(ids[i - 1]!.slice(5))),
  ).toBe(true);
});

test("clicking an order row selects it", () => {
  render(<App now={now} />);

  const newest = screen.getByText("demo-0054");
  const row = newest.closest("tr") as HTMLElement;
  fireEvent.click(row);

  expect(row).toHaveAttribute("aria-current", "true");
  expect(screen.getByText("demo-0053").closest("tr")).not.toHaveAttribute("aria-current", "true");
});
