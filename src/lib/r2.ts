import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

/**
 * The R2 client. Server-only — these credentials write to the bucket.
 *
 * R2 speaks the S3 API, so the AWS SDK works against it unchanged. Two
 * differences worth knowing: the region is always "auto", and the endpoint is
 * per-account rather than per-region.
 *
 * See docs/image-uploads-r2.md for where each value comes from.
 */

export const R2_BUCKET = "healthflow-media";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

/**
 * Returns null rather than throwing when R2 is not configured, so the app runs
 * without it — every screen works, uploading is the only thing that does not,
 * and the endpoint says so in words instead of failing at import time and
 * taking the whole route down.
 */
export const r2Config = (): R2Config | null => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !publicUrl) return null;

  return { accountId, accessKeyId, secretAccessKey, publicUrl };
};

export const createR2Client = (config: R2Config) =>
  new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
