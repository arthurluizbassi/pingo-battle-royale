"use client";

import { useEffect, useRef } from "react";

/** On narrow screens the details panel sits below the list: bring it into view when `key` changes. */
export function useScrollIntoViewOnMobile<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (key && window.innerWidth < 1024) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [key]);
  return ref;
}
