// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotificationSound } from "../use-notification-sound";

const mockPlay = vi.fn().mockResolvedValue(undefined);

let audioInstances: { currentTime: number; play: typeof mockPlay }[];

beforeEach(() => {
  vi.clearAllMocks();
  audioInstances = [];

  vi.stubGlobal(
    "Audio",
    vi.fn().mockImplementation(() => {
      const instance = { currentTime: 0, play: mockPlay };
      audioInstances.push(instance);
      return instance;
    })
  );
});

describe("useNotificationSound", () => {
  it("plays sound when enabled and play is called", () => {
    const { result } = renderHook(() => useNotificationSound(true));

    act(() => {
      result.current.play();
    });

    expect(Audio).toHaveBeenCalledWith("/notification.mp3");
    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it("does not play sound when disabled", () => {
    const { result } = renderHook(() => useNotificationSound(false));

    act(() => {
      result.current.play();
    });

    expect(Audio).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("resets currentTime before playing", () => {
    const { result } = renderHook(() => useNotificationSound(true));

    act(() => {
      result.current.play();
    });

    // Set currentTime to simulate mid-playback
    audioInstances[0].currentTime = 5;

    act(() => {
      result.current.play();
    });

    expect(audioInstances[0].currentTime).toBe(0);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it("reuses the same Audio instance across calls", () => {
    const { result } = renderHook(() => useNotificationSound(true));

    act(() => {
      result.current.play();
    });
    act(() => {
      result.current.play();
    });

    // Audio constructor should only be called once
    expect(Audio).toHaveBeenCalledOnce();
  });

  it("gracefully handles play rejection (autoplay blocked)", () => {
    mockPlay.mockRejectedValueOnce(new Error("Autoplay blocked"));

    const { result } = renderHook(() => useNotificationSound(true));

    // Should not throw
    expect(() => {
      act(() => {
        result.current.play();
      });
    }).not.toThrow();
  });
});
