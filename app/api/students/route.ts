import { NextResponse } from "next/server";

import {
  invalidateDashboard,
  invalidateBranches,
  invalidateStudents,
} from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { ensureRegistrationTextColorOption } from "@/lib/registration/registration-option-mutations";
import { prisma } from "@/lib/prisma";
import { generateModelCode } from "@/lib/students/model-code-generator";
import { validateNic } from "@/lib/students/nic-validator";
import { validateStudentFields } from "@/lib/students/student-validation";
import {
  createStudentAndEnrollment,
  DuplicateStudentError,
} from "@/lib/students/student-registration";
import { fetchStudentDetailApi } from "@/lib/students/student-queries";
import { getCachedStudentListPage } from "@/lib/api/cached-queries";
import { emailDuplicateWhere, nicDuplicateWhere } from "@/lib/students/student-pii";
import { uploadPhotoFromFile } from "@/lib/storage/photo";
import type { StudentListQuery } from "@/types/api/student";

// GET /api/students
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const query: StudentListQuery = {
    page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : 20,
    search: searchParams.get("search") ?? undefined,
    enrollmentStatus:
      (searchParams.get("enrollmentStatus") as StudentListQuery["enrollmentStatus"]) ??
      undefined,
    listTab:
      (searchParams.get("listTab") as StudentListQuery["listTab"]) ?? "enrolled",
    branchId: searchParams.get("branchId") ?? undefined,
    source:
      (searchParams.get("source") as StudentListQuery["source"]) ?? undefined,
  };

  const result = await getCachedStudentListPage(query);
  return NextResponse.json({ data: result });
}

