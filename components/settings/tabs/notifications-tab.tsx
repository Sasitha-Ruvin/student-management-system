"use client";

import { Bell } from "@/lib/icons";

export function NotificationsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary-200">
        <Bell className="size-6 text-neutral-600" />
      </div>
      <h3 className="font-headline text-xl text-primary-900">Coming soon</h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-600">
        Notification preferences for payment reminders and overdue notices will be
        available in a future update.
      </p>
    </div>
  );
}
