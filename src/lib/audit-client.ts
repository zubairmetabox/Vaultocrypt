"use client";

export type LiveAuditEvent = {
  action:
    | "CLIENT_UPDATED"
    | "RECORD_CREATED"
    | "RECORD_UPDATED"
    | "RECORD_DELETED"
    | "SECRET_REVEALED"
    | "SECRET_COPIED";
  createdAt?: string;
  actorName?: string;
  actorEmail?: string | null;
  targetLabel?: string | null;
};

const AUDIT_EVENT_NAME = "vaultocrypt:audit";

export function emitLiveAuditEvent(event: LiveAuditEvent) {
  window.dispatchEvent(new CustomEvent<LiveAuditEvent>(AUDIT_EVENT_NAME, { detail: event }));
}

export function subscribeToLiveAuditEvents(listener: (event: LiveAuditEvent) => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<LiveAuditEvent>;
    listener(customEvent.detail);
  };

  window.addEventListener(AUDIT_EVENT_NAME, handler);
  return () => window.removeEventListener(AUDIT_EVENT_NAME, handler);
}
