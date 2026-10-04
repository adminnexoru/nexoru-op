// T022: versions of the Estándar de Proyecto Nexoru this dashboard can evaluate (constitution XIV).

export const SUPPORTED_STANDARD_VERSIONS = ["1.0", "1.1", "1.2"] as const;

export function isSupportedVersion(version: string): boolean {
  return (SUPPORTED_STANDARD_VERSIONS as readonly string[]).includes(version);
}

/** First `## [X.Y.Z]` heading of nexoru-governance/CHANGELOG.md, reduced to "X.Y" (research R5). */
export function parseChangelogVersion(text: string): string | null {
  const match = text.match(/^## \[(\d+)\.(\d+)\.\d+\]/m);
  return match ? `${match[1]}.${match[2]}` : null;
}

function compare(a: string, b: string): number {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

/** True when the standard found on disk is newer than every supported version (FR-027). */
export function isNewerThanSupported(version: string): boolean {
  return SUPPORTED_STANDARD_VERSIONS.every((supported) => compare(version, supported) > 0);
}

/**
 * Phase 4 (FR-028): informative notice for a project that declares a supported version older than
 * the newest one. Not a finding; it changes neither the level nor Conformidad.
 */
export function newerStandardNotice(declared: string): string | null {
  const newest = SUPPORTED_STANDARD_VERSIONS[SUPPORTED_STANDARD_VERSIONS.length - 1];
  if (!isSupportedVersion(declared) || compare(declared, newest) >= 0) return null;
  return `hay una versión más nueva del estándar (${newest}) con reglas más estrictas de CI y visibilidad`;
}
