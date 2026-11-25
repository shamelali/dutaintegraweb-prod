import { useState } from "react";
import { formatMoney, paginate } from "../lib/analytics";
import { type DemoOrder } from "../lib/demo-data";

export function OrdersTable({
  orders,
  page: initialPage = 1,
  pageSize = 10,
  selectedOrderId,
  onPageChange,
  onSelect,
}: {
  orders: readonly DemoOrder[];
  page?: number;
  pageSize: number;
  selectedOrderId?: string | null;
  onPageChange: (nextPage: number) => void;
  onSelect: (orderId: string) => void;
}) {
  const [page, setPage] = useState(initialPage);

  const sorted = [...orders].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id),
  );

  const paged = paginate(sorted, page, pageSize);

  return (
    <section className="pulse-panel pulse-orders-table" aria-label="Orders" data-testid="orders-panel">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((order) => (
            <tr
              key={order.id}
              onClick={() => onSelect(order.id)}
              className="pulse-order-row"
              aria-current={selectedOrderId === order.id ? "true" : undefined}
            >
              <td>{order.id}</td>
              <td>{order.date}</td>
              <td>{order.customer}</td>
              <td>{order.channel}</td>
              <td>{order.status}</td>
              <td>{formatMoney(order.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pulse-pagination">
        <button disabled={page === 1} onClick={() => goTo(page - 1)}>
          Previous
        </button>
        <span>Page {page} of {paged.totalPages}</span>
        <button disabled={page === paged.totalPages} onClick={() => goTo(page + 1)}>
          Next
        </button>
      </div>
    </section>
  );

  function goTo(nextPage: number) {
    setPage(nextPage);
    onPageChange(nextPage);
  }
}
