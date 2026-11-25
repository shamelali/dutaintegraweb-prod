import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { SearchFilter } from "./search-filter";

test("renders a searchbox", () => {
  render(<SearchFilter value="" onChange={() => {}} />);

  expect(screen.getByRole("searchbox")).toBeInTheDocument();
});

test("calls onChange with the current value", () => {
  const onChange = vi.fn();
  render(<SearchFilter value="" onChange={onChange} />);

  fireEvent.input(screen.getByRole("searchbox"), { target: { value: "eva" } });
  expect(onChange).toHaveBeenCalledWith("eva");
});
