import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatMoney } from "../lib/analytics";
import { type DemoOrder } from "../lib/demo-data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function OrderDetail({
  order,
  open,
  onOpenChange,
}: {
  order: DemoOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    setSmall(mq.matches);
    const onChange = () => setSmall(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={small ? "bottom" : "right"}
    >
      <DrawerOverlay />
      <DrawerContent className="pulse-detail-panel">
        <DrawerClose aria-label="Close" />
        <DrawerHeader>
          <DrawerTitle>Order {order.id}</DrawerTitle>
          <DrawerDescription>{formatDate(order.date)}</DrawerDescription>
        </DrawerHeader>
        <table className="pulse-detail-table" aria-label="Order details">
          <tbody>
            <tr>
              <th>Order</th>
              <td>{order.id}</td>
            </tr>
            <tr>
              <th>Customer</th>
              <td>{order.customer}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{order.email}</td>
            </tr>
            <tr>
              <th>Channel</th>
              <td>{capitalize(order.channel)}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>{capitalize(order.status)}</td>
            </tr>
            <tr>
              <th>Amount</th>
              <td>{formatMoney(order.amount)}</td>
            </tr>
          </tbody>
        </table>
        <section aria-label="Items">
          <h2 className="pulse-detail-heading">Items</h2>
          <table className="pulse-detail-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Unit price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.sku}>
                  <td>{item.product}</td>
                  <td>{item.sku}</td>
                  <td>{item.qty}</td>
                  <td>RM {formatMoney(item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </DrawerContent>
    </Drawer>
  );
}
