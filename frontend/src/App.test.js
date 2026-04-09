import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the role-based login interface", () => {
  render(<App />);
  expect(screen.getByText(/Student Login/i)).toBeInTheDocument();
});
