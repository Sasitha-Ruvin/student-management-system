import { prisma } from "@/lib/prisma";
import { academyLogoProxyUrl } from "@/lib/storage/proxy-urls";

const SETTINGS_ID = "default";

export type AcademyBranding = {
  academyName: string;
  logoUrl: string | null;
  updatedAt: string;
};

export async function getAcademyBranding(): Promise<AcademyBranding> {
  const settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      academyName: true,
      logoUrl: true,
      updatedAt: true,
    },
  });

  return {
    academyName: settings?.academyName ?? "Walk Model Agency",
    logoUrl: academyLogoProxyUrl(settings?.logoUrl),
    updatedAt: settings?.updatedAt.toISOString() ?? new Date().toISOString(),
  };
}
