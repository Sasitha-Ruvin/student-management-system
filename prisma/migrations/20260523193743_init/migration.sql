-- CreateEnum
CREATE TYPE "StudentSource" AS ENUM ('WEBHOOK', 'MANUAL');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'SUSPENDED', 'ON_HOLD', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'ACTIVE', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferSettlementKind" AS ENUM ('CREDIT_NOTE', 'APPLY_TO_NEW', 'REFUND_RECORD', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "EnrollmentPaymentPath" AS ENUM ('INSTALLMENT', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "EnrollmentInstallmentSource" AS ENUM ('BATCH', 'NAMED_PLAN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StudentDocumentType" AS ENUM ('NIC_FRONT', 'NIC_BACK', 'PROFESSIONAL_PHOTO');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_class_days" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_class_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "defaultClassTime" TEXT,
    "defaultClassEndTime" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'OPEN',
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER,
    "registrationFee" DECIMAL(10,2) NOT NULL,
    "courseFee" DECIMAL(10,2) NOT NULL,
    "paymentPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_templates" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "pin" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT,
    "modelCode" TEXT NOT NULL,
    "source" "StudentSource" NOT NULL DEFAULT 'MANUAL',
    "age" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nicEnc" TEXT NOT NULL,
    "nicHash" TEXT NOT NULL,
    "dobEnc" TEXT NOT NULL,
    "addressEnc" TEXT NOT NULL,
    "contactNumberEnc" TEXT NOT NULL,
    "whatsappNumberEnc" TEXT NOT NULL,
    "heightEnc" TEXT,
    "weightEnc" TEXT,
    "chestEnc" TEXT,
    "shoulderEnc" TEXT,
    "waistEnc" TEXT,
    "shoeSizeEnc" TEXT,
    "skinColorOptionId" TEXT,
    "eyeColorEnc" TEXT,
    "hairColorEnc" TEXT,
    "talentsEnc" TEXT,
    "loginDisabledNote" TEXT,
    "preferredBranchRaw" TEXT,
    "preferredDate" TEXT,
    "fcmToken" TEXT,
    "preferredBranchId" TEXT,
    "isLoginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_nic_search_tokens" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,

    CONSTRAINT "student_nic_search_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_name_search_tokens" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,

    CONSTRAINT "student_name_search_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentDocumentType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_skin_color_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_skin_color_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_modeling_interest_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_modeling_interest_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_eye_color_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_eye_color_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_hair_color_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_hair_color_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_modeling_interests" (
    "studentId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "student_modeling_interests_pkey" PRIMARY KEY ("studentId","optionId")
);

-- CreateTable
CREATE TABLE "alumni" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "previousBatchId" TEXT,
    "graduatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "customCourseFee" DECIMAL(10,2),
    "paymentPath" "EnrollmentPaymentPath",
    "installmentSource" "EnrollmentInstallmentSource" NOT NULL DEFAULT 'BATCH',
    "paymentPlanId" TEXT,
    "regFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "regFeeReceiptUrl" TEXT,
    "notesEnc" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_settlements" (
    "id" TEXT NOT NULL,
    "sourceEnrollmentId" TEXT NOT NULL,
    "targetEnrollmentId" TEXT,
    "kind" "TransferSettlementKind" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "appliedAmount" DECIMAL(10,2),
    "notesEnc" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overdueCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overdueChargePaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overdueChargeAppliedAt" TIMESTAMP(3),
    "overdueChargeWaived" BOOLEAN NOT NULL DEFAULT false,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "installmentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "paymentTag" TEXT,
    "referenceEnc" TEXT,
    "notesEnc" TEXT,
    "voidReasonEnc" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "voidReason" TEXT,
    "recordedById" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "pdfUrl" TEXT,
    "pdfContentHash" TEXT,
    "pdfUploadStatus" TEXT DEFAULT 'PENDING',
    "pdfUploadError" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "source" "AttendanceSource" NOT NULL DEFAULT 'STUDENT',
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "payloadEnc" TEXT,
    "payload" JSONB,
    "studentId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "academyName" TEXT NOT NULL DEFAULT 'Walk Model Agency',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Colombo',
    "defaultRegistrationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "defaultCourseFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "invoiceHeader" TEXT,
    "invoiceFooter" TEXT,
    "invoiceTerms" TEXT,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoicePaymentMethodLabel" TEXT,
    "invoiceBankName" TEXT,
    "invoiceBankAccountNumber" TEXT,
    "invoiceBankAccountName" TEXT,
    "invoiceBankBranch" TEXT,
    "overdueChargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "overdueChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 2500,
    "overdueChargeEnabledSince" TIMESTAMP(3),
    "attendanceWindowBeforeMinutes" INTEGER NOT NULL DEFAULT 60,
    "attendanceWindowAfterMinutes" INTEGER NOT NULL DEFAULT 120,
    "attendancePinLength" INTEGER NOT NULL DEFAULT 4,
    "notificationLookaheadDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_student_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "notice" TEXT,
    "body" TEXT NOT NULL,
    "templateId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "smsSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "session_student_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_sms_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registrationFee" DECIMAL(10,2) NOT NULL,
    "courseFee" DECIMAL(10,2) NOT NULL,
    "oneTimeDiscountAmount" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plan_line_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_plan_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_supabaseId_key" ON "admins"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branchCode_key" ON "branches"("branchCode");

