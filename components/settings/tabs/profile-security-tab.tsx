"use client";

import { FormEvent, useEffect, useState } from "react";

import { changePassword } from "@/lib/api/settings";
import { adminFetch } from "@/lib/api/admin-fetch";
import { Eye, EyeOff, Lock, User } from "@/lib/icons";

type AdminProfile = {
  id: string;
  email: string;
  name: string;
};

export function ProfileSecurityTab() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    adminFetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { admin?: AdminProfile; error?: string }) => {
        if (data.admin) setAdmin(data.admin);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update password");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-secondary-400 bg-tertiary-100 py-2.5 pr-10 pl-10 text-sm outline-none focus:border-primary-900";

  return (
    <div className="space-y-8">
      {admin ? (
        <div className="flex items-center gap-4 rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary-300">
            <User className="size-5 text-primary-900" />
          </div>
          <div>
            <p className="font-medium text-primary-900">{admin.name}</p>
            <p className="text-sm text-neutral-600">{admin.email}</p>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-4 font-headline text-lg text-primary-900">
          Change Password
        </h3>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <label className="relative block">
            <span className="mb-1.5 block text-sm text-neutral-700">
              Current password
            </span>
            <Lock className="pointer-events-none absolute top-[38px] left-3 size-4 text-neutral-500" />
            <input
              required
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute top-[38px] right-3 text-neutral-500"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </label>
          <label className="relative block">
            <span className="mb-1.5 block text-sm text-neutral-700">
              New password
            </span>
            <Lock className="pointer-events-none absolute top-[38px] left-3 size-4 text-neutral-500" />
            <input
              required
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute top-[38px] right-3 text-neutral-500"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-700">Confirm new password</span>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm outline-none focus:border-primary-900"
              autoComplete="new-password"
            />
          </label>
          {message ? (
            <p
              className={
                isError ? "text-sm text-destructive" : "text-sm text-neutral-700"
              }
            >
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary-900 px-6 py-2.5 text-sm font-medium text-tertiary-100 disabled:opacity-60"
          >
            {isSubmitting ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
