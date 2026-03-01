// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toast from "@/components/Toast";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Toast", () => {
  const defaultProps = {
    id: "toast-1",
    message: "New task assigned: Clean room",
    linkUrl: "/my-tasks/task-1",
    type: "TASK_ASSIGNED",
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the message", () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText("New task assigned: Clean room")).toBeInTheDocument();
  });

  it("renders the type label", () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText("New Task")).toBeInTheDocument();
  });

  it("renders correct label for CALENDAR_REMINDER type", () => {
    render(<Toast {...defaultProps} type="CALENDAR_REMINDER" />);
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("renders correct label for SUB_JOINED type", () => {
    render(<Toast {...defaultProps} type="SUB_JOINED" />);
    expect(screen.getByText("New Sub")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", async () => {
    const user = userEvent.setup();
    render(<Toast {...defaultProps} />);
    const dismissBtn = screen.getByLabelText("Dismiss notification");
    await user.click(dismissBtn);
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it("navigates and dismisses when toast body clicked", async () => {
    const user = userEvent.setup();
    render(<Toast {...defaultProps} />);
    const alert = screen.getByRole("alert");
    await user.click(alert);
    expect(mockPush).toHaveBeenCalledWith("/my-tasks/task-1");
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it("dismisses without navigating when linkUrl is null", async () => {
    const user = userEvent.setup();
    render(<Toast {...defaultProps} linkUrl={null} />);
    const alert = screen.getByRole("alert");
    await user.click(alert);
    expect(mockPush).not.toHaveBeenCalled();
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it("auto-dismisses after 5 seconds", () => {
    vi.useFakeTimers();
    render(<Toast {...defaultProps} />);
    expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(defaultProps.onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does not auto-dismiss before 5 seconds", () => {
    vi.useFakeTimers();
    render(<Toast {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("has role=alert for accessibility", () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
