import { validateSessionSmsTemplateBody } from "@/lib/sms/session-sms-placeholders";
import {
  getSessionSmsTemplateById,
  listSessionSmsTemplates,
  type SessionSmsTemplateRecord,
} from "@/lib/sms/session-sms-template-queries";
import { prisma } from "@/lib/prisma";

export class SessionSmsTemplateError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "SessionSmsTemplateError";
  }
}

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

export async function createSessionSmsTemplate(input: {
  name: string;
  body: string;
  isDefault?: boolean;
}): Promise<SessionSmsTemplateRecord> {
  const name = input.name.trim();
  const bodyError = validateSessionSmsTemplateBody(input.body);
  if (!name) throw new SessionSmsTemplateError("Name is required");
  if (bodyError) throw new SessionSmsTemplateError(bodyError);

  const count = await prisma.sessionSmsTemplate.count();
  const sortOrder = count;

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.sessionSmsTemplate.updateMany({
        data: { isDefault: false },
      });
    }

    const row = await tx.sessionSmsTemplate.create({
      data: {
        name,
        body: input.body.trim(),
        isDefault: input.isDefault ?? count === 0,
        sortOrder,
      },
    });
    return toRecord(row);
  });
}

export async function updateSessionSmsTemplate(
  id: string,
  input: {
    name?: string;
    body?: string;
    isDefault?: boolean;
    sortOrder?: number;
  },
): Promise<SessionSmsTemplateRecord> {
  const existing = await getSessionSmsTemplateById(id);
  if (!existing) {
    throw new SessionSmsTemplateError("Template not found", 404);
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const body = input.body !== undefined ? input.body.trim() : existing.body;

  if (!name) throw new SessionSmsTemplateError("Name is required");
  const bodyError = validateSessionSmsTemplateBody(body);
  if (bodyError) throw new SessionSmsTemplateError(bodyError);

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.sessionSmsTemplate.updateMany({
        data: { isDefault: false },
      });
    }

    const row = await tx.sessionSmsTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name } : {}),
        ...(input.body !== undefined ? { body } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });

    if (!row.isDefault) {
      const defaultCount = await tx.sessionSmsTemplate.count({
        where: { isDefault: true },
      });
      if (defaultCount === 0) {
        await tx.sessionSmsTemplate.update({
          where: { id },
          data: { isDefault: true },
        });
        row.isDefault = true;
      }
    }

    return toRecord(row);
  });
}

export async function deleteSessionSmsTemplate(id: string): Promise<void> {
  const count = await prisma.sessionSmsTemplate.count();
  if (count <= 1) {
    throw new SessionSmsTemplateError(
      "Cannot delete the last SMS template",
      422,
    );
  }

  const existing = await getSessionSmsTemplateById(id);
  if (!existing) {
    throw new SessionSmsTemplateError("Template not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.sessionSmsTemplate.delete({ where: { id } });

    if (existing.isDefault) {
      const next = await tx.sessionSmsTemplate.findFirst({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (next) {
        await tx.sessionSmsTemplate.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  });
}

export { listSessionSmsTemplates };
