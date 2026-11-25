import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect } from "vitest";
import { ChannelDonut } from "./channel-donut";
import type { ChannelAggregate } from "../../../lib/analytics";

const CHANNELS: ChannelAggregate[] = [
  { channel: "direct", revenue: 10000, orders: 4, share: 57.1 },
  { channel: "referral", revenue: 5000, orders: 2, share: 28.6 },
  { channel: "social", revenue: 2500, orders: 1, share: 14.3 },
];

test("renders an accessible channel donut with one segment per channel", () => {
  render(<ChannelDonut channels={CHANNELS} />);
  const svg = screen.getByRole("img", { name: /channel distribution/i });
  expect(svg.querySelector("title")?.textContent).toBe("Channel distribution by revenue");
  const paths = svg.querySelectorAll("path");
  expect(paths).toHaveLength(CHANNELS.length);
});

test("legend lists every channel name", () => {
  render(<ChannelDonut channels={CHANNELS} />);
  expect(screen.getByText(/direct/i)).toBeInTheDocument();
  expect(screen.getByText(/referral/i)).toBeInTheDocument();
  expect(screen.getByText(/social/i)).toBeInTheDocument();
});

test("hover shows channel revenue and share, removed on mouse out", () => {
  render(<ChannelDonut channels={CHANNELS} />);
  const paths = screen.getByRole("img", { name: /channel distribution/i }).querySelectorAll("path");
  fireEvent.mouseOver(paths[0]);
  expect(screen.getByText("direct · 100.00 · 57.1%")).toBeInTheDocument();
  fireEvent.mouseOut(paths[0]);
  expect(screen.queryByText("direct · 100.00 · 57.1%")).not.toBeInTheDocument();
});