// POST /api/students  (multipart/form-data)
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const get = (key: string) => {
    const v = formData.get(key);
    return v instanceof File ? null : (v ?? null);
  };

  const fields = {
    fullName: get("fullName"),
    email: get("email"),
    nic: get("nic"),
    dob: get("dob"),
    age: get("age"),
    gender: get("gender"),
    contactNumber: get("contactNumber"),
    whatsappNumber: get("whatsappNumber"),
    address: get("address"),
    height: get("height"),
    weight: get("weight"),
    chest: get("chest"),
    shoulder: get("shoulder"),
    waist: get("waist"),
    shoeSize: get("shoeSize"),
    skinColorOptionId: get("skinColorOptionId"),
    eyeColor: get("eyeColor"),
    hairColor: get("hairColor"),
    talents: get("talents"),
    preferredDate: get("preferredDate"),
  };

  let modelingInterestIds: string[] = [];
  const interestsRaw = get("modelingInterestIds");
  if (typeof interestsRaw === "string" && interestsRaw.trim()) {
    try {
      const parsed = JSON.parse(interestsRaw) as unknown;
      if (Array.isArray(parsed)) {
        modelingInterestIds = parsed.filter((id): id is string => typeof id === "string");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid modeling interests", field: "modelingInterestIds" },
        { status: 400 },
      );
    }
  }

  // Normalise
  const email = typeof fields.email === "string" ? fields.email.toLowerCase().trim() : "";
  const nicRaw = typeof fields.nic === "string" ? fields.nic.trim() : "";
  const nicResult = validateNic(nicRaw);
  const nic = nicResult.normalised;

  // Validate
  const { errors, warnings } = validateStudentFields({ ...fields, email, nic });
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  const skinColorOptionId =
    typeof fields.skinColorOptionId === "string" && fields.skinColorOptionId.trim()
      ? fields.skinColorOptionId.trim()
      : null;

  if (skinColorOptionId) {
    const skinOption = await prisma.registrationSkinColorOption.findFirst({
      where: { id: skinColorOptionId, isActive: true },
      select: { id: true },
    });
    if (!skinOption) {
      return NextResponse.json(
        { error: "Invalid skin color selection", field: "skinColorOptionId" },
        { status: 400 },
      );
    }
  }

  if (modelingInterestIds.length > 0) {
    const validCount = await prisma.registrationModelingInterestOption.count({
      where: { id: { in: modelingInterestIds }, isActive: true },
    });
    if (validCount !== modelingInterestIds.length) {
      return NextResponse.json(
        { error: "One or more modeling interests are invalid", field: "modelingInterestIds" },
        { status: 400 },
      );
    }
  }

  // Duplicate email/NIC check (give specific field error)
  const existingEmail = await prisma.student.findFirst({
    where: emailDuplicateWhere(email),
    select: { id: true },
  });
  if (existingEmail) {
    return NextResponse.json(
      { error: "A student with this email already exists", field: "email" },
      { status: 409 },
    );
  }

  const existingNic = await prisma.student.findFirst({
    where: nicDuplicateWhere(nic),
    select: { id: true },
  });
  if (existingNic) {
    return NextResponse.json(
      { error: "A student with this NIC already exists", field: "nic" },
      { status: 409 },
    );
  }

  // Generate model code
  let modelCode: string;
  try {
    modelCode = await generateModelCode(prisma);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to generate model code" },
      { status: 500 },
    );
  }

  // Resolve preferredBranchId
  const preferredBranchIdRaw = get("preferredBranchId");
  let preferredBranchId: string | null = null;
  if (preferredBranchIdRaw) {
    const branch = await prisma.branch.findFirst({
      where: { id: preferredBranchIdRaw, isActive: true },
      select: { id: true },
    });
    preferredBranchId = branch?.id ?? null;
  }

  // Create student
  let studentId: string;
  let createdModelCode: string;

  const eyeColor =
    fields.eyeColor && String(fields.eyeColor).trim()
      ? String(fields.eyeColor).trim()
      : null;
  const hairColor =
    fields.hairColor && String(fields.hairColor).trim()
      ? String(fields.hairColor).trim()
      : null;

  if (eyeColor) {
    await ensureRegistrationTextColorOption("eyeColor", eyeColor);
  }
  if (hairColor) {
    await ensureRegistrationTextColorOption("hairColor", hairColor);
  }

  const createData = {
    modelCode,
    source: "MANUAL" as const,
    fullName: String(fields.fullName).trim(),
    email,
    nic,
    dob: new Date(String(fields.dob)),
    age: Number(fields.age),
    gender: String(fields.gender),
    contactNumber: String(fields.contactNumber).trim(),
    whatsappNumber: String(fields.whatsappNumber).trim(),
    address:
      typeof fields.address === "string" ? fields.address.trim() : "",
    height: fields.height ? Number(fields.height) : null,
    weight: fields.weight ? Number(fields.weight) : null,
    chest: fields.chest ? Number(fields.chest) : null,
    shoulder: fields.shoulder ? Number(fields.shoulder) : null,
    waist: fields.waist ? Number(fields.waist) : null,
    shoeSize: fields.shoeSize ? String(fields.shoeSize).trim() : null,
    skinColorOptionId,
    eyeColor,
    hairColor,
    talents: fields.talents ? String(fields.talents).trim() : null,
    modelingInterestIds,
    photoUrl: null as string | null,
    preferredBranchId,
    preferredDate: fields.preferredDate ? String(fields.preferredDate) : null,
  };

  try {
    const result = await createStudentAndEnrollment(createData);
    studentId = result.studentId;
    createdModelCode = result.modelCode;
  } catch (err) {
    if (err instanceof DuplicateStudentError) {
      // Race condition on modelCode — retry once
      if (err.field === "modelCode") {
        const newCode = await generateModelCode(prisma);
        try {
          const result = await createStudentAndEnrollment({
            ...createData,
            modelCode: newCode,
          });
          studentId = result.studentId;
          createdModelCode = result.modelCode;
        } catch (retryErr) {
          if (retryErr instanceof DuplicateStudentError) {
            return NextResponse.json(
              { error: retryErr.message, field: retryErr.field },
              { status: 409 },
            );
          }
          throw retryErr;
        }
      } else {
        return NextResponse.json(
          { error: err.message, field: err.field },
          { status: 409 },
        );
      }
    } else {
      throw err;
    }
  }

  // Upload photo if provided (bucket: students, path: photos/{studentId}.ext)
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      const photoUrl = await uploadPhotoFromFile(photoFile, studentId);
      await prisma.student.update({
        where: { id: studentId },
        data: { photoUrl },
      });
    } catch (photoErr) {
      const message =
        photoErr instanceof Error
          ? photoErr.message
          : "Photo upload failed";
      warnings.push(
        `${message}. Create a public Supabase Storage bucket named "students" if it does not exist.`,
      );
      console.warn("[students] Photo upload failed after student creation:", photoErr);
    }
  }

  invalidateStudents();
  invalidateDashboard();
  if (preferredBranchId) {
    invalidateBranches(preferredBranchId);
  }

  const detail = await fetchStudentDetailApi(studentId);
  if (!detail) {
    return NextResponse.json(
      { error: "Student created but could not be loaded" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: detail,
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    { status: 201 },
  );
}
