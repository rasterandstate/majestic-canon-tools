/**
 * Ed25519 signing over manifest bytes. Per SIGNING_FLOW.md.
 * Sign exact UTF-8 bytes of manifest.json as written to disk.
 */
import { sign, verify } from 'crypto';

/**
 * Sign manifest bytes with Ed25519 private key (PEM).
 * Returns raw signature bytes.
 */
export function signManifestBytes(manifestBytes: Buffer, privateKeyPem: string): Buffer {
  return sign(null, manifestBytes, privateKeyPem);
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
