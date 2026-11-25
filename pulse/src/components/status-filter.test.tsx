import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { StatusFilter } from "./status-filter";

test("lists All statuses and every demo status", () => {
  render(<StatusFilter status="all" onChange={() => {}} />);

  expect(screen.getByRole("option", { name: /all statuses/i })).toBeInTheDocument();
  for (const status of ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"]) {
    expect(screen.getByRole("option", { name: new RegExp(status, "i") })).toBeInTheDocument();
  }
});

test("calls onChange with the selected status", () => {
  const onChange = vi.fn();
  render(<StatusFilter status="all" onChange={onChange} />);

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "delivered" } });
  expect(onChange).toHaveBeenCalledWith("delivered");
});
