/**
 * Masking helper for Turkish Personal Identifiable Information (PII) to comply with KVKK.
 * Redacts credit cards, emails, Turkish phone numbers, and TC numbers.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Credit card regex (13 to 16 digits, with optional spaces/hyphens)
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;

// Turkish phone number pattern (matches +90 5xx xxx xx xx, 05xxxxxxxxx, etc.)
const TR_PHONE_REGEX = /(?:\+90|0090|0)?\s*([579]\d{2})\s*(\d{3})\s*(\d{2})\s*(\d{2})\b/g;

// Turkish TC Kimlik No regex (11 digits starting with 1-9)
const TC_NO_REGEX = /\b[1-9]\d{10}\b/g;

/**
 * Mask sensitive details in a customer message.
 * @param text The raw input text
 */
export function maskPII(text: string): string {
  if (!text) return "";

  let masked = text;

  // Mask Emails
  masked = masked.replace(EMAIL_REGEX, "[E-POSTA]");

  // Mask Credit Cards
  masked = masked.replace(CREDIT_CARD_REGEX, "[KREDİ KARTI]");

  // Mask Turkish Phone Numbers
  masked = masked.replace(TR_PHONE_REGEX, "[TELEFON]");

  // Mask TC Identification Numbers
  masked = masked.replace(TC_NO_REGEX, (match) => {
    // Only mask if it looks like a valid 11 digit TC No context (not a generic long ID)
    const digits = match.replace(/\D/g, "");
    if (digits.length === 11) {
      return "[T.C. KİMLİK]";
    }
    return match;
  });

  return masked;
}
