import { prisma } from "@/lib/prisma";

/**
 * 🔄 Sequential Reordering Utility
 * Ensures that all compositions for a given project maintain a strictly sequential
 * order (1, 2, 3...) after any creation, deletion, or manual reordering.
 * This prevents indexing gaps and ensures predictable video rendering.
 */
export async function syncCompositionOrders(projectId: string) {
  // 1. Fetch current compositions sorted by current order, then timestamp
  const compositions = await prisma.composition.findMany({
    where: { projectId },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  // 2. Perform a transaction to re-apply the indices if they are non-sequential
  // (Using a loop since batch updates in Prisma need fixed properties across records)
  await prisma.$transaction(
    compositions.map((comp, index) =>
      prisma.composition.update({
        where: { id: comp.id },
        data: { order: index + 1 } // 1-based indexing
      })
    )
  );
  
  return compositions.length;
}
