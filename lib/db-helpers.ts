import { db } from './db'

/**
 * Get the next reference number for a given field.
 * Increments and returns the reference with LPAD formatting.
 */
export async function getNextReference(field: string): Promise<string> {
  const result = await db.$transaction(async (tx) => {
    // Get current value
    const current = await tx.transactionReference.findUnique({
      where: { id: 1 },
      select: {
        [field]: true,
      },
    })

    // Extract number from current value (e.g., "SO-00000001" -> 1)
    const currentValue = current?.[field as keyof typeof current] as string | undefined
    const num = currentValue ? parseInt(currentValue.replace(/\D/g, ''), 10) : 0
    const nextNum = num + 1

    // Format with LPAD (e.g., 1 -> "00000001")
    const formatted = String(nextNum).padStart(8, '0')

    // Update and return
    await tx.transactionReference.update({
      where: { id: 1 },
      data: {
        [field]: formatted,
      },
    })

    return formatted
  })

  return result
}

/**
 * Get the next receipt number.
 */
export async function getNextReceiptNumber(terminalId?: string): Promise<string> {
  const result = await db.$transaction(async (tx) => {
    let nextVal: string;
    
    if (terminalId) {
      const terminal = await tx.posTerminal.findUnique({
        where: { id: terminalId },
        select: { orNextReference: true }
      });
      
      const currentNum = terminal?.orNextReference ? parseInt(terminal.orNextReference, 10) : 0;
      const nextNum = currentNum + 1;
      nextVal = String(nextNum).padStart(6, '0');
      
      await tx.posTerminal.update({
        where: { id: terminalId },
        data: { orNextReference: nextVal }
      });
    } else {
      const current = await tx.transactionReference.findUnique({
        where: { id: 1 },
        select: { receiptNumber: true },
      });

      const currentNum = current?.receiptNumber ? parseInt(current.receiptNumber, 10) : 0;
      const nextNum = currentNum + 1;
      nextVal = String(nextNum).padStart(8, '0');

      await tx.transactionReference.update({
        where: { id: 1 },
        data: { receiptNumber: nextVal },
      });
    }

    return nextVal;
  });

  return result;
}

/**
 * Get the next X Reading number.
 */
export async function getNextXReadingNumber(terminalId: string): Promise<string> {
  const result = await db.$transaction(async (tx) => {
    const terminal = await tx.posTerminal.update({
      where: { id: terminalId },
      data: { xCounter: { increment: 1 } },
      select: { xCounter: true }
    });

    const nextVal = terminal.xCounter;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `X-${dateStr}-${nextVal.toString().padStart(3, '0')}`;
  });

  return result;
}

/**
 * Get the next Z Reading number.
 */
export async function getNextZReadingNumber(terminalId: string): Promise<string> {
  const result = await db.$transaction(async (tx) => {
    const terminal = await tx.posTerminal.update({
      where: { id: terminalId },
      data: { zCounter: { increment: 1 } },
      select: { zCounter: true }
    });

    const nextVal = terminal.zCounter;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `Z-${dateStr}-${nextVal.toString().padStart(3, '0')}`;
  });

  return result;
}

/**
 * Execute a callback within a database transaction.
 * Returns the result of the callback.
 */
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.$transaction(callback)
}

/**
 * Close the database connection pool.
 * (Prisma handles this automatically, but keeping for API compatibility)
 */
export async function closePool(): Promise<void> {
  await db.$disconnect()
}
