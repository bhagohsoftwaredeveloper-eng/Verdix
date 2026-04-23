/**
 * Generates a standardized 6-digit numeric batch ID.
 * Ensuring it's always a string and numeric for consistency across reports and UIs.
 */
export function generateBatchId(): string {
  // Generates a random number between 100,000 and 999,999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validates if a batch ID matches the standardized format (6-digit numeric string).
 */
export function isValidBatchId(id: string): boolean {
  return /^\d{6}$/.test(id);
}
