/**
 * Ed25519 signing over manifest bytes. Per SIGNING_FLOW.md.
 * Sign exact UTF-8 bytes of manifest.json as written to disk.
 */
import { sign, verify, createPrivateKey } from 'crypto';

/**
 * Sign manifest bytes with Ed25519 private key (PEM).
 * Returns raw signature bytes.
 * Uses createPrivateKey() for robust PEM decoding across OpenSSL versions (avoids ERR_OSSL_UNSUPPORTED in CI).
 */
export function signManifestBytes(manifestBytes: Buffer, privateKeyPem: string): Buffer {
  const key = createPrivateKey({
    key: privateKeyPem,
    format: 'pem',
    type: 'pkcs8',
  });
  return sign(null, manifestBytes, key);
}

/**
 * Verify signature over manifest bytes with Ed25519 public key (PEM).
 */
export function verifyManifestSignature(
  manifestBytes: Buffer,
  signatureBytes: Buffer,
  publicKeyPem: string
): boolean {
  return verify(null, manifestBytes, publicKeyPem, signatureBytes);
}
