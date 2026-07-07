export const CACHE_TAGS = {
  branches: "branches",
  branch: (id: string) => `branch:${id}`,
  batches: "batches",
  batch: (id: string) => `batch:${id}`,
  students: "students",
  sessions: "sessions",
  alumni: "alumni",
  settings: "settings",
  paymentPlans: "payment-plans",
  dashboard: "dashboard",
} as const;
