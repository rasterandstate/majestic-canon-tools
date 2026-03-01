#!/usr/bin/env npx tsx
/**
 * Build → Sign → Verify → Publish to R2.
 * For dev: uses test key. For prod: run sign separately (external signer) then publish.
 *
 * Usage:
 *   pnpm publish:cdn                    # build, sign (test key), verify, publish
 *   pnpm publish:cdn -- --skip-build     # use existing out/, sign, verify, publish
 *   pnpm publish:cdn -- --skip-sign      # use existing signed out/, verify, publish
 *
 * Env (required for publish):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME         (default: majestic-canon-dist)
 *   R2_CDN_BASE_URL        (e.g. https://cdn.majesticcore.dev/canon)
 */
import { join } from 'path';
import { existsSync } from 'fs';
import { build } from '../src/build.js';
import { verifyManifest } from '../src/manifest.js';
import { publishToR2 } from '../src/publish.js';
import { getCanonPath } from '../src/loadCanon.js';

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const skipSign = args.includes('--skip-sign');

const packRoot = process.env.MAJESTIC_PACK_PATH ?? join(process.cwd(), 'out');
const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucket = process.env.R2_BUCKET_NAME?.trim() || 'majestic-canon-dist';
const cdnBaseUrl = process.env.R2_CDN_BASE_URL?.trim();

if (!accountId || !accessKeyId || !secretAccessKey || !cdnBaseUrl) {
  console.error('Missing R2 credentials. Set: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_CDN_BASE_URL');
  process.exit(1);
}

async function main(): Promise<void> {
  if (!skipBuild) {
    console.log('[publish] Building...');
    const { rmSync } = await import('fs');
    const sigDir = join(packRoot, 'signature');
    if (existsSync(sigDir)) {
      rmSync(sigDir, { recursive: true });
    }
    build({
      canonPath,
      outDir: packRoot,
    });
    console.log('[publish] Build complete');
  }

  if (!skipSign) {
    const manifestPath = join(packRoot, 'manifest.json');
    const sigPath = join(packRoot, 'signature', 'manifest.sig');
    if (!existsSync(manifestPath)) {
      console.error('[publish] manifest.json not found. Run build first.');
      process.exit(1);
    }
    if (!existsSync(sigPath)) {
      console.log('[publish] Signing with test key...');
      const { spawnSync } = await import('child_process');
      const keyPath = join(packRoot, 'test-signing.pem');
      if (!existsSync(keyPath)) {
        console.log('[publish] Generating test keys...');
        spawnSync('pnpm', ['generate-test-keys', '--', packRoot], {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        if (!existsSync(keyPath)) {
          console.error('[publish] Failed to generate test keys');
          process.exit(1);
        }
      }
      const signResult = spawnSync('pnpm', ['sign', '--', packRoot, keyPath], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      if (signResult.status !== 0) {
        process.exit(1);
      }
    }
  }

  const publicKeyPath = process.env.MAJESTIC_SIGNING_PUBLIC_KEY ?? join(packRoot, 'test-signing.pub');
  let publicKeyPem: string | undefined;
  if (existsSync(publicKeyPath)) {
    const { readFileSync } = await import('fs');
    publicKeyPem = readFileSync(publicKeyPath, 'utf-8');
  }

  console.log('[publish] Verifying...');
  const verifyResult = verifyManifest(packRoot, publicKeyPem);
  if (!verifyResult.ok) {
    console.error('[publish] Verification failed:');
    for (const err of verifyResult.errors) {
      console.error('  -', err);
    }
    process.exit(1);
  }
  console.log('[publish] Verification OK');

  console.log('[publish] Uploading to R2...');
  const { canonVersion } = await publishToR2({
    packRoot,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    cdnBaseUrl,
  });
  console.log(`[publish] Published canon_version=${canonVersion}`);
  console.log(`[publish] latest.json: ${cdnBaseUrl.replace(/\/$/, '')}/latest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
