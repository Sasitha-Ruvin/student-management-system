// ── Enums ─────────────────────────────────────────────────────────

export type StudentSource = "WEBHOOK" | "WEBSITE" | "MANUAL";

export type StudentEnrollmentStatus =
  | "UNASSIGNED"
  | "ACTIVE"
  | "SUSPENDED"
  | "ON_HOLD"
  | "COMPLETED"
  | "DROPPED";

export type EnrollmentPaymentPath = "INSTALLMENT" | "ONE_TIME";

export type EnrollmentInstallmentSource = "BATCH" | "NAMED_PLAN" | "CUSTOM";

export type CustomInstallmentInput = {
  label: string;
  amount: number;
  dueDate: string;
  order: number;
};

export type PreferredDate =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

// ── List ──────────────────────────────────────────────────────────

export type StudentListItem = {
  id: string;
  modelCode: string;
  fullName: string;
  email: string;
  contactNumber: string;
  whatsappNumber: string;
  nic: string;
  gender: string;
  age: number;
  source: StudentSource;
  photoUrl: string | null;
  preferredBranchId: string | null;
  preferredBranchName: string | null;
  preferredBranchRaw: string | null;
  preferredDate: string | null;
  /** Most recent enrollment status — null if no enrollment exists */
  enrollmentStatus: StudentEnrollmentStatus | null;
  /** Batch name for the current active enrollment, if any */
  currentBatchName: string | null;
  currentBatchCode: string | null;
  /** Primary enrollment for list actions (suspend, etc.) */
  primaryEnrollmentId: string | null;
  primaryBatchId: string | null;
  regFeePaid: boolean | null;
  hasPortalAccount: boolean;
  isLoginEnabled: boolean;
  createdAt: string;
};

