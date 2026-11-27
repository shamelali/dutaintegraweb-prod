import { render, screen, fireEvent, within } from "@testing-library/react";
import { test, expect } from "vitest";
import { Rankings } from "./rankings";
import type { ChannelAggregate, ProductAggregate } from "../../lib/analytics";

const CHANNELS: ChannelAggregate[] = [
  { channel: "direct", revenue: 44900, orders: 120, share: 44.4 },
  { channel: "referral", revenue: 25800, orders: 70, share: 26.0 },
  { channel: "social", revenue: 7900, orders: 25, share: 9.3 },
];

const PRODUCTS: ProductAggregate[] = [
  { product: "Starter Pack", sku: "SP-001", revenue: 44900, units: 2, orders: 2 },
  { product: "Pro Seat", sku: "PS-002", revenue: 25800, units: 3, orders: 1 },
  { product: "Add-on", sku: "AO-003", revenue: 7900, units: 1, orders: 1 },
];

test("renders an accessible region with ranked channels and products", () => {
  render(<Rankings channels={CHANNELS} products={PRODUCTS} />);

  expect(screen.getByRole("region", { name: /rankings/i })).toBeInTheDocument();
  expect(screen.getByText("Top channels")).toBeInTheDocument();
  expect(screen.getByText("Top products")).toBeInTheDocument();

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(CHANNELS.length + PRODUCTS.length);
});

test("lists channels in revenue-descending rank order", () => {
  render(<Rankings channels={CHANNELS} products={[]} />);

  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(3);

  expect(within(rows[0]).getByText("1")).toBeInTheDocument();
  expect(within(rows[0]).getByText("direct")).toBeInTheDocument();
  expect(within(rows[0]).getByText("449.00")).toBeInTheDocument();
  expect(within(rows[0]).getByText("120 orders · 44.4% share")).toBeInTheDocument();

  expect(within(rows[1]).getByText("2")).toBeInTheDocument();
  expect(within(rows[1]).getByText("referral")).toBeInTheDocument();
  expect(within(rows[1]).getByText("258.00")).toBeInTheDocument();
});

test("lists products in revenue-descending rank order", () => {
  render(<Rankings channels={[]} products={PRODUCTS} />);

  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(3);

  expect(within(rows[0]).getByText("1")).toBeInTheDocument();
  expect(within(rows[0]).getByText("Starter Pack")).toBeInTheDocument();
  expect(within(rows[0]).getByText("449.00")).toBeInTheDocument();
  expect(within(rows[0]).getByText("2 units · 2 orders")).toBeInTheDocument();

  expect(within(rows[1]).getByText("2")).toBeInTheDocument();
  expect(within(rows[1]).getByText("Pro Seat")).toBeInTheDocument();
  expect(within(rows[1]).getByText("258.00")).toBeInTheDocument();
});

test("highlights the hovered channel row and clears on mouse out", () => {
  render(<Rankings channels={CHANNELS} products={PRODUCTS} />);

  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).not.toHaveClass("pulse-ranking-item--highlight");

  fireEvent.mouseOver(rows[0]);
  expect(rows[0]).toHaveClass("pulse-ranking-item--highlight");

  fireEvent.mouseOut(rows[0]);
  expect(rows[0]).not.toHaveClass("pulse-ranking-item--highlight");
});

test("highlights product rows independently of channel rows", () => {
  render(<Rankings channels={CHANNELS} products={PRODUCTS} />);

  const rows = screen.getAllByRole("listitem");
  const productRow = rows[CHANNELS.length + 1];

  fireEvent.mouseOver(productRow);
  expect(productRow).toHaveClass("pulse-ranking-item--highlight");
  expect(rows[0]).not.toHaveClass("pulse-ranking-item--highlight");

  fireEvent.mouseOut(productRow);
  expect(productRow).not.toHaveClass("pulse-ranking-item--highlight");
});

test("renders empty rankings without crashing", () => {
  render(<Rankings channels={[]} products={[]} />);

  expect(screen.getByRole("region", { name: /rankings/i })).toBeInTheDocument();
  expect(screen.getByText("Top channels")).toBeInTheDocument();
  expect(screen.getByText("Top products")).toBeInTheDocument();
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
});
