# majestic-canon-tools

Build and packaging system for the Majestic Canonical Dataset. Validation, diffing, pack generation, and signing orchestration.

## Purpose

Layer 2 of the canon architecture. Pulls from majestic-canon, validates integrity, generates full and delta packs, produces version manifests, and orchestrates signing. **The build system must not equal the source repo.** The signing key must not live in the source repo.

## Responsibilities

- **Validation**: Integrity checks on canonical data before build
- **Diffing**: Delta generation from previous version
- **Pack generation**: Full pack and delta pack creation
- **Manifest production**: version.json, changelog, migration manifest
- **Signing orchestration**: Coordinates with separate signer (key never in this repo)
- **CDN upload**: Uploads signed artifacts to distribution channel

## Non-Responsibilities

- **Canonical data**: Lives in majestic-canon
- **Signing key custody**: Key lives outside build system
- **Client-side updates**: Handled by majestic-canon-updater
- **Distribution protocol**: CDN (R2), not GitHub releases

## Architecture

| Component | Access |
|-----------|--------|
| majestic-canon | Read access for build |
| Build system | Artifact creation |
| Signing system | Minimal surface area, separate process |

Separation is institutional maturity. Build ≠ Sign.

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Specs (freeze before pack generation)

- **[PACK_FORMAT.md](./PACK_FORMAT.md)** — Distribution artifact format, manifest, signature scope
- **[SIGNING_FLOW.md](./SIGNING_FLOW.md)** — Build → sign → publish flow; key isolation

## Publish to CDN

Automated publish to Cloudflare R2:

```bash
pnpm publish:cdn
```

Requires env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_CDN_BASE_URL`. Optional: `R2_BUCKET_NAME` (default: `majestic-canon-dist`).

For CI: add GitHub repo secrets. See [.github/workflows/publish-cdn.yml](.github/workflows/publish-cdn.yml). Also add `MAJESTIC_SIGNING_PRIVATE_KEY` and `MAJESTIC_SIGNING_PUBLIC_KEY` (from `pnpm generate-test-keys`).

## Dependencies

- **majestic-canon**: Source data (read-only during build)
