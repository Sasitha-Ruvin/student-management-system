"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { fadeIn, stagger } from "@/components/login/animations";
import { LoginField } from "@/components/login/login-field";
import { Spinner } from "@/components/ui/spinner";
import { useLogin } from "@/hooks/use-login";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "@/lib/icons";

export function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isSubmitting,
    handleSubmit,
  } = useLogin();

  const [showPassword, setShowPassword] = useState(false);

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeIn}>
        <LoginField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="executive@thewalk.com"
          icon={Mail}
        />
      </motion.div>

      <motion.div variants={fadeIn}>
        <LoginField
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••••••"
          icon={Lock}
          labelAction={
            <button
              type="button"
              className="text-xs text-neutral-500 transition hover:text-primary-900"
            >
              Forgot password?
            </button>
          }
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-primary-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" strokeWidth={1.5} />
              ) : (
                <Eye className="size-4" strokeWidth={1.5} />
              )}
            </button>
          }
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="login-error"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        variants={fadeIn}
        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-900 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Spinner className="size-4 text-white" label="Signing in" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
        {!isSubmitting ? (
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
          >
            <ArrowRight className="size-4" strokeWidth={2} />
          </motion.span>
        ) : null}
      </motion.button>
    </motion.form>
  );
}
