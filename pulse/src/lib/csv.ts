import { type DemoOrder } from "./demo-data";
import { formatMoney } from "./analytics";

const HEADER = "Order ID,Date,Customer,Email,Channel,Status,Amount,Items";

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatItems(items: readonly { product: string; sku: string; qty: number }[]): string {
  return items.map((item) => `${item.product} (${item.sku}) ×${item.qty}`).join("; ");
}

export function generateCsv(orders: readonly DemoOrder[]): string {
  const lines = [HEADER];
  for (const order of orders) {
    lines.push([
      escapeField(order.id),
      escapeField(order.date),
      escapeField(order.customer),
      escapeField(order.email),
      escapeField(order.channel),
      escapeField(order.status),
      formatMoney(order.amount),
      escapeField(formatItems(order.items)),
    ].join(","));
  }
  return lines.join("\n") + "\n";
}
