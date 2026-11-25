import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { ChannelFilter } from "./channel-filter";

test("lists All channels and every demo channel", () => {
  render(<ChannelFilter channel="all" onChange={() => {}} />);

  expect(screen.getByRole("option", { name: /all channels/i })).toBeInTheDocument();
  for (const channel of ["direct", "referral", "social", "email", "ads"]) {
    expect(screen.getByRole("option", { name: new RegExp(channel, "i") })).toBeInTheDocument();
  }
});

test("calls onChange with the selected channel", () => {
  const onChange = vi.fn();
  render(<ChannelFilter channel="all" onChange={onChange} />);

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "email" } });
  expect(onChange).toHaveBeenCalledWith("email");
});
