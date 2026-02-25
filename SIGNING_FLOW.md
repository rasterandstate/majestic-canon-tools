# Majestic Canon Signing Flow

**Status:** Draft  
**Principle:** Build ≠ Sign. Signing keys must never enter the build repo or CI build environment.

## 1. Goals

- Ensure packs are authentic and untampered
- Keep signing keys isolated
- Minimize trusted surface area
- Support repeatable, deterministic artifacts

## 2. Actors

- **canon-tools (builder):** Produces unsigned pack(s) and manifests.
- **signer (isolated):** Signs manifest(s) using private key.
- **publisher:** Uploads signed packs + latest.json to CDN (R2).
- **canon-updater (client):** Fetches latest.json, downloads pack, verifies, applies atomically.

## 3. High-Level Flow

1. Build
   - canon-tools validates canon input
   - produces unsigned pack transport file (e.g., full.zip)
   - produces manifest.json inside pack
   - outputs build metadata (canon_version, schema_version, pack sha256)

2. Sign (isolated)
   - signer extracts manifest.json bytes
   - signer computes detached signature over manifest.json
   - signer inserts signature file into pack (or publishes signature alongside pack)
   - signer outputs signed pack checksum

3. Publish
   - publisher uploads signed pack to R2
   - publisher writes/updates latest.json referencing the new pack

4. Consume
   - canon-updater fetches latest.json
   - downloads pack
   - verifies signature of manifest
   - verifies payload hashes match manifest
   - applies update atomically

## 4. Key Handling Requirements

- Private key must never be in:
  - canon-tools repo
  - canon repo
  - CI logs or environment variables accessible to CI jobs
- Signing must run in:
  - offline environment OR
  - hardened signer service with minimal API surface

Public key distribution:
- Public key(s) are bundled with canon-updater or majestic-server.
- Key rotation requires supporting multiple public keys and pinning by key id.

## 5. Signature Algorithm (placeholder)

- Algorithm: TBD (e.g., Ed25519 recommended for simplicity)
- Signature format: raw bytes or base64, stored as `signature/manifest.sig`
- manifest must include `signing_key_id` if multiple keys are supported.

## 6. Determinism Requirements

- canon-tools must produce deterministic payload file bytes for the same input.
- ZIP creation must be deterministic if transport hashing is used:
  - fixed timestamps
  - stable file order
  - stable compression settings

If deterministic ZIP is hard, do not rely on ZIP sha256 for integrity.
Integrity is provided by:
- signature(manifest.json)
- payload hashes declared inside manifest

## 7. Failure Modes and Required Behavior

- If signature verification fails: reject update, keep existing canon.
- If payload hash mismatch: reject update, keep existing canon.
- If apply fails mid-flight: rollback via atomic swap strategy.
- Never partially apply.

## 8. Auditability

- Each published pack must be traceable to:
  - canon_version
  - git commit(s) of canon and tools used
  - published_at timestamp
  - signer key id