export type StudentListPage = {
  items: StudentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Enrollment row embedded in detail ────────────────────────────

export type StudentEnrollmentRow = {
  enrollmentId: string;
  batchId: string | null;
  batchCode: string | null;
  batchName: string | null;
  branchName: string | null;
  status: StudentEnrollmentStatus;
  paymentPath: EnrollmentPaymentPath | null;
  installmentSource: EnrollmentInstallmentSource | null;
  paymentPlanId: string | null;
  paymentPlanName: string | null;
  customCourseFee: number | null;
  regFeePaid: boolean;
  registrationFee: number | null;
  notes: string | null;
  totalPaid: number;
  totalOwed: number;
  createdAt: string;
};

// ── Detail ────────────────────────────────────────────────────────

/** Decrypted detail for admin UI (server-rendered / server actions). */
export type StudentDocumentItem = {
  id: string;
  type: "NIC_FRONT" | "NIC_BACK" | "PROFESSIONAL_PHOTO";
  mimeType: string;
  sortOrder: number;
  url: string;
  createdAt: string;
};

export type StudentDetail = StudentListItem & {
  dob: string;
  contactNumber: string;
  whatsappNumber: string;
  address: string;
  height: number | null;
  weight: number | null;
  chest: number | null;
  shoulder: number | null;
  waist: number | null;
  shoeSize: string | null;
  skinColorOptionId: string | null;
  skinColorLabel: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  talents: string | null;
  modelingInterests: string[];
  modelingInterestIds: string[];
  documents: StudentDocumentItem[];
  isLoginEnabled: boolean;
  loginDisabledNote: string | null;
  hasPortalAccount: boolean;
  enrollments: StudentEnrollmentRow[];
  updatedAt: string;
};

/** GET /api/students/[id] — sensitive fields stay encrypted at rest in JSON. */
export type StudentDetailApiResponse = Omit<
  StudentListItem,
  "contactNumber" | "whatsappNumber" | "nic"
> & {
  nicEnc: string;
  nicHash: string;
  dobEnc: string;
  addressEnc: string;
  contactNumberEnc: string;
  whatsappNumberEnc: string;
  heightEnc: string | null;
  weightEnc: string | null;
  chestEnc: string | null;
  shoulderEnc: string | null;
  waistEnc: string | null;
  shoeSizeEnc: string | null;
  skinColorOptionId: string | null;
  eyeColorEnc: string | null;
  hairColorEnc: string | null;
  talentsEnc: string | null;
  isLoginEnabled: boolean;
  loginDisabledNote: string | null;
  hasPortalAccount: boolean;
  modelingInterests: string[];
  documents: StudentDocumentItem[];
  enrollments: StudentEnrollmentRow[];
  updatedAt: string;
};

// ── Request bodies ────────────────────────────────────────────────

/**
 * Manual registration — received as multipart/form-data.
 * Photo comes as a separate `photo` File field.
 */
export type ManualRegistrationBody = {
  fullName: string;
  email: string;
  nic: string;
  dob: string;         // ISO date string e.g. "1998-04-15"
  age: number;
  gender: string;
  contactNumber: string;
  whatsappNumber: string;
  address: string;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  shoulder?: number | null;
  waist?: number | null;
  shoeSize?: string | null;
  skinColorOptionId?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
  talents?: string | null;
  modelingInterestIds?: string[];
  preferredBranchId?: string | null;
  preferredDate?: string | null;
};

/**
 * Webhook payload from the external registration website.
 * modelCode is required (assigned by their system).
 * photoUrl is an external URL.
 */
export type WebhookStudentPayload = {
  modelCode: string;
  fullName: string;
  email: string;
  nic: string;
  dob: string;
  age: number;
  gender: string;
  contactNumber: string;
  whatsappNumber: string;
  address: string;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  shoulder?: number | null;
  waist?: number | null;
  shoeSize?: string | null;
  skinColor?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
  talents?: string | null;
  modelingInterests?: string[];
  preferredBranch?: string | null;
  preferredDate?: string | null;
  photoUrl?: string | null;
  nicFrontUrl?: string | null;
  nicBackUrl?: string | null;
  professionalPhotoUrls?: string[];
};

export type AssignBatchBody = {
  batchId: string;
  /** Required when approving a website applicant with a temporary WEBSITE-* code. */
  modelCode?: string;
  paymentPath: EnrollmentPaymentPath;
  installmentSource?: EnrollmentInstallmentSource;
  paymentPlanId?: string | null;
  customInstallments?: CustomInstallmentInput[];
  customCourseFee?: number | null;
  regFeePaid?: boolean;
  notes?: string | null;
};

/** Same shape as assign — creates a new enrollment row (re-enroll / add batch). */
export type EnrollBatchBody = AssignBatchBody;

export type CreatePortalAccountBody = {
  temporaryPassword: string;
  /** Default true — sends login email to the student */
  sendEmail?: boolean;
  /** When true, sends login email and password via Text.lk SMS */
  sendSms?: boolean;
};

export type SetPortalPasswordBody = {
  newPassword: string;
  /** Default true — emails the new password to the student */
  sendEmail?: boolean;
};

export type PortalAccountActionResult = {
  message: string;
  email: string;
  password?: string;
  emailSent: boolean;
  emailWarning?: string;
  smsSent?: boolean;
  smsWarning?: string;
};

export type DisablePortalAccountBody = {
  note?: string | null;
};

export type UpdateEnrollmentPatch = {
  enrollmentId: string;
  notes?: string | null;
  customCourseFee?: number | null;
  regFeePaid?: boolean;
  recalculateOpenInstallments?: boolean;
};

export type UpdateStudentBody = {
  fullName: string;
  email: string;
  nic: string;
  dob: string;
  age: number;
  gender: string;
  contactNumber: string;
  whatsappNumber: string;
  address: string;
  height?: number | null;
  weight?: number | null;
  preferredBranchId?: string | null;
  preferredDate?: string | null;
  chest?: number | null;
  shoulder?: number | null;
  waist?: number | null;
  shoeSize?: string | null;
  skinColorOptionId?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
  talents?: string | null;
  modelingInterestIds?: string[];
  enrollments?: UpdateEnrollmentPatch[];
};

export type UpdateStudentResult = {
  detail: StudentDetail;
  warnings?: string[];
};

// ── Query params for list endpoint ───────────────────────────────

export type StudentListTab = "enrolled" | "pending" | "all";

export type StudentListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  /** Primary list segmentation — enrolled vs pending vs all. */
  listTab?: StudentListTab;
  enrollmentStatus?: StudentEnrollmentStatus | "all";
  branchId?: string;
  source?: StudentSource | "all";
};
