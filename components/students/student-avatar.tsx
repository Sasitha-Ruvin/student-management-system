"use client";

import { useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { studentPhotoSrc } from "@/lib/students/student-photo-url";

type StudentAvatarProps = {
  studentId: string;
  fullName: string;
  photoUrl: string | null;
  size?: "sm" | "md" | "lg";
  showSpinner?: boolean;
};

const sizeClass = {
  sm: "size-10 text-xs",
  md: "size-14 text-lg",
  lg: "size-24 text-2xl",
} as const;

export function StudentAvatar({
  studentId,
  fullName,
  photoUrl,
  size = "md",
  showSpinner = false,
}: StudentAvatarProps) {
  const [broken, setBroken] = useState(false);
  const src = studentPhotoSrc(studentId, photoUrl);
  const dim = sizeClass[size];

  if (showSpinner) {
    return (
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-secondary-200`}
        aria-busy="true"
        aria-label={`Opening ${fullName}`}
      >
        <Spinner className="size-5 text-primary-900" />
      </span>
    );
  }

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-secondary-200 font-medium text-neutral-600`}
    >
      {fullName.charAt(0)}
    </span>
  );
}
