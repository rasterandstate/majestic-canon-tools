# Golden fixtures

`expectedCanon.json` is the canonical payload snapshot. Tests assert byte equality.

**When to update:** When canon source changes (publishers, regions, editions). The diff will be visible in PRs.

**Never:** Add timestamps, build metadata, or non-deterministic data to the payload.
