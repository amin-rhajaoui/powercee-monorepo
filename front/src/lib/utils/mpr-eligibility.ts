/**
 * Utility function to check if a client is eligible for Ma Prime Rénov (MPR)
 * 
 * Eligibility criteria:
 * - Occupation status must be "PROPRIETAIRE" (owner)
 * - Must be principal residence (is_principal_residence === true)
 * - Property age must be at least 15 years (current year - construction_year >= 15)
 * 
 * @param occupationStatus - The occupation status ("PROPRIETAIRE" | "LOCATAIRE" | null)
 * @param isPrincipalResidence - Whether the property is the principal residence (boolean | null)
 * @param constructionYear - The year the property was constructed (number | null | undefined)
 * @returns true if all eligibility criteria are met, false otherwise
 */
export function isEligibleForMPR(
  occupationStatus: string | null | undefined,
  isPrincipalResidence: boolean | null | undefined,
  constructionYear: number | null | undefined
): boolean {
  // Check occupation status
  if (occupationStatus !== "PROPRIETAIRE") {
    return false;
  }

  // Check principal residence
  if (isPrincipalResidence !== true) {
    return false;
  }

  // Check property age (at least 15 years)
  if (!constructionYear || typeof constructionYear !== "number") {
    return false;
  }

  const currentYear = new Date().getFullYear();
  const propertyAge = currentYear - constructionYear;

  return propertyAge >= 15;
}
