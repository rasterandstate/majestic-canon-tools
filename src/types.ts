/**
 * Canon schema loaded from majestic-canon.
 */
export interface CanonSchema {
  version: number;
  identityContract: {
    editionHashVersion: number;
    editionHashAlgorithm: string;
    source: string;
    note?: string;
  };
  overridePrecedence: string[];
}

/**
 * Version manifest produced by build. Written as version.json.
 */
export interface VersionManifest {
  version: number;
  schemaVersion: number;
  builtAt: string;
  fullPackHash?: string;
  deltaFrom?: number;
}
