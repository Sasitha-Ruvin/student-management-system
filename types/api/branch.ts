export type BranchListItem = {
  id: string;
  branchCode: string;
  name: string;
  location: string;
  isActive: boolean;
  activeBatchCount: number;
  activeStudentCount: number;
  createdAt: string;
};

export type BranchListSummary = {
  activeBranchCount: number;
  totalStudents: number;
  activeBatchCount: number;
};

export type BranchListPage = {
  items: BranchListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: BranchListSummary;
};

export type BranchPickerItem = {
  id: string;
  name: string;
  branchCode: string;
};

export type ClassDayItem = {
  id: string;
  dayOfWeek: number;
};

export type BranchStats = {
  totalEnrolled: number;
  feesCollectedThisYear: number;
  nextSessionDate: string | null;
};

export type ActiveBatchSummary = {
  id: string;
  batchCode: string;
  name: string;
  status: string;
  enrollmentCount: number;
};

export type BranchDetail = BranchListItem & {
  classDays: ClassDayItem[];
  stats: BranchStats;
  activeBatches: ActiveBatchSummary[];
  hasScheduledSessions: boolean;
};

export type CreateBranchClassDayInput = {
  dayOfWeek: number;
};

export type CreateBranchBody = {
  name?: string;
  location?: string;
  classDays?: CreateBranchClassDayInput[];
};

export type UpdateBranchBody = {
  name?: string;
  location?: string;
  isActive?: boolean;
};

export type CreateClassDayBody = {
  dayOfWeek?: number;
};

export type AddClassDayResponse = {
  classDay: ClassDayItem;
  hasScheduledSessions: boolean;
};

export type DeleteClassDayResponse = {
  hasScheduledSessions: boolean;
};

/** UI aliases — same shapes as API types */
export type BranchListItemDto = BranchListItem;
export type BranchClassDayDto = ClassDayItem;
export type BranchStatsDto = BranchStats;
export type ActiveBatchDto = ActiveBatchSummary;
export type BranchDetailDto = BranchDetail;
