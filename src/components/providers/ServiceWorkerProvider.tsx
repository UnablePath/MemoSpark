"use client";

import { useEffect } from "react";

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(
      (err: unknown) => {
        console.error("[push:service-worker-register]", err);
      },
    );
  }, []);

  return null;
}
