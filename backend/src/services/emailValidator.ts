import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Massive list of common temporary/burner email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'temp-mail.org', 
  'yopmail.com', 'sharklasers.com', 'tempmail.com', 'getnada.com', 
  'maildrop.cc', 'throwawaymail.com', 'tempmailaddress.com', 'mohmal.com'
]);

/**
 * Layer 1: Strict Regex Syntax Validation
 */
function isValidSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Layer 2: Disposable/Burner Domain Check
 */
function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

/**
 * Layer 3: DNS MX Record Validation
 * Queries the public DNS registry to see if the domain is physically configured to receive mail.
 * This does NOT connect to the mail server, so it is 100% safe from IP blacklisting.
 */
async function hasValidMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch (error: any) {
    // ENOTFOUND = Domain literally does not exist on the internet
    // ENODATA = Domain exists, but specifically has no mail servers configured
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return false; // 100% definitively fake/dead
    }
    
    // FAIL-OPEN POLICY: If there was a network timeout (ETIMEOUT) or server error (ESERVFAIL),
    // we MUST assume the email is valid. It is better to risk one bounce than to accidentally
    // delete a real, paying client due to a 5-second internet glitch.
    return true;
  }
}

/**
 * Comprehensive 3-Layer Email Validator
 * Returns true if the email passes all layers. Returns false if it fails any layer.
 */
export async function verifyEmail(email: string): Promise<boolean> {
  if (!email || typeof email !== 'string') return false;
  
  const cleanEmail = email.trim().toLowerCase();

  // 1. Syntax Check
  if (!isValidSyntax(cleanEmail)) {
    console.log(`[Validator] Failed Syntax: ${cleanEmail}`);
    return false;
  }

  const [, domain] = cleanEmail.split('@');
  if (!domain) return false;

  // 2. Disposable Check
  if (isDisposableDomain(domain)) {
    console.log(`[Validator] Failed Burner Domain: ${cleanEmail}`);
    return false;
  }

  // 3. MX Record Check
  const hasMx = await hasValidMxRecords(domain);
  if (!hasMx) {
    console.log(`[Validator] Failed DNS MX Lookup: ${cleanEmail} (Domain cannot receive mail)`);
    return false;
  }

  return true;
}
