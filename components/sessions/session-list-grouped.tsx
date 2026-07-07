"use client";

import { groupSessionsByBatch } from "@/lib/sessions/group-sessions-by-batch";
import type { SessionListItem } from "@/types/api/batch";

import { SessionCard } from "./session-card";
import type { SessionMenuAction } from "./session-action-menu";

type SessionListGroupedProps = {
  items: SessionListItem[];
  navigatingSessionId: string | null;
  onNavigate: (sessionId: string) => void;
  onMenuAction: (session: SessionListItem, action: SessionMenuAction) => void;
};

export function SessionListGrouped({
  items,
  navigatingSessionId,
  onNavigate,
  onMenuAction,
}: SessionListGroupedProps) {
  const batchGroups = groupSessionsByBatch(items);

  if (batchGroups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-secondary-400 px-6 py-16 text-center text-neutral-600">
        No sessions in this view.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {batchGroups.map((batch) => (
        <section key={batch.batchId} className="space-y-5">
          <div className="border-b border-secondary-300/50 pb-2">
            <h2 className="font-headline text-2xl text-primary-900">
              {batch.batchName}
            </h2>
            <p className="font-mono text-sm text-neutral-500">{batch.batchCode}</p>
          </div>

          <div className="space-y-6 pl-0 sm:pl-2">
            {batch.dayGroups.map((day) => (
              <div key={day.dateKey} className="space-y-3">
                <h3 className="text-sm font-medium tracking-wide text-neutral-600 uppercase">
                  {day.label}
                </h3>
                <div className="space-y-3">
                  {day.items.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      compact
                      isNavigating={navigatingSessionId === session.id}
                      onNavigate={() => onNavigate(session.id)}
                      onMenuAction={(action) => onMenuAction(session, action)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
