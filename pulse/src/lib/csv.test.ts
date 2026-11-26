import { test, expect } from "vitest";
import { generateCsv } from "./csv";
import { DemoOrder } from "./demo-data";

const order: DemoOrder = {
  id: "demo-0001",
  date: "2026-08-21",
  customer: "Amanda Tan",
  email: "amanda.tan@example.com",
  channel: "direct",
  status: "delivered",
  amount: 7900,
  items: [{ product: "Wireless Mouse", sku: "MS-100", qty: 1, unitPrice: 7900 }],
};

test("emits a header row plus one row per order", () => {
  const csv = generateCsv([order]);
  expect(csv).toBe(
    "Order ID,Date,Customer,Email,Channel,Status,Amount,Items\n" +
      "demo-0001,2026-08-21,Amanda Tan,amanda.tan@example.com,direct,delivered,79.00,Wireless Mouse (MS-100) ×1\n",
  );
});

test("formats amounts as fen-based money", () => {
  const csv = generateCsv([
    { ...order, id: "demo-0002", amount: 12500 },
  ]);
  expect(csv).toContain("demo-0002,2026-08-21,Amanda Tan,amanda.tan@example.com,direct,delivered,125.00,");
});

test("joins multiple items with semicolons", () => {
  const csv = generateCsv([
    {
      ...order,
      id: "demo-0003",
      items: [
        { product: "Wireless Mouse", sku: "MS-100", qty: 2, unitPrice: 7900 },
        { product: "USB-C Cable", sku: "CB-200", qty: 1, unitPrice: 4900 },
      ],
    },
  ]);
  expect(csv).toContain(
    "Wireless Mouse (MS-100) ×2; USB-C Cable (CB-200) ×1",
  );
});

test("quotes fields containing commas and doubles embedded quotes", () => {
  const csv = generateCsv([
    {
      ...order,
      id: "demo-0004",
      customer: 'Tan, "Amanda"',
      email: "amanda@example.com",
    },
  ]);
  expect(csv).toContain('"Tan, ""Amanda"""');
});

test("produces only the header for an empty list", () => {
  expect(generateCsv([])).toBe("Order ID,Date,Customer,Email,Channel,Status,Amount,Items\n");
});
