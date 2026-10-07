// Generates admin login credentials for a newly onboarded hospital.
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, randomInt } from "node:crypto";
import { slugify } from "@/lib/slug";

const adjectives = ["swift", "bright", "noble", "vital", "lucid", "prime", "alpha", "zen"];
const pickRand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const generateUsername = (hospitalName: string) => {
  const base = slugify(hospitalName).replace(/-/g, ".").slice(0, 24) || "hospital";
  const n = Math.floor(100 + Math.random() * 900);
  return `admin.${base}${n}`;
};

export const generatePassword = (len = 12) => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const sym = "!@#$%&*";
  const all = upper + lower + nums + sym;
  let out =
    pickRand(upper.split("")) +
    pickRand(lower.split("")) +
    pickRand(nums.split("")) +
    pickRand(sym.split(""));
  for (let i = out.length; i < len; i++) out += pickRand(all.split(""));
  return out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

/**
 * A patient's first password, made to be read out at a hospital desk and
 * remembered: up to two initials from their name, then a random stretch of
 * their own mobile number, six characters in all — "rk3456" for Rahim Khan on
 * 01712345678. A name not written in Latin letters has no initials to type,
 * so it is six digits of the number.
 *
 * Weak on purpose, and guessable by someone who knows both the name and the
 * number: the hospital chose easy over strong for people who may never have
 * had a password before.
 */
export const easyPatientPassword = (fullName: string, phone: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map(word => word[0]?.toLowerCase() ?? "")
    .filter(letter => /[a-z]/.test(letter))
    .slice(0, 2)
    .join("");
  const digits = phone.replace(/\D/g, "");
  const need = 6 - initials.length;
  if (digits.length < need) return initials + String(randomInt(0, 10 ** need)).padStart(need, "0");
  const start = randomInt(0, digits.length - need + 1);
  return initials + digits.slice(start, start + need);
};

export const generateAdminCredentials =(hospitalName: string) => ({
  username: generateUsername(hospitalName),
  password: generatePassword(12),
  tagline: pickRand(adjectives),
});

/**
 * Reversible storage for a generated login password (HF-32).
 *
 * Not hashed, deliberately: a hospital admin needs to view a doctor's
 * password again after it's created, not just at the moment of creation —
 * bcrypt/argon2 can't do that, only a two-way cipher can. Supabase Auth
 * still holds its own hashed copy for actually signing the doctor in; this
 * is a separate, app-level copy that exists only so the admin can retrieve
 * it, stored in doctor_login_secrets (0021), a table with no RLS policy for
 * `authenticated` at all — only the service-role client can read or write
 * it, and only through /api/v1/doctors/[id]/login.
 *
 * AES-256-GCM: authenticated encryption, so a tampered ciphertext fails to
 * decrypt rather than silently returning garbage. Key comes from
 * DOCTOR_LOGIN_ENCRYPTION_KEY (32 raw bytes, base64), server-only, never
 * prefixed NEXT_PUBLIC_. Losing/rotating that key makes every password
 * stored under the old key permanently unreadable — regenerate the login
 * instead of trying to recover it.
 */

const encryptionKey = () => {
  const raw = process.env.DOCTOR_LOGIN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "DOCTOR_LOGIN_ENCRYPTION_KEY is not set — see .env.example",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "DOCTOR_LOGIN_ENCRYPTION_KEY must decode to exactly 32 bytes",
    );
  }
  return key;
};

/** iv (12 bytes) + authTag (16 bytes) + ciphertext, all one base64 string. */
export const encryptSecret = (plaintext: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
};

export const decryptSecret = (encoded: string) => {
  const blob = Buffer.from(encoded, "base64");
  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};
