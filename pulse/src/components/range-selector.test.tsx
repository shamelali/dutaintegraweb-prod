import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { RangeSelector } from "./range-selector";

test("renders 7, 30 and 90 day range pills", () => {
  render(<RangeSelector value="30d" onChange={() => {}} />);

  for (const label of ["7 days", "30 days", "90 days"]) {
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  }
});

test("presses the selected range pill", () => {
  render(<RangeSelector value="30d" onChange={() => {}} />);

  expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("calls onChange with the selected range", () => {
  const onChange = vi.fn();
  render(<RangeSelector value="7d" onChange={onChange} />);

  fireEvent.click(screen.getByRole("button", { name: "90 days" }));
  expect(onChange).toHaveBeenCalledWith("90d");
});
