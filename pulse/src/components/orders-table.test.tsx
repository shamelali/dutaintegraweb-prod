import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { OrdersTable } from "./orders-table";
import { DEMO_ORDERS } from "../lib/demo-data";

const orders = DEMO_ORDERS.slice(0, 6);

function renderTable(page = 1, pageSize = 10) {
  const onPageChange = vi.fn();
  const onSelect = vi.fn();
  render(
    <OrdersTable
      orders={orders}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onSelect={onSelect}
    />,
  );
  return { onPageChange, onSelect };
}

test("renders orders newest first", () => {
  renderTable();

  const newest = screen.getByText("demo-0006");
  const oldest = screen.getByText("demo-0001");
  expect(newest.compareDocumentPosition(oldest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(0);
  expect(screen.getAllByText("delivered")).toHaveLength(3);
});

test("shows page size rows and paginates", () => {
  const { onPageChange } = renderTable(1, 2);

  expect(screen.getAllByText(/^demo-\d{4}$/).length).toBe(2);

  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  expect(onPageChange).toHaveBeenCalledWith(2);

  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  expect(onPageChange).toHaveBeenCalledWith(3);

  const next = screen.getByRole("button", { name: /next/i });
  expect(next).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: /previous/i }));
  expect(onPageChange).toHaveBeenCalledWith(2);

  fireEvent.click(screen.getByRole("button", { name: /previous/i }));
  expect(onPageChange).toHaveBeenCalledWith(1);
  expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
});

test("calls onSelect with the clicked order id", () => {
  const onSelect = vi.fn();
  render(
    <OrdersTable
      orders={orders}
      page={1}
      pageSize={10}
      onPageChange={() => {}}
      onSelect={onSelect}
    />,
  );

  fireEvent.click(screen.getByText("demo-0006"));
  expect(onSelect).toHaveBeenCalledWith("demo-0006");
});
