"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  stepKey,
  onBack,
}: {
  children: ReactNode;
  stepKey: string;
  onBack?: () => void;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-canvas px-6 py-16">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="absolute left-6 top-8 text-2xl font-semibold leading-none text-text-primary"
        >
          ‹
        </button>
      )}
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm font-medium text-text-primary/55">{subtitle}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-md bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
      {message}
    </p>
  );
}
