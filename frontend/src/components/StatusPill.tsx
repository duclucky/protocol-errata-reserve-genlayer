export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: 'Reserve active',
    OPEN: 'Review open',
    MATERIAL_IMPACT: 'Material impact settled',
    NO_MATERIAL_IMPACT: 'No material impact',
    UNVERIFIABLE: 'Evidence unverifiable',
    IMPACT_SETTLED: 'Material impact settled',
    CLOSED: 'Reserve closed',
  };
  return labels[status] || 'Status unavailable';
}

export function verdictLabel(verdict: string) {
  if (!verdict) return 'Waiting for validator decision';
  return statusLabel(verdict);
}

export function StatusPill({status}: {status: string}) {
  return <span className="status-pill">{statusLabel(status)}</span>;
}
