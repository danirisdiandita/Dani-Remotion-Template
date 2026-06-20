import { prisma } from "./prisma";

export async function getUserByApiKey(req: Request): Promise<{ id: string } | null> {
  const key =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!key) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    select: { userId: true },
  });

  if (!apiKey) return null;

  await prisma.apiKey.update({
    where: { key },
    data: { lastUsedAt: new Date() },
  });

  return { id: apiKey.userId };
}
