# Majestic Canon Pack Format

**Status:** Draft (freeze before implementing pack generation or applyUpdate)  
**Scope:** Defines the distribution artifact format consumed by canon-updater.

## 1. Goals

- Support atomic, verifiable updates of canon data
- Enable future full and delta packs
- Enable signature verification without trusting transport
- Keep pack format stable and versioned

## 2. Terminology

- **Pack:** A downloadable update artifact containing canon data and metadata.
- **Full pack:** Complete snapshot of canon at a given version.
- **Delta pack:** Changes from version A -> version B (future).

## 3. Pack Directory Layout (logical)

A pack is a single file for transport (recommended: `.zip`), containing:

```
pack/
  manifest.json
  payload/
    canon.json          (or segmented files in future)
  signature/
    manifest.sig        (detached signature)
```

Notes:
- `manifest.json` is always present.
- Signature scope is defined in section 6.

## 4. manifest.json (v1)

Required fields:
- `pack_format_version`: "1"
- `canon_version`: string (e.g., "2026.02.25+<gitsha>" or semver-like)
- `schema_version`: string (canon JSON schema version)
- `identity_version`: string (identity derivation version, e.g., "v1")
- `type`: "full" | "delta"
- `created_at`: ISO 8601 timestamp
- `payload`:
  - `files`: array of
    - `path`: string (relative to pack root)
    - `sha256`: lowercase hex
    - `bytes`: integer
- `requires` (delta only):
  - `from_canon_version`: string

Optional fields:
- `compression`: string (e.g., "zip-store", "zip-deflate")
- `notes`: string (non-normative)

## 5. Payload Content

### v1 recommendation (simple)
- Payload contains one file: `payload/canon.json`
- canon.json contains the canonical data needed by clients:
  - publishers registry
  - region mapping
  - editions (when present)
  - schema and identity versions referenced by manifest

Future evolution:
- Split into multiple files (publishers.json, regions.json, editions/*.json) without changing pack format, only manifest payload list.

## 6. Signature Scope

Signing MUST NOT depend on transport compression or ZIP metadata.

Rule:
- Signature is computed over `manifest.json` bytes exactly as stored in the pack (UTF-8).
- The manifest includes SHA-256 checksums of each payload file.
- Client verifies:
  1) signature(manifest.json)
  2) payload file hashes match manifest

This avoids ambiguity about compressed vs uncompressed signing.

## 7. Version Pointers (CDN-side)

Canonical endpoints (names are illustrative):
- `latest.json` points to the latest available `canon_version` and pack URL(s).
- `packs/<canon_version>/full.zip` is the full pack.

latest.json (v1) fields:
- `canon_version`
- `pack_format_version`
- `schema_version`
- `identity_version`
- `full_pack_url`
- `full_pack_sha256` (sha256 of the transport file, optional but recommended)
- `published_at`

Delta listing (future):
- `deltas`: array of { from_version, url, sha256 }

## 8. Backward Compatibility

- Clients must reject packs with unknown `pack_format_version`.
- Clients may accept newer schema versions only if they have the schema bundled or fetched securely (decision pending).
