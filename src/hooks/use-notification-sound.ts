"use client";

import { useRef, useCallback } from "react";

export function useNotificationSound(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!enabled) return;

    if (!audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
    }

    // Reset to start so rapid plays don't overlap silently
    audioRef.current.currentTime = 0;
    audioRef.current.playbackRate = 1.5;
    try {
      const result = audioRef.current.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          // Browser may block autoplay until user interaction — ignore
        });
      }
    } catch {
      // Ignore errors (e.g. jsdom not implementing play)
    }
  }, [enabled]);

  return { play };
}
