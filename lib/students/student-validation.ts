import { validateNic } from "./nic-validator";

const VALID_GENDERS = new Set(["Male", "Female", "Other"]);
const VALID_DAYS = new Set([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export type ValidationResult = {
  errors: Record<string, string>;
  warnings: string[];
};

type StudentFields = {
  fullName?: unknown;
  email?: unknown;
  nic?: unknown;
  dob?: unknown;
  age?: unknown;
  gender?: unknown;
  contactNumber?: unknown;
  whatsappNumber?: unknown;
  address?: unknown;
  height?: unknown;
  weight?: unknown;
  chest?: unknown;
  shoulder?: unknown;
  waist?: unknown;
  shoeSize?: unknown;
  skinColorOptionId?: unknown;
  eyeColor?: unknown;
  hairColor?: unknown;
  talents?: unknown;
  preferredDate?: unknown;
  photoUrl?: unknown;
  modelingInterests?: unknown;
  skinColor?: unknown;
  nicFrontUrl?: unknown;
  nicBackUrl?: unknown;
  professionalPhotoUrls?: unknown;
};

function isPhoneNumber(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const digits = val.replace(/[^0-9]/g, "");
  return (
    /^[0-9+]+$/.test(val.trim()) &&
    digits.length >= 9 &&
    digits.length <= 15
  );
}

/**
 * Validates student registration fields.
 * Returns errors (blocking) and warnings (non-blocking).
 * photoUrl validation only runs for webhook path (when provided as string).
 */
export function validateStudentFields(
  fields: StudentFields,
  opts: { isWebhook?: boolean } = {},
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // fullName
  if (typeof fields.fullName !== "string" || fields.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  } else if (fields.fullName.trim().length > 100) {
    errors.fullName = "Full name must be 100 characters or fewer";
  }

  // email
  if (typeof fields.email !== "string" || !fields.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim().toLowerCase())) {
    errors.email = "Email must be a valid email address";
  }

  // nic
  if (typeof fields.nic !== "string" || !fields.nic.trim()) {
    errors.nic = "NIC is required";
  } else {
    const nicResult = validateNic(fields.nic);
    if (!nicResult.valid) {
      errors.nic = nicResult.error ?? "Invalid NIC format";
    }
  }

  // dob
  let dobDate: Date | null = null;
  if (!fields.dob) {
    errors.dob = "Date of birth is required";
  } else {
    dobDate = new Date(fields.dob as string);
    if (isNaN(dobDate.getTime())) {
      errors.dob = "Date of birth must be a valid date";
    } else if (dobDate >= new Date()) {
      errors.dob = "Date of birth cannot be in the future";
    }
  }

  // age
  if (fields.age === undefined || fields.age === null || fields.age === "") {
    errors.age = "Age is required";
  } else {
    const ageNum = Number(fields.age);
    if (!Number.isInteger(ageNum) || ageNum <= 0) {
      errors.age = "Age must be a positive integer";
    } else if (dobDate && !isNaN(dobDate.getTime())) {
      const ageFromDob = Math.floor(
        (Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
      if (Math.abs(ageNum - ageFromDob) > 1) {
        warnings.push(
          `Age entered (${ageNum}) doesn't match date of birth (${ageFromDob} years). Please verify.`,
        );
      }
    }
  }

  // gender
  if (typeof fields.gender !== "string" || !VALID_GENDERS.has(fields.gender)) {
    errors.gender = "Gender must be Male, Female, or Other";
  }

  // contactNumber
  if (!isPhoneNumber(fields.contactNumber)) {
    errors.contactNumber =
      "Contact number must be 9–15 digits (digits and + only)";
  }

  // whatsappNumber
  if (!isPhoneNumber(fields.whatsappNumber)) {
    errors.whatsappNumber =
      "WhatsApp number must be 9–15 digits (digits and + only)";
  }

  // address (optional)
  const addressRaw =
    typeof fields.address === "string" ? fields.address.trim() : "";
  if (addressRaw) {
    if (addressRaw.length < 2) {
      errors.address = "Address must be at least 2 characters when provided";
    } else if (addressRaw.length > 500) {
      errors.address = "Address must be 500 characters or fewer";
    }
  }

  // height (optional)
  if (fields.height !== undefined && fields.height !== null && fields.height !== "") {
    const h = Number(fields.height);
    if (isNaN(h) || h < 50 || h > 300) {
      errors.height = "Height must be between 50 and 300 cm";
    }
  }

  // weight (optional)
  if (fields.weight !== undefined && fields.weight !== null && fields.weight !== "") {
    const w = Number(fields.weight);
    if (isNaN(w) || w < 10 || w > 500) {
      errors.weight = "Weight must be between 10 and 500 kg";
    }
  }

  for (const [key, min, max] of [
    ["chest", 20, 80],
    ["shoulder", 20, 80],
    ["waist", 20, 80],
  ] as const) {
    const val = fields[key];
    if (val !== undefined && val !== null && val !== "") {
      const n = Number(val);
      if (isNaN(n) || n < min || n > max) {
        errors[key] = `${key.charAt(0).toUpperCase()}${key.slice(1)} must be between ${min} and ${max} inches`;
      }
    }
  }

  if (
    fields.shoeSize !== undefined &&
    fields.shoeSize !== null &&
    fields.shoeSize !== "" &&
    typeof fields.shoeSize === "string" &&
    fields.shoeSize.trim().length > 10
  ) {
    errors.shoeSize = "Shoe size must be 10 characters or fewer";
  }

  if (
    fields.skinColorOptionId !== undefined &&
    fields.skinColorOptionId !== null &&
    fields.skinColorOptionId !== "" &&
    typeof fields.skinColorOptionId !== "string"
  ) {
    errors.skinColorOptionId = "Invalid skin color selection";
  }

  for (const [key, max] of [
    ["eyeColor", 50],
    ["hairColor", 50],
  ] as const) {
    const val = fields[key];
    if (val !== undefined && val !== null && val !== "" && typeof val === "string" && val.length > max) {
      errors[key] = `${key === "eyeColor" ? "Eye color" : "Hair color"} must be ${max} characters or fewer`;
    }
  }

  if (
    fields.talents !== undefined &&
    fields.talents !== null &&
    fields.talents !== "" &&
    typeof fields.talents === "string" &&
    fields.talents.length > 2000
  ) {
    errors.talents = "Talents must be 2000 characters or fewer";
  }

  // modelingInterests (optional — labels from partner)
  if (fields.modelingInterests !== undefined && fields.modelingInterests !== null) {
    const arr = fields.modelingInterests;
    if (!Array.isArray(arr)) {
      errors.modelingInterests = "modelingInterests must be an array of strings";
    } else if (arr.length > 40) {
      errors.modelingInterests = "modelingInterests has too many items";
    } else {
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (typeof item !== "string" || !item.trim()) {
          errors.modelingInterests = "Each modeling interest must be a non-empty string";
          break;
        }
        if (item.trim().length > 200) {
          errors.modelingInterests = "Each modeling interest must be 200 characters or fewer";
          break;
        }
      }
    }
  }

  // skinColor (optional webhook — resolved to option ID server-side by label)
  if (
    fields.skinColor !== undefined &&
    fields.skinColor !== null &&
    fields.skinColor !== ""
  ) {
    if (typeof fields.skinColor !== "string") {
      errors.skinColor = "Skin color must be a string label";
    } else if (fields.skinColor.trim().length > 200) {
      errors.skinColor = "Skin color must be 200 characters or fewer";
    }
  }

  // preferredDate (optional)
  if (
    fields.preferredDate !== undefined &&
    fields.preferredDate !== null &&
    fields.preferredDate !== "" &&
    !VALID_DAYS.has(fields.preferredDate as string)
  ) {
    errors.preferredDate =
      "Preferred date must be a valid day of the week";
  }

  // photoUrl (webhook only — validation of the URL string format)
  if (
    opts.isWebhook &&
    fields.photoUrl !== undefined &&
    fields.photoUrl !== null &&
    fields.photoUrl !== ""
  ) {
    try {
      new URL(fields.photoUrl as string);
    } catch {
      errors.photoUrl = "Photo URL must be a valid URL";
    }
  }

  if (opts.isWebhook) {
    for (const [key, val] of [
      ["nicFrontUrl", fields.nicFrontUrl],
      ["nicBackUrl", fields.nicBackUrl],
    ] as const) {
      if (val !== undefined && val !== null && val !== "") {
        try {
          new URL(val as string);
        } catch {
          errors[key] = "Must be a valid URL";
        }
      }
    }

    const pro = fields.professionalPhotoUrls;
    if (pro !== undefined && pro !== null) {
      if (!Array.isArray(pro)) {
        errors.professionalPhotoUrls = "professionalPhotoUrls must be an array";
      } else if (pro.length > 40) {
        errors.professionalPhotoUrls = "Too many photo URLs";
      } else {
        for (let i = 0; i < pro.length; i++) {
          const urlItem = pro[i];
          if (typeof urlItem !== "string" || !urlItem.trim()) {
            errors.professionalPhotoUrls = "Each URL must be a non-empty string";
            break;
          }
          try {
            new URL(urlItem);
          } catch {
            errors.professionalPhotoUrls = "Each professional photo URL must be valid";
            break;
          }
        }
      }
    }
  }

  return { errors, warnings };
}
