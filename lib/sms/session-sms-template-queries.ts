import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import { prisma } from "@/lib/prisma";

export type SessionSmsTemplateRecord = {
  id: string;
  name: string;
  body: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function toRecord(row: {
  id: string;
  name: string;
  body: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): SessionSmsTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    body: row.body,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSessionSmsTemplates(): Promise<SessionSmsTemplateRecord[]> {
  const rows = await prisma.sessionSmsTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toRecord);
}

export async function getSessionSmsTemplateById(
  id: string,
): Promise<SessionSmsTemplateRecord | null> {
  const row = await prisma.sessionSmsTemplate.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}

export async function getDefaultSessionSmsTemplate(): Promise<SessionSmsTemplateRecord | null> {
  const row = await prisma.sessionSmsTemplate.findFirst({
    where: { isDefault: true },
    orderBy: { sortOrder: "asc" },
  });
  return row ? toRecord(row) : null;
}

export async function resolveSessionSmsTemplate(
  templateId?: string | null,
): Promise<{ id: string | null; name: string; body: string }> {
  if (templateId) {
    const row = await prisma.sessionSmsTemplate.findUnique({
      where: { id: templateId },
    });
    if (row) {
      return { id: row.id, name: row.name, body: row.body };
    }
  }

  const defaultRow = await prisma.sessionSmsTemplate.findFirst({
    where: { isDefault: true },
    orderBy: { sortOrder: "asc" },
  });
  if (defaultRow) {
    return {
      id: defaultRow.id,
      name: defaultRow.name,
      body: defaultRow.body,
    };
  }

  return {
    id: null,
    name: "Built-in default",
    body: DEFAULT_SESSION_SMS_TEMPLATE_BODY,
  };
}
