import { render, screen } from "@testing-library/react";
import * as api from "./api";
import App from "./App";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    getCategories: vi.fn(() => Promise.resolve([])),
    listTransactions: vi.fn(() => Promise.resolve([])),
    getSummary: vi.fn((month: string) => Promise.resolve({ month, totalCents: 0, count: 0, byCategory: [] })),
  };
});

it("renders the dashboard for the current month", async () => {
  window.history.replaceState(null, "", "/");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^[A-Z][a-z]+ \d{4}$/);
  expect(await screen.findByText(/^No expenses in /)).toBeInTheDocument();
  expect(api.listTransactions).toHaveBeenCalledTimes(1);
});
