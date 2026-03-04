"use client";

import { useState, useEffect } from "react";

export function useTagSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/tags/suggestions")
      .then((r) => {
        if (!r.ok) return;
        return r.json();
      })
      .then((data) => {
        if (data?.tags) setSuggestions(data.tags);
      })
      .catch(() => {});
  }, []);

  return suggestions;
}
