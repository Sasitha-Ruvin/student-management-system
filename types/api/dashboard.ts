export type DashboardMonthlyCollection = {
  month: string;
  label: string;
  amount: number;
};

export type DashboardFinance = {
  currency: string;
  collectedThisMonth: number;
  stillOwed: number;
  overdueCount: number;
  collectionRatePercent: number | null;
  totalCollected: number;
  monthlyCollections: DashboardMonthlyCollection[];
};

export type DashboardStats = {
  totalStudents: number;
  activeBatches: number;
  sessionsThisWeek: number;
  unassignedStudents: number;
  /** Unassigned enrollments where student.source = WEBSITE */
  websitePendingApplications: number;
  finance: DashboardFinance;
};
