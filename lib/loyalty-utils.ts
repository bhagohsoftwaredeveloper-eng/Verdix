
/**
 * Utility for customer loyalty logic
 */

/**
 * Checks if a loyalty card is expired based on its expiry date string.
 * @param expiryDate - Date string from the database (ISO or similar)
 * @returns boolean - true if expired, false otherwise
 */
export function isLoyaltyCardExpired(expiryDate: string | Date | null): boolean {
  if (!expiryDate) return false;
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  
  // Set time to end of day for the expiry date to be fair
  expiry.setHours(23, 59, 59, 999);
  
  return now > expiry;
}
