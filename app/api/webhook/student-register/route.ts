/**
 * @deprecated
 * Use the Supabase Edge Function instead:
 *   supabase/functions/student-register/index.ts
 *   POST https://<project-ref>.supabase.co/functions/v1/student-register
 *
 * This Next.js route is kept as a fallback until the edge function is confirmed stable.
 * It remains fully functional — do not remove until the edge function is in production.
 */
import { NextResponse } from "next/server";

import {
  invalidateDashboard,
  invalidateBranches,
  invalidateStudents,
} from "@/lib/api/invalidate-cache";
import { prisma } from "@/lib/prisma";
import {
  resolveModelingInterestOptionIdsByLabels,
  resolveSkinColorOptionIdByLabel,
} from "@/lib/registration/registration-option-queries";
import { validateStudentFields } from "@/lib/students/student-validation";
import { validateNic } from "@/lib/students/nic-validator";
import {
  createStudentAndEnrollment,
  DuplicateStudentError,
} from "@/lib/students/student-registration";
import { encryptWebhookPayload } from "@/lib/audit/webhook-log-sensitive";
import { emailDuplicateWhere, nicDuplicateWhere } from "@/lib/students/student-pii";
import { uploadPhotoFromUrl } from "@/lib/storage/photo";
import { uploadStudentDocumentFromUrl } from "@/lib/storage/student-documents";
import type { WebhookStudentPayload } from "@/types/api/student";

const REQUIRED_FIELDS: (keyof WebhookStudentPayload)[] = [
  "modelCode",
  "fullName",
  "email",
  "nic",
  "dob",
  "age",
  "gender",
  "contactNumber",
  "whatsappNumber",
  "address",
];

async function logWebhook(
  payload: unknown,
  status: "received" | "processed" | "failed",
  error?: string,
  studentId?: string,
) {
  try {
    await prisma.webhookLog.create({
      data: {
        payloadEnc: encryptWebhookPayload(payload),
        payload: payload as object,
        status,
        error: error ?? null,
        studentId: studentId ?? null,
      },
    });
  } catch (e) {
    console.error("[webhook] Failed to write WebhookLog:", e);
  }
}

