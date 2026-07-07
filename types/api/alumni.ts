export type AlumniListPage = {
  items: AlumniListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AlumniListItem = {
  alumniId: string;
  studentId: string;
  fullName: string;
  modelCode: string;
  nic: string;
  email: string;
  batchId: string;
  batchCode: string;
  batchName: string;
  graduatedIntake: string | null;
  previousBatchId: string | null;
  previousBatchCode: string | null;
  previousBatchName: string | null;
  graduatedAt: string;
  branchName: string;
};

export type AddAlumniExistingBody = {
  mode: "existing";
  studentId: string;
  batchId: string;
  graduatedAt: string;
  notes?: string;
};

export type AddAlumniNewPersonBody = {
  mode: "new";
  fullName: string;
  email: string;
  nic: string;
  branchId: string;
  graduatedAt: string;
  graduatedIntake?: string;
  contactNumber?: string;
  notes?: string;
};

export type AddAlumniBody = AddAlumniExistingBody | AddAlumniNewPersonBody;

export type GraduateBatchBody = {
  graduatedAt: string;
};

export type GraduateBatchResult = {
  batchId: string;
  status: string;
  promotedCount: number;
  alumniIds: string[];
};
