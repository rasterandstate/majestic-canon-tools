/**
 * Publish signed pack to R2 (Cloudflare). Uploads pack files and latest.json.
 * Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_CDN_BASE_URL
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { PackManifest } from './manifest.js';

export interface PublishOptions {
  /** Pack directory (contains manifest.json, payload/, signature/) */
  packRoot: string;
  /** R2 account ID */
  accountId: string;
  /** R2 access key ID */
  accessKeyId: string;
  /** R2 secret access key */
  secretAccessKey: string;
  /** R2 bucket name */
  bucket: string;
  /** Base URL for CDN (e.g. https://cdn.majesticcore.dev/canon). No trailing slash. */
  cdnBaseUrl: string;
}

export interface LatestManifestJson {
  version?: number;
  canon_version: string;
  pack_format_version?: string;
  schema_version?: string;
  schemaVersion?: number;
  identity_version?: string;
  full_pack_url: string;
  fullPackUrl?: string;
  full_pack_sha256?: string;
  published_at: string;
}

function getR2Client(accountId: string, accessKeyId: string, secretAccessKey: string): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Publish pack to R2. Uploads pack files under canon/packs/{canon_version}/
 * and updates canon/latest.json.
 */
export async function publishToR2(options: PublishOptions): Promise<{ canonVersion: string }> {
  const { packRoot, accountId, accessKeyId, secretAccessKey, bucket, cdnBaseUrl } = options;

  const manifestPath = join(packRoot, 'manifest.json');
  const payloadPath = join(packRoot, 'payload', 'canon.json');
  const sigPath = join(packRoot, 'signature', 'manifest.sig');

  if (!existsSync(manifestPath) || !existsSync(payloadPath) || !existsSync(sigPath)) {
    throw new Error(
      `Pack incomplete: need manifest.json, payload/canon.json, signature/manifest.sig in ${packRoot}`
    );
  }

  const manifest: PackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const canonVersion = manifest.canon_version ?? '';
  if (!canonVersion) {
    throw new Error('manifest.json missing canon_version');
  }

  const base = cdnBaseUrl.replace(/\/$/, '');
  const packPrefix = `canon/packs/${canonVersion}`;
  const fullPackUrl = `${base}/packs/${canonVersion}/`;

  const s3 = getR2Client(accountId, accessKeyId, secretAccessKey);

  const manifestBytes = readFileSync(manifestPath);
  const canonBytes = readFileSync(payloadPath);
  const sigBytes = readFileSync(sigPath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${packPrefix}/manifest.json`,
      Body: manifestBytes,
      ContentType: 'application/json',
    })
  );
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${packPrefix}/payload/canon.json`,
      Body: canonBytes,
      ContentType: 'application/json',
    })
  );
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${packPrefix}/signature/manifest.sig`,
      Body: sigBytes,
      ContentType: 'application/octet-stream',
    })
  );

  const latestManifest: LatestManifestJson = {
    version: 1,
    canon_version: canonVersion,
    pack_format_version: manifest.pack_format_version,
    schema_version: manifest.schema_version,
    schemaVersion: parseInt(manifest.schema_version ?? '0', 10),
    identity_version: manifest.identity_version,
    full_pack_url: fullPackUrl,
    fullPackUrl: fullPackUrl,
    published_at: new Date().toISOString(),
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: 'canon/latest.json',
      Body: JSON.stringify(latestManifest, null, 2),
      ContentType: 'application/json',
    })
  );

  return { canonVersion };
}
