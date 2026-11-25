import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect } from "vitest";
import { ProductBar } from "./product-bar";
import type { ProductAggregate } from "../../../lib/analytics";

const PRODUCTS: ProductAggregate[] = [
  { product: "Starter Pack", sku: "SP-001", revenue: 44900, units: 2, orders: 2 },
  { product: "Pro Seat", sku: "PS-002", revenue: 25800, units: 3, orders: 1 },
  { product: "Add-on", sku: "AO-003", revenue: 7900, units: 1, orders: 1 },
];

test("renders an accessible product ranking with one bar per product", () => {
  render(<ProductBar products={PRODUCTS} />);
  const svg = screen.getByRole("img", { name: /product ranking/i });
  expect(svg.querySelector("title")?.textContent).toBe("Product ranking by revenue");
  expect(svg.querySelectorAll("rect")).toHaveLength(PRODUCTS.length);
});

test("y-axis lists every product name and value labels show money", () => {
  render(<ProductBar products={PRODUCTS} />);
  expect(screen.getByText("Starter Pack")).toBeInTheDocument();
  expect(screen.getByText("Pro Seat")).toBeInTheDocument();
  expect(screen.getByText("Add-on")).toBeInTheDocument();
  expect(screen.getByText("449.00")).toBeInTheDocument();
  expect(screen.getByText("258.00")).toBeInTheDocument();
  expect(screen.getByText("79.00")).toBeInTheDocument();
});

test("hover shows product revenue and order count, removed on mouse out", () => {
  render(<ProductBar products={PRODUCTS} />);
  const bars = screen.getByRole("img", { name: /product ranking/i }).querySelectorAll("rect");
  fireEvent.mouseOver(bars[0]);
  expect(screen.getByText("Starter Pack · 449.00 · 2 orders")).toBeInTheDocument();
  fireEvent.mouseOut(bars[0]);
  expect(screen.queryByText("Starter Pack · 449.00 · 2 orders")).not.toBeInTheDocument();
});
