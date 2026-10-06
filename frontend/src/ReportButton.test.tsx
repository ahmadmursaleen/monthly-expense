import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as api from "./api";
import ReportButton, { REPORT_ERROR_MESSAGE } from "./ReportButton";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, downloadReport: vi.fn() };
});
const downloadReport = vi.mocked(api.downloadReport);

let clicked: HTMLAnchorElement[];

beforeEach(() => {
  clicked = [];
  URL.createObjectURL = vi.fn(() => "blob:report");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(this);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  downloadReport.mockReset();
});

it("downloads the month's PDF as expenses-YYYY-MM.pdf via an object URL", async () => {
  const blob = new Blob(["%PDF"], { type: "application/pdf" });
  downloadReport.mockResolvedValue({ blob, filename: "other.pdf" });
  const onError = vi.fn();
  render(<ReportButton month="2026-10" onError={onError} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

  await waitFor(() => expect(clicked).toHaveLength(1));
  expect(downloadReport).toHaveBeenCalledWith("2026-10");
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  expect(clicked[0].download).toBe("expenses-2026-10.pdf");
  expect(clicked[0].href).toBe("blob:report");
  expect(clicked[0].isConnected).toBe(false);
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report"));
  expect(onError).not.toHaveBeenCalled();
});

it("shows Generating… and is disabled while busy", async () => {
  let resolve!: (v: { blob: Blob; filename: string }) => void;
  downloadReport.mockReturnValue(new Promise((r) => (resolve = r)));
  render(<ReportButton month="2026-10" onError={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
  const busy = await screen.findByRole("button", { name: "Generating…" });
  expect(busy).toBeDisabled();

  resolve({ blob: new Blob(["%PDF"]), filename: "expenses-2026-10.pdf" });
  expect(await screen.findByRole("button", { name: "Download PDF" })).toBeEnabled();
});

it("names the file after the month it was given", async () => {
  downloadReport.mockResolvedValue({ blob: new Blob(["%PDF"]), filename: "expenses-2025-01.pdf" });
  render(<ReportButton month="2025-01" onError={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

  await waitFor(() => expect(clicked).toHaveLength(1));
  expect(downloadReport).toHaveBeenCalledWith("2025-01");
  expect(clicked[0].download).toBe("expenses-2025-01.pdf");
});

it("does not start a second download while one is in progress", async () => {
  let resolve!: (v: { blob: Blob; filename: string }) => void;
  downloadReport.mockReturnValue(new Promise((r) => (resolve = r)));
  render(<ReportButton month="2026-10" onError={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
  const busy = await screen.findByRole("button", { name: "Generating…" });
  fireEvent.click(busy);
  expect(downloadReport).toHaveBeenCalledTimes(1);

  resolve({ blob: new Blob(["%PDF"]), filename: "expenses-2026-10.pdf" });
  await waitFor(() => expect(clicked).toHaveLength(1));
});

it("reports a non-API failure (e.g. network TypeError) through onError exactly once", async () => {
  downloadReport.mockRejectedValue(new TypeError("Failed to fetch"));
  const onError = vi.fn();
  render(<ReportButton month="2026-10" onError={onError} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

  await waitFor(() => expect(onError).toHaveBeenCalledWith("Couldn't generate the PDF report. Try again."));
  expect(onError).toHaveBeenCalledTimes(1);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it("can retry after a failure and then downloads", async () => {
  downloadReport.mockRejectedValueOnce(new api.ApiError(500, "boom"));
  downloadReport.mockResolvedValueOnce({ blob: new Blob(["%PDF"]), filename: "expenses-2026-10.pdf" });
  const onError = vi.fn();
  render(<ReportButton month="2026-10" onError={onError} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

  fireEvent.click(await screen.findByRole("button", { name: "Download PDF" }));
  await waitFor(() => expect(clicked).toHaveLength(1));
  expect(clicked[0].download).toBe("expenses-2026-10.pdf");
  expect(onError).toHaveBeenCalledTimes(1);
});

it("calls onError and resets the button when the download fails", async () => {
  downloadReport.mockRejectedValue(new api.ApiError(500, "boom"));
  const onError = vi.fn();
  render(<ReportButton month="2026-10" onError={onError} />);

  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

  await waitFor(() => expect(onError).toHaveBeenCalledWith(REPORT_ERROR_MESSAGE));
  expect(REPORT_ERROR_MESSAGE).toBe("Couldn't generate the PDF report. Try again.");
  expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  expect(clicked).toHaveLength(0);
});
