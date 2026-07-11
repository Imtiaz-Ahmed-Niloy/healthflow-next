// Generates admin login credentials for a newly onboarded hospital.
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

export const generateAdminCredentials = (hospitalName: string) => ({
  username: generateUsername(hospitalName),
  password: generatePassword(12),
  tagline: pickRand(adjectives),
});
