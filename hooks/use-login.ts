"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { loginWithCredentials } from "@/lib/auth/login";

export function useLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await loginWithCredentials({ email, password });

      if (!result.ok) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isSubmitting,
    handleSubmit,
  };
}
