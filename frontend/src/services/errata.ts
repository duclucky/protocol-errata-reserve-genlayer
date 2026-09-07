export const RFC_EDITOR_ERRATA_URL_PREFIX = 'https://www.rfc-editor.org/errata/eid';

export function canonicalErrataUrl(errataId: string, errataUrl: string): string | null {
  if (!/^[1-9]\d*$/.test(errataId) || !errataUrl.startsWith(RFC_EDITOR_ERRATA_URL_PREFIX)) {
    return null;
  }
  const urlErrataId = errataUrl.slice(RFC_EDITOR_ERRATA_URL_PREFIX.length);
  if (!/^[1-9]\d*$/.test(urlErrataId) || urlErrataId !== errataId) {
    return null;
  }
  return `${RFC_EDITOR_ERRATA_URL_PREFIX}${urlErrataId}`;
}