-- CreateIndex
CREATE INDEX "branches_isActive_name_idx" ON "branches"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "branch_class_days_branchId_dayOfWeek_key" ON "branch_class_days"("branchId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchCode_key" ON "batches"("batchCode");

-- CreateIndex
CREATE INDEX "batches_branchId_status_idx" ON "batches"("branchId", "status");

-- CreateIndex
CREATE INDEX "batches_paymentPlanId_idx" ON "batches"("paymentPlanId");

-- CreateIndex
CREATE INDEX "installment_templates_batchId_idx" ON "installment_templates"("batchId");

-- CreateIndex
CREATE INDEX "sessions_branchId_status_scheduledAt_idx" ON "sessions"("branchId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "sessions_batchId_sessionNumber_idx" ON "sessions"("batchId", "sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "students_supabaseId_key" ON "students"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "students_modelCode_key" ON "students"("modelCode");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_nicHash_key" ON "students"("nicHash");

-- CreateIndex
CREATE INDEX "students_createdAt_idx" ON "students"("createdAt");

-- CreateIndex
CREATE INDEX "students_preferredBranchId_idx" ON "students"("preferredBranchId");

-- CreateIndex
CREATE INDEX "students_source_idx" ON "students"("source");

-- CreateIndex
CREATE INDEX "students_skinColorOptionId_idx" ON "students"("skinColorOptionId");

-- CreateIndex
CREATE INDEX "student_nic_search_tokens_tokenHash_idx" ON "student_nic_search_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "student_nic_search_tokens_studentId_tokenHash_key" ON "student_nic_search_tokens"("studentId", "tokenHash");

-- CreateIndex
CREATE INDEX "student_name_search_tokens_tokenHash_idx" ON "student_name_search_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "student_name_search_tokens_studentId_tokenHash_key" ON "student_name_search_tokens"("studentId", "tokenHash");

-- CreateIndex
CREATE INDEX "student_documents_studentId_type_idx" ON "student_documents"("studentId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_studentId_key" ON "alumni"("studentId");

-- CreateIndex
CREATE INDEX "alumni_batchId_idx" ON "alumni"("batchId");

-- CreateIndex
CREATE INDEX "alumni_graduatedAt_idx" ON "alumni"("graduatedAt");

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_studentId_status_idx" ON "enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX "enrollments_batchId_status_idx" ON "enrollments"("batchId", "status");

-- CreateIndex
CREATE INDEX "enrollments_paymentPlanId_idx" ON "enrollments"("paymentPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_batchId_key" ON "enrollments"("studentId", "batchId");

-- CreateIndex
CREATE INDEX "transfer_settlements_sourceEnrollmentId_idx" ON "transfer_settlements"("sourceEnrollmentId");

-- CreateIndex
CREATE INDEX "transfer_settlements_targetEnrollmentId_idx" ON "transfer_settlements"("targetEnrollmentId");

-- CreateIndex
CREATE INDEX "installments_enrollmentId_idx" ON "installments"("enrollmentId");

-- CreateIndex
CREATE INDEX "installments_status_dueDate_idx" ON "installments"("status", "dueDate");

-- CreateIndex
CREATE INDEX "installments_enrollmentId_status_idx" ON "installments"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "payments_paymentTag_idx" ON "payments"("paymentTag");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_installmentId_idx" ON "payments"("installmentId");

-- CreateIndex
CREATE INDEX "payments_studentId_paymentDate_idx" ON "payments"("studentId", "paymentDate");

-- CreateIndex
CREATE INDEX "payments_voidedAt_idx" ON "payments"("voidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paymentId_key" ON "invoices"("paymentId");

-- CreateIndex
CREATE INDEX "attendances_studentId_idx" ON "attendances"("studentId");

-- CreateIndex
CREATE INDEX "attendances_sessionId_attendanceStatus_idx" ON "attendances"("sessionId", "attendanceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_studentId_sessionId_key" ON "attendances"("studentId", "sessionId");

-- CreateIndex
CREATE INDEX "session_student_messages_studentId_sentAt_idx" ON "session_student_messages"("studentId", "sentAt" DESC);

-- CreateIndex
CREATE INDEX "session_student_messages_sessionId_idx" ON "session_student_messages"("sessionId");

-- CreateIndex
CREATE INDEX "payment_plan_line_items_planId_idx" ON "payment_plan_line_items"("planId");

-- AddForeignKey
ALTER TABLE "branch_class_days" ADD CONSTRAINT "branch_class_days_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "payment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_templates" ADD CONSTRAINT "installment_templates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_skinColorOptionId_fkey" FOREIGN KEY ("skinColorOptionId") REFERENCES "registration_skin_color_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_preferredBranchId_fkey" FOREIGN KEY ("preferredBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_nic_search_tokens" ADD CONSTRAINT "student_nic_search_tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_name_search_tokens" ADD CONSTRAINT "student_name_search_tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_modeling_interests" ADD CONSTRAINT "student_modeling_interests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_modeling_interests" ADD CONSTRAINT "student_modeling_interests_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "registration_modeling_interest_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_previousBatchId_fkey" FOREIGN KEY ("previousBatchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "payment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_settlements" ADD CONSTRAINT "transfer_settlements_sourceEnrollmentId_fkey" FOREIGN KEY ("sourceEnrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_settlements" ADD CONSTRAINT "transfer_settlements_targetEnrollmentId_fkey" FOREIGN KEY ("targetEnrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_settlements" ADD CONSTRAINT "transfer_settlements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_student_messages" ADD CONSTRAINT "session_student_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_student_messages" ADD CONSTRAINT "session_student_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan_line_items" ADD CONSTRAINT "payment_plan_line_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
