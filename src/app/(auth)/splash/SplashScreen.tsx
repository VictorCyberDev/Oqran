"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const WORDMARK = "OQRAN";

export function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-canvas px-10 text-center">
      <motion.svg
        width={86}
        height={86}
        viewBox="0 0 86 86"
        fill="none"
        initial="hidden"
        animate="visible"
      >
        {/* Compass ring settles in with a slight overshoot, then the mark
            draws itself — "forming," not a fade. */}
        <motion.circle
          cx={43}
          cy={43}
          r={40}
          stroke="var(--color-brand)"
          strokeWidth={2}
          initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 210, damping: 14, delay: 0.05 }}
          style={{ transformOrigin: "43px 43px" }}
        />
        <motion.path
          d="M43 16 L20 34 M43 16 L66 34"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.42, ease: "easeOut" }}
        />
        <motion.rect
          x={27}
          y={30}
          width={32}
          height={32}
          rx={10}
          stroke="var(--color-brand)"
          strokeWidth={2.4}
          initial={{ pathLength: 0, opacity: 0, scale: 0.9 }}
          animate={{ pathLength: 1, opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
          style={{ transformOrigin: "43px 46px" }}
        />
        <motion.circle
          cx={43}
          cy={46}
          r={7}
          stroke="var(--color-brand)"
          strokeWidth={2.4}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.68 }}
          style={{ transformOrigin: "43px 46px" }}
        />
        <motion.path
          d="M48 51 L54 57"
          stroke="var(--color-brand)"
          strokeWidth={2.4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.82, ease: "easeOut" }}
        />
      </motion.svg>

      <div>
        <div className="flex justify-center" aria-label={WORDMARK}>
          {WORDMARK.split("").map((letter, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="text-5xl font-extrabold tracking-[0.12em] text-brand"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.95 + i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
        <motion.p
          className="mt-2 text-sm font-medium leading-relaxed text-text-primary/60"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.35, ease: "easeOut" }}
        >
          Verify. Assess. Protect.
          <br />
          Nigeria&rsquo;s spatial risk-intelligence platform.
        </motion.p>
      </div>

      <motion.div
        className="flex w-full max-w-xs flex-col gap-2.5 pt-2"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, delay: 1.6, ease: "easeOut" }}
      >
        <Link
          href="/sign-in"
          className="rounded-lg bg-brand px-9 py-4 text-md font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Sign In
        </Link>
        <Link
          href="/create-account"
          className="rounded-lg border border-brand px-9 py-4 text-md font-semibold text-brand transition-colors hover:bg-brand/5"
        >
          Create Account
        </Link>
      </motion.div>
    </div>
  );
}
