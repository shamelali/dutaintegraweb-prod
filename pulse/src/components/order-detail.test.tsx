import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { OrderDetail } from "./order-detail";
import { DEMO_ORDERS } from "../lib/demo-data";

const order = DEMO_ORDERS[0];

function setMatchMedia(matches: boolean) {
  const mq = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => mq),
  });
}

function renderDrawer(props = {}) {
  const onOpenChange = vi.fn();
  render(
    <OrderDetail
      order={order}
      open={true}
      onOpenChange={onOpenChange}
      {...props}
    />,
  );
  return onOpenChange;
}

test("renders nothing when the drawer is closed", () => {
  setMatchMedia(false);
  const { container } = render(
    <OrderDetail
      order={order}
      open={false}
      onOpenChange={() => {}}
    />,
  );

  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(screen.queryByText("demo-0001")).toBeNull();
});

test("renders order fields and items when open", () => {
  setMatchMedia(false);
  renderDrawer();

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("demo-0001")).toBeInTheDocument();
  expect(screen.getByText("21 Aug 2026")).toBeInTheDocument();
  expect(screen.getByText("Amanda Tan")).toBeInTheDocument();
  expect(screen.getByText("amanda.tan@example.com")).toBeInTheDocument();
  expect(screen.getByText("Direct")).toBeInTheDocument();
  expect(screen.getByText("Delivered")).toBeInTheDocument();
  expect(screen.getByText("79.00")).toBeInTheDocument();

  expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
  expect(screen.getByText("MS-100")).toBeInTheDocument();
  expect(screen.getByText("1")).toBeInTheDocument();
  expect(screen.getByText("79.00")).toBeInTheDocument();
});

test("calls onOpenChange with false when the close button is clicked", () => {
  setMatchMedia(false);
  const onOpenChange = renderDrawer();

  fireEvent.click(screen.getByRole("button", { name: /close/i }));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("slides from the bottom on small screens", () => {
  setMatchMedia(true);
  renderDrawer();

  expect(screen.getByRole("dialog")).toHaveAttribute(
    "data-vaul-drawer-direction",
    "bottom",
  );
});

test("slides from the side on wide screens", () => {
  setMatchMedia(false);
  renderDrawer();

  expect(screen.getByRole("dialog")).toHaveAttribute(
    "data-vaul-drawer-direction",
    "right",
  );
});
