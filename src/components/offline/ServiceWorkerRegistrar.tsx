"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/offline/sw";

/** Registers the offline shell once, app-wide. Renders nothing. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
