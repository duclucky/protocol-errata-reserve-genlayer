const statuses = ['UNINITIALIZED', 'PENDING', 'PROPOSING', 'COMMITTING', 'REVEALING', 'ACCEPTED', 'UNDETERMINED', 'FINALIZED', 'CANCELED', 'APPEAL_REVEALING', 'APPEAL_COMMITTING', 'READY_TO_FINALIZE', 'VALIDATORS_TIMEOUT', 'LEADER_TIMEOUT'];
const upper = (value) => typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'UNKNOWN';
const statusName = (value) => typeof value === 'number' ? (statuses[value] || String(value)) : upper(value);

export function parseReceipt(raw = {}) {
  const leader = raw.consensus_data?.leader_receipt?.[0] || {};
  const hash = raw.hash || raw.transactionHash || raw.transaction_hash || raw.txHash || null;
  const finality = statusName(raw.finality || raw.statusName || raw.status || raw.transaction_status || raw.result?.finality);
  const candidates = [
    leader.execution_result,
    raw.txExecutionResultName,
    raw.executionStatus,
    raw.execution_status,
    raw.execution?.status,
    raw.result?.execution_status,
    raw.result?.executionStatus,
    typeof raw.result === 'string' ? raw.result : raw.result?.status,
  ].filter(Boolean);
  const failure = candidates.find((value) => ['ERROR', 'FAILED', 'FAILURE', 'REVERTED', 'FINISHED_WITH_ERROR'].includes(upper(value)));
  const success = candidates.find((value) => ['SUCCESS', 'SUCCESSFUL', 'SUCCEEDED', 'FINISHED_WITH_RETURN'].includes(upper(value)));
  const executionStatus = upper(
    failure || success || candidates[0],
  );
  const consensus = upper(raw.consensus || raw.consensusStatus || raw.consensus_status || raw.result?.consensus);

  return {
    hash,
    finality,
    executionStatus,
    consensus,
    contractAddress:
      raw.contractAddress ||
      raw.contract_address ||
      raw.to ||
      raw.result?.contractAddress ||
      raw.result?.contract_address ||
      raw.data?.contractAddress ||
      raw.data?.contract_address ||
      raw.consensus_data?.contractAddress ||
      raw.consensus_data?.contract_address ||
      leader.contractAddress ||
      leader.contract_address ||
      leader.to ||
      null,
    success: Boolean(success && !failure),
    failed: Boolean(failure),
  };
}

export function isExecutionSuccess(receipt) {
  const parsed = receipt?.executionStatus ? receipt : parseReceipt(receipt);
  return parsed.success || parsed.executionStatus === 'SUCCESS' || parsed.executionStatus === 'SUCCEEDED' || parsed.executionStatus === 'FINISHED_WITH_RETURN';
}

export function assertSuccessfulExecution(raw, label = 'tx') {
  const parsed = parseReceipt(raw);
  if (parsed.finality !== 'FINALIZED' || !isExecutionSuccess(parsed) || parsed.failed) {
    throw new Error(`${label} did not finalize with successful contract execution`);
  }
  return parsed;
}

export function safeReceiptSummary(raw = {}) {
  const receipt = parseReceipt(raw);
  return {
    hash: receipt.hash,
    finality: receipt.finality,
    executionStatus: receipt.executionStatus,
    consensus: receipt.consensus,
    contractAddress: receipt.contractAddress,
  };
}

export function safeReceiptShape(raw = {}) {
  const leader = raw.consensus_data?.leader_receipt?.[0] || {};
  return {
    topLevelKeys: Object.keys(raw).sort(),
    resultKeys: raw.result && typeof raw.result === 'object' ? Object.keys(raw.result).sort() : [],
    dataKeys: raw.data && typeof raw.data === 'object' ? Object.keys(raw.data).sort() : [],
    consensusDataKeys: raw.consensus_data && typeof raw.consensus_data === 'object' ? Object.keys(raw.consensus_data).sort() : [],
    leaderKeys: Object.keys(leader).sort(),
    candidateAddressFields: {
      hasContractAddress: Boolean(raw.contractAddress),
      hasContractUnderscoreAddress: Boolean(raw.contract_address),
      hasTo: Boolean(raw.to),
      hasResultContractAddress: Boolean(raw.result?.contractAddress || raw.result?.contract_address),
      hasDataContractAddress: Boolean(raw.data?.contractAddress || raw.data?.contract_address),
      hasConsensusContractAddress: Boolean(raw.consensus_data?.contractAddress || raw.consensus_data?.contract_address),
      hasLeaderContractAddress: Boolean(leader.contractAddress || leader.contract_address || leader.to),
    },
  };
}
