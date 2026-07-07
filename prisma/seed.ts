import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

import { createPgPool, resolveSeedConnectionString } from "../lib/db/pg-pool";
import { PrismaClient } from "../app/generated/prisma";
import { backfillBranchCode } from "../lib/branches/generate-branch-code";

function createPrismaClient() {
  const pool = createPgPool(resolveSeedConnectionString(), { max: 3 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const ADMIN_EMAIL =
  process.env.ADMIN_SEED_EMAIL?.toLowerCase() ?? "doclink308@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_SEED_NAME ?? "DocLink Admin";

async function seedBranchCodes(prisma: PrismaClient) {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, branchCode: true },
  });

  for (const branch of branches) {
    if (!branch.branchCode) {
      const code = await backfillBranchCode(prisma, branch.id, branch.name);
      console.log(`Backfilled branchCode ${code} for ${branch.name}`);
    }
  }
}

async function seedAcademySettings(prisma: PrismaClient) {
  const existing = await prisma.academySettings.findUnique({
    where: { id: "default" },
  });

  if (!existing) {
    await prisma.academySettings.create({
      data: {
        id: "default",
        academyName: "Walk Model Agency",
        defaultRegistrationFee: 1000,
        defaultCourseFee: 50000,
      },
    });
    console.log("Seeded academy settings");
  }
}

async function seedDefaultPaymentPlan(prisma: PrismaClient) {
  const existing = await prisma.paymentPlan.findFirst({
    where: { isDefault: true },
  });

  if (existing) return;

  const settings = await prisma.academySettings.findUnique({
    where: { id: "default" },
  });

  const registrationFee = Number(settings?.defaultRegistrationFee ?? 1000);
  const courseFee = Number(settings?.defaultCourseFee ?? 50000);

  await prisma.paymentPlan.create({
    data: {
      name: "Standard",
      isDefault: true,
      isActive: true,
      registrationFee,
      courseFee,
      oneTimeDiscountAmount: 5000,
      sortOrder: 0,
      lineItems: {
        create: [
          {
            label: "First Month (1st Week)",
            amount: 20000,
            order: 0,
          },
          {
            label: "Second Month (1st Week)",
            amount: 15000,
            order: 1,
          },
          {
            label: "Third Month (1st Week)",
            amount: 15000,
            order: 2,
          },
        ],
      },
    },
  });

  console.log("Seeded default payment plan");
}

const DEFAULT_SKIN_COLORS = [
  "Very Fair",
  "Fair",
  "Light",
  "Light Medium",
  "Medium",
  "Medium Tan",
  "Tan",
  "Deep Tan",
  "Deep",
  "Very Deep",
] as const;

const DEFAULT_MODELING_INTERESTS = [
  "Runway",
  "Fashion",
  "Commercial",
  "Editorial",
  "Fitness",
  "Bridal",
] as const;

const DEFAULT_EYE_COLORS = [
  "Brown",
  "Blue",
  "Green",
  "Hazel",
  "Gray",
  "Black",
  "Amber",
] as const;

const DEFAULT_HAIR_COLORS = [
  "Black",
  "Brown",
  "Dark Brown",
  "Light Brown",
  "Blonde",
  "Auburn",
  "Red",
  "Gray",
  "White",
] as const;

async function seedLabelOptions<T extends { findFirst: Function; create: Function; count: Function }>(
  prismaModel: T,
  labels: readonly string[],
  labelName: string,
) {
  let created = 0;
  for (const [sortOrder, label] of labels.entries()) {
    const existing = await prismaModel.findFirst({
      where: { label: { equals: label, mode: "insensitive" } },
      select: { id: true },
    });
    if (!existing) {
      await prismaModel.create({
        data: {
          label,
          sortOrder,
          isActive: true,
          isDefault: false,
        },
      });
      created += 1;
    }
  }
  if (created > 0) {
    console.log(`Seeded ${created} ${labelName} option(s)`);
  }
}

async function seedRegistrationOptions(prisma: PrismaClient) {
  await seedLabelOptions(
    prisma.registrationSkinColorOption,
    DEFAULT_SKIN_COLORS,
    "skin color",
  );
  await seedLabelOptions(
    prisma.registrationModelingInterestOption,
    DEFAULT_MODELING_INTERESTS,
    "modeling interest",
  );
  await seedLabelOptions(
    prisma.registrationEyeColorOption,
    DEFAULT_EYE_COLORS,
    "eye color",
  );
  await seedLabelOptions(
    prisma.registrationHairColorOption,
    DEFAULT_HAIR_COLORS,
    "hair color",
  );
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_SEED_PASSWORD is required. Add it to .env before running the seed.",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for seeding.",
    );
  }

  const prisma = createPrismaClient();
  const disconnect = () => prisma.$disconnect();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  await seedAcademySettings(prisma);
  await seedDefaultPaymentPlan(prisma);
  await seedRegistrationOptions(prisma);
  await seedBranchCodes(prisma);

  if (existingAdmin) {
    console.log(`Admin record already exists for ${ADMIN_EMAIL}`);
    await disconnect();
    return;
  }

  const { data: usersData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list Supabase users: ${listError.message}`);
  }

  let supabaseUserId = usersData.users.find(
    (user) => user.email?.toLowerCase() === ADMIN_EMAIL,
  )?.id;

  if (!supabaseUserId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME },
    });

    if (error) {
      throw new Error(`Failed to create Supabase user: ${error.message}`);
    }

    supabaseUserId = data.user.id;
    console.log(`Created Supabase auth user for ${ADMIN_EMAIL}`);
  } else {
    console.log(`Reusing existing Supabase auth user for ${ADMIN_EMAIL}`);
  }

  await prisma.admin.create({
    data: {
      supabaseId: supabaseUserId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
    },
  });

  console.log(`Seeded admin portal user: ${ADMIN_EMAIL}`);
  await seedAcademySettings(prisma);
  await disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
