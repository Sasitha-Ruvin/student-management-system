"use client";

import { motion } from "framer-motion";

import { easeOut } from "@/components/login/animations";

export function LoginHero() {
  return (
    <motion.div
      className="relative hidden min-h-screen lg:block"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: easeOut }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.95),_rgba(30,41,59,0.82))]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0))]" />

      <div className="relative flex h-full items-center justify-center p-10 lg:p-16">
        <div className="w-full max-w-xl rounded-[32px] border border-white/20 bg-white/10 p-8 text-white shadow-[0_30px_80px_rgba(2,6,23,0.34)] backdrop-blur-xl sm:p-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-semibold">
            SMS
          </div>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Open Source Student Management System
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200 sm:text-base">
            A flexible admin workspace for student records, enrollments, attendance,
            and daily school operations.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-slate-950/30 p-4">
              <p className="text-sm font-medium">Students</p>
              <p className="mt-1 text-sm text-slate-300">Manage profiles and enrollments</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-950/30 p-4">
              <p className="text-sm font-medium">Attendance</p>
              <p className="mt-1 text-sm text-slate-300">Track class participation</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