export async function POST(request: Request) {
  // 1. Verify shared secret
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.WEBHOOK_SECRET;

  let rawBody: unknown = null;

  try {
    rawBody = await request.json();
  } catch {
    await logWebhook({}, "failed", "Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!expectedSecret || secret !== expectedSecret) {
    await logWebhook(rawBody, "failed", "Invalid or missing webhook secret");
    return NextResponse.json(
      { error: "Invalid or missing webhook secret" },
      { status: 401 },
    );
  }

  // Log receipt immediately
  const logEntry = await prisma.webhookLog.create({
    data: {
      payloadEnc: encryptWebhookPayload(rawBody),
      payload: rawBody as object,
      status: "received",
    },
  });

  const payload = rawBody as WebhookStudentPayload;

  // 2. Check required fields
  const missing = REQUIRED_FIELDS.filter(
    (f) => payload[f] === undefined || payload[f] === null || payload[f] === "",
  );

  if (missing.length > 0) {
    await prisma.webhookLog.update({
      where: { id: logEntry.id },
      data: { status: "failed", error: `Missing required fields: ${missing.join(", ")}` },
    });
    return NextResponse.json(
      { error: "Missing required fields", fields: missing },
      { status: 400 },
    );
  }

  // 3. Normalise
  const email = String(payload.email).toLowerCase().trim();
  const nicResult = validateNic(String(payload.nic));
  const nic = nicResult.normalised;

  // 4. Validate fields
  const { errors } = validateStudentFields(
    {
      ...payload,
      email,
      nic,
      modelingInterests: payload.modelingInterests,
      skinColor: payload.skinColor,
      nicFrontUrl: payload.nicFrontUrl,
      nicBackUrl: payload.nicBackUrl,
      professionalPhotoUrls: payload.professionalPhotoUrls,
    },
    { isWebhook: true },
  );

  if (Object.keys(errors).length > 0) {
    await prisma.webhookLog.update({
      where: { id: logEntry.id },
      data: {
        status: "failed",
        error: `Validation errors: ${JSON.stringify(errors)}`,
      },
    });
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  // 5. Duplicate check with detailed error
  const existing = await prisma.student.findFirst({
    where: {
      OR: [
        { modelCode: String(payload.modelCode) },
        emailDuplicateWhere(email),
        nicDuplicateWhere(nic),
      ],
    },
    select: { id: true, modelCode: true, email: true, nicHash: true },
  });

  if (existing) {
    let field: string;
    let message: string;

    if (existing.modelCode === String(payload.modelCode)) {
      field = "modelCode";
      message = `modelCode '${payload.modelCode}' already exists`;
    } else if (existing.email === email) {
      field = "email";
      message = "email already exists";
    } else {
      field = "nic";
      message = "NIC already exists";
    }

    await prisma.webhookLog.update({
      where: { id: logEntry.id },
      data: {
        status: "failed",
        error: message,
        studentId: existing.id,
      },
    });

    return NextResponse.json(
      { error: message, field, existingStudentId: existing.id },
      { status: 409 },
    );
  }

  // 6. Resolve preferred branch by name
  let preferredBranchId: string | null = null;
  let preferredBranchRaw: string | null = null;

  if (payload.preferredBranch) {
    const rawBranchName = String(payload.preferredBranch).trim();
    const branch = await prisma.branch.findFirst({
      where: { name: { equals: rawBranchName, mode: "insensitive" }, isActive: true },
      select: { id: true },
    });

    if (branch) {
      preferredBranchId = branch.id;
    } else {
      preferredBranchId = null;
      preferredBranchRaw = rawBranchName;
    }
  }

  const skinColorOptionId =
    payload.skinColor != null && String(payload.skinColor).trim()
      ? await resolveSkinColorOptionIdByLabel(String(payload.skinColor))
      : null;

  const modelingInterestIds =
    Array.isArray(payload.modelingInterests) && payload.modelingInterests.length > 0
      ? await resolveModelingInterestOptionIdsByLabels(
          payload.modelingInterests.filter((item): item is string => typeof item === "string"),
        )
      : [];

  function webhookOptNum(val: unknown): number | null {
    if (val === undefined || val === null || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  // 7. Upload photo (non-blocking)
  // We need a temporary ID placeholder for the storage path; we'll update after creation
  let photoUrl: string | null = null;
  const tempPhotoUrl = payload.photoUrl ? String(payload.photoUrl) : null;

  // 8. Create student + enrollment
  let studentId: string;
  let modelCode: string;

  try {
    const result = await createStudentAndEnrollment({
      modelCode: String(payload.modelCode),
      source: "WEBHOOK",
      fullName: String(payload.fullName).trim(),
      email,
      nic,
      dob: new Date(String(payload.dob)),
      age: Number(payload.age),
      gender: String(payload.gender),
      contactNumber: String(payload.contactNumber).trim(),
      whatsappNumber: String(payload.whatsappNumber).trim(),
      address: String(payload.address).trim(),
      height: webhookOptNum(payload.height),
      weight: webhookOptNum(payload.weight),
      chest: webhookOptNum(payload.chest),
      shoulder: webhookOptNum(payload.shoulder),
      waist: webhookOptNum(payload.waist),
      shoeSize:
        payload.shoeSize != null && String(payload.shoeSize).trim()
          ? String(payload.shoeSize).trim()
          : null,
      skinColorOptionId,
      eyeColor:
        payload.eyeColor != null && String(payload.eyeColor).trim()
          ? String(payload.eyeColor).trim()
          : null,
      hairColor:
        payload.hairColor != null && String(payload.hairColor).trim()
          ? String(payload.hairColor).trim()
          : null,
      talents:
        payload.talents != null && String(payload.talents).trim()
          ? String(payload.talents).trim()
          : null,
      modelingInterestIds,
      photoUrl: null, // set after upload
      preferredBranchId,
      preferredBranchRaw,
      preferredDate: payload.preferredDate ? String(payload.preferredDate) : null,
    });

    studentId = result.studentId;
    modelCode = result.modelCode;
  } catch (err) {
    if (err instanceof DuplicateStudentError) {
      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: {
          status: "failed",
          error: err.message,
          studentId: err.existingStudentId ?? null,
        },
      });
      return NextResponse.json(
        { error: err.message, field: err.field },
        { status: 409 },
      );
    }

    const errMsg = err instanceof Error ? err.message : "Internal error";
    await prisma.webhookLog.update({
      where: { id: logEntry.id },
      data: { status: "failed", error: errMsg },
    });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  // 9. Upload photo now that we have the real studentId
  if (tempPhotoUrl) {
    photoUrl = await uploadPhotoFromUrl(tempPhotoUrl, studentId);
    if (photoUrl) {
      await prisma.student.update({
        where: { id: studentId },
        data: { photoUrl },
      });
    }
  }

  if (payload.nicFrontUrl?.trim()) {
    const uploaded = await uploadStudentDocumentFromUrl(
      studentId,
      "nic-front",
      String(payload.nicFrontUrl).trim(),
    );
    if (uploaded) {
      await prisma.studentDocument.create({
        data: {
          studentId,
          type: "NIC_FRONT",
          storagePath: uploaded.storagePath,
          mimeType: uploaded.mimeType,
          sortOrder: 0,
        },
      });
    }
  }

  if (payload.nicBackUrl?.trim()) {
    const uploaded = await uploadStudentDocumentFromUrl(
      studentId,
      "nic-back",
      String(payload.nicBackUrl).trim(),
    );
    if (uploaded) {
      await prisma.studentDocument.create({
        data: {
          studentId,
          type: "NIC_BACK",
          storagePath: uploaded.storagePath,
          mimeType: uploaded.mimeType,
          sortOrder: 0,
        },
      });
    }
  }

  const proUrls = Array.isArray(payload.professionalPhotoUrls)
    ? payload.professionalPhotoUrls.filter((u): u is string => typeof u === "string")
    : [];

  let photoSort = 0;
  for (let i = 0; i < proUrls.length; i++) {
    const u = proUrls[i].trim();
    if (!u) continue;
    photoSort++;
    const uploaded = await uploadStudentDocumentFromUrl(
      studentId,
      "professional",
      u,
      photoSort,
    );
    if (uploaded) {
      await prisma.studentDocument.create({
        data: {
          studentId,
          type: "PROFESSIONAL_PHOTO",
          storagePath: uploaded.storagePath,
          mimeType: uploaded.mimeType,
          sortOrder: photoSort,
        },
      });
    }
  }

  // 10. Mark webhook as processed
  await prisma.webhookLog.update({
    where: { id: logEntry.id },
    data: { status: "processed", studentId },
  });

  invalidateStudents();
  invalidateDashboard();
  if (preferredBranchId) {
    invalidateBranches(preferredBranchId);
  }

  return NextResponse.json(
    { data: { studentId, modelCode } },
    { status: 201 },
  );
}
