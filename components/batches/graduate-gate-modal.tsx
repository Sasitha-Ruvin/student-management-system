"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SessionStatusConfirmModal } from "@/components/sessions/session-status-confirm-modal";
import { InlineLoader } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { fetchBatchSessions } from "@/lib/api/batches";
import type { BatchSessionRow } from "@/types/api/batch";

type GraduateGateModalProps = {
  open: boolean;
  batchId: string;
  onClose: () => void;
  onContinue: () => void;
  onGoToSessions: () => void;
  onSessionsUpdated: () => void;
};

function formatSessionWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GraduateGateModal({
  open,
  batchId,
  onClose,
  onContinue,
  onGoToSessions,
  onSessionsUpdated,
}: GraduateGateModalProps) {
  const [sessions, setSessions] = useState<BatchSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusSession, setStatusSession] = useState<{
    session: BatchSessionRow;
    action: "cancel" | "complete";
  } | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSessions(await fetchBatchSessions(batchId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load sessions");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (!open) return;
    void loadSessions();
  }, [open, loadSessions]);

  const scheduledSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "SCHEDULED")
        .sort((a, b) => a.sessionNumber - b.sessionNumber),
    [sessions],
  );

  const allCleared = !isLoading && !loadError && scheduledSessions.length === 0;

  async function handleSessionUpdated() {
    await loadSessions();
    onSessionsUpdated();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Sessions must be finished first"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Graduation is blocked while any session is still <strong>Scheduled</strong>.
            Mark each session below as <strong>Completed</strong> or{" "}
            <strong>Cancelled</strong>, then continue to graduate students to alumni.
          </p>

          {isLoading ? <InlineLoader label="Loading sessions…" /> : null}

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}

          {!isLoading && !loadError && allCleared ? (
            <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              All sessions are completed or cancelled. You can continue to graduate
              this batch.
            </p>
          ) : null}

          {!isLoading && !loadError && scheduledSessions.length > 0 ? (
            <div className="max-h-[min(50vh,360px)] overflow-y-auto rounded-xl border border-secondary-300/50">
              <ul className="divide-y divide-secondary-300/40">
                {scheduledSessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-primary-900">
                        Session {session.sessionNumber}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {formatSessionWhen(session.scheduledAt)}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {session.branchName}
                        {session.isRelocated ? (
                          <span className="ml-1.5 rounded bg-secondary-200 px-1.5 text-xs">
                            relocated
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setStatusSession({ session, action: "complete" })
                        }
                        className="min-h-10 rounded-xl border border-primary-900 px-3 py-2 text-sm font-medium text-primary-900"
                      >
                        Mark completed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStatusSession({ session, action: "cancel" })
                        }
                        className="min-h-10 rounded-xl border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-secondary-300/50 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-secondary-300 px-4 py-2.5 text-sm font-medium text-neutral-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToSessions();
              }}
              className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2.5 text-sm font-medium text-neutral-800"
            >
              Go to Sessions tab
            </button>
            <SubmitButton
              type="button"
              disabled={!allCleared}
              onClick={() => {
                onClose();
                onContinue();
              }}
            >
              Continue to graduate
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <SessionStatusConfirmModal
        open={statusSession !== null}
        onClose={() => setStatusSession(null)}
        onSuccess={() => void handleSessionUpdated()}
        batchId={batchId}
        sessionId={statusSession?.session.id ?? ""}
        sessionNumber={statusSession?.session.sessionNumber ?? 0}
        action={statusSession?.action ?? null}
      />
    </>
  );
}
