import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAccount, createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus} from 'genlayer-js/types';
import {safeReceiptSummary} from './lib/receipt.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(PROJECT_ROOT, 'docs', 'evidence', 'studionet');
const DEPLOYMENT_PATH = join(EVIDENCE_DIR, 'deployment.json');
const PENDING_PATH = join(EVIDENCE_DIR, 'errata-identity-proof-pending.json');
const GEN = 10n ** 18n;
const OLD_CONTRACT = '0x0fe3043e4A3e17dB8BE5424aB95Cc5e2fa4AcBCe';
const EXPECTED_ERROR = 'review requires exact RFC Editor errata ID and URL';
const DUPLICATE_ERROR = 'errata already credited for reserve';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const entries = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const separator = trimmed.indexOf('=');
    entries[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return entries;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function recoverAfterInvalidSnapshot(pending) {
  const files = readdirSync(EVIDENCE_DIR).filter((name) => /^state-\d+\.json$/.test(name)).sort().reverse();
  for (const name of files) {
    const state = readJson(join(EVIDENCE_DIR, name));
    const reserve = state.reserves?.find((item) => item.reserve_id === pending.reserveId);
    if (state.network === 'studionet' && state.chainId === 61999 && state.contractAddress === pending.contractAddress && reserve?.status === 'ACTIVE' && reserve.review_count === 0 && reserve.reserve_balance_gen === '2.00') {
      return {
        reserveCount: state.reserves.length,
        reviewCount: state.reviews.length,
        reserve,
        reviews: state.reviews,
        implementerCredits: pending.beforeAttack?.implementerCredits,
        accounting: state.accounting,
      };
    }
  }
  return null;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function signers() {
  const merged = {
    ...readEnvFile(join(PROJECT_ROOT, '..', '.env')),
    ...readEnvFile(join(PROJECT_ROOT, '.env')),
    ...process.env,
  };
  const sponsorKey = merged.STUDIONET_PRIVATE_KEY || merged.GENLAYER_PRIVATE_KEY;
  const implementerKey = merged.STUDIONET_INTEGRATOR_PRIVATE_KEY || merged.STUDIONET_PROVIDER_PRIVATE_KEY;
  if (!sponsorKey || !implementerKey) throw new Error('Missing configured Studionet signer.');
  return {
    sponsor: createAccount(sponsorKey),
    implementer: createAccount(implementerKey),
  };
}

function clientFor(account) {
  return createClient({chain: studionet, account});
}

function containsExpectedError(value, expectedError) {
  if (typeof value === 'string') {
    if (value.includes(expectedError)) return true;
    try {
      return Buffer.from(value, 'base64').toString('utf8').includes(expectedError);
    } catch {
      return false;
    }
  }
  if (Array.isArray(value)) return value.some((item) => containsExpectedError(item, expectedError));
  if (value && typeof value === 'object') return Object.values(value).some((item) => containsExpectedError(item, expectedError));
  return false;
}

async function waitForFinalized(client, hash, label, expectedError = '') {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
    fullTransaction: true,
  });
  const summary = safeReceiptSummary(receipt);
  if (summary.finality !== 'FINALIZED') throw new Error(`${label} did not reach FINALIZED.`);
  if (expectedError) {
    const transaction = await client.getTransaction({hash});
    const errorMatched = containsExpectedError(receipt, expectedError) || containsExpectedError(transaction, expectedError);
    if (summary.executionStatus !== 'ERROR' || !errorMatched) {
      throw new Error(`${label} did not finalize with the expected public contract error.`);
    }
    return {summary, expectedError, errorMatched};
  }
  if (summary.executionStatus !== 'SUCCESS') throw new Error(`${label} did not finalize with successful execution.`);
  return summary;
}

async function readCanonicalState(client, address, reserveId, implementerAddress) {
  const [reservesJson, reviewsJson, accountingJson, credits] = await Promise.all([
    client.readContract({address, functionName: 'get_all_reserves', args: []}),
    client.readContract({address, functionName: 'get_all_reviews', args: []}),
    client.readContract({address, functionName: 'get_accounting', args: []}),
    client.readContract({address, functionName: 'get_credits', args: [implementerAddress]}),
  ]);
  const reserves = JSON.parse(reservesJson);
  const reviews = JSON.parse(reviewsJson);
  return {
    reserveCount: reserves.length,
    reviewCount: reviews.length,
    reserve: reserves.find((item) => item.reserve_id === reserveId) || null,
    reviews,
    implementerCredits: credits,
    accounting: JSON.parse(accountingJson),
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableJson(item)]));
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

function addGen(value) {
  const [whole, fraction = '00'] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')) + 100n;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

async function main() {
  const deployment = readJson(DEPLOYMENT_PATH);
  const address = deployment.contractAddress;
  if (!address || address.toLowerCase() === OLD_CONTRACT.toLowerCase()) {
    throw new Error('Refusing proof against the superseded broken contract.');
  }
  const {sponsor, implementer} = signers();
  const sponsorClient = clientFor(sponsor);
  const implementerClient = clientFor(implementer);
  const suffix = Date.now().toString(36);
  const generatedReserveId = `reserve-rfc2865-identity-proof-${suffix}`;
  const generatedInvalidReviewId = `review-eid903-prefix-${suffix}`;
  const generatedValidReviewId = `review-eid9034-proof-${suffix}`;
  const generatedDuplicateReviewId = `review-eid9034-repeat-${suffix}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 86400;
  const savedPending = existsSync(PENDING_PATH) ? readJson(PENDING_PATH) : null;
  const resumable = savedPending?.network === 'studionet' && savedPending?.chainId === 61999 && savedPending?.contractAddress === address && savedPending?.reserveId;
  if (resumable && savedPending.invalidOpenReviewTx && !savedPending.beforeAttack) {
    throw new Error('Cannot reconstruct the pre-attack snapshot from a partially completed proof; use the saved transaction hashes for diagnosis.');
  }
  const pending = resumable
    ? savedPending
    : {network: 'studionet', chainId: 61999, contractAddress: address, reserveId: generatedReserveId, invalidReviewId: generatedInvalidReviewId, validReviewId: generatedValidReviewId, duplicateReviewId: generatedDuplicateReviewId, startedAt: new Date().toISOString()};
  const reserveId = pending.reserveId;
  const invalidReviewId = pending.invalidReviewId;
  const validReviewId = pending.validReviewId;
  const duplicateReviewId = pending.duplicateReviewId;
  writeJson(PENDING_PATH, pending);

  let createTx = pending.createReserveTx;
  let createReceipt;
  if (createTx) {
    createReceipt = await waitForFinalized(sponsorClient, createTx, 'create_reserve');
  } else {
    createTx = await sponsorClient.writeContract({
      address,
      functionName: 'create_reserve',
      args: [
        reserveId,
        implementer.address,
        'RFC2865',
        '4.1',
        'Implementation accepts Access-Request packets from valid RADIUS clients without requiring Message-Authenticator.',
        'claim-v1',
        expiresAt,
      ],
      value: 2n * GEN,
    });
    pending.createReserveTx = createTx;
    writeJson(PENDING_PATH, pending);
    createReceipt = await waitForFinalized(sponsorClient, createTx, 'create_reserve');
  }
  const beforeAttack = pending.beforeAttack || await readCanonicalState(sponsorClient, address, reserveId, implementer.address);
  if (!pending.beforeAttack) {
    pending.beforeAttack = beforeAttack;
    writeJson(PENDING_PATH, pending);
  }

  let invalidTx = pending.invalidOpenReviewTx;
  if (!invalidTx) {
    invalidTx = await implementerClient.writeContract({
      address,
      functionName: 'open_review',
      args: [invalidReviewId, reserveId, '903', 'https://www.rfc-editor.org/errata/eid9034'],
    });
    pending.invalidOpenReviewTx = invalidTx;
    writeJson(PENDING_PATH, pending);
  }
  const invalidReceipt = await waitForFinalized(implementerClient, invalidTx, 'prefix-mismatched open_review', EXPECTED_ERROR);
  const afterInvalidAttack = pending.afterInvalidAttack || recoverAfterInvalidSnapshot(pending) || await readCanonicalState(sponsorClient, address, reserveId, implementer.address);
  if (!pending.afterInvalidAttack) {
    pending.afterInvalidAttack = afterInvalidAttack;
    writeJson(PENDING_PATH, pending);
  }

  let validTx = pending.validOpenReviewTx;
  if (!validTx) {
    validTx = await implementerClient.writeContract({
      address,
      functionName: 'open_review',
      args: [validReviewId, reserveId, '9034', 'https://www.rfc-editor.org/errata/eid9034'],
    });
    pending.validOpenReviewTx = validTx;
    writeJson(PENDING_PATH, pending);
  }
  const validReceipt = await waitForFinalized(implementerClient, validTx, 'valid open_review');

  let adjudicateTx = pending.adjudicateTx;
  if (!adjudicateTx) {
    adjudicateTx = await sponsorClient.writeContract({address, functionName: 'adjudicate_review', args: [validReviewId]});
    pending.adjudicateTx = adjudicateTx;
    writeJson(PENDING_PATH, pending);
  }
  const adjudicateReceipt = await waitForFinalized(sponsorClient, adjudicateTx, 'adjudicate_review');
  const afterSettlement = await readCanonicalState(sponsorClient, address, reserveId, implementer.address);

  let duplicateTx = pending.duplicateOpenReviewTx;
  if (!duplicateTx) {
    duplicateTx = await implementerClient.writeContract({
      address,
      functionName: 'open_review',
      args: [duplicateReviewId, reserveId, '9034', 'https://www.rfc-editor.org/errata/eid9034'],
    });
    pending.duplicateOpenReviewTx = duplicateTx;
    writeJson(PENDING_PATH, pending);
  }
  const duplicateReceipt = await waitForFinalized(implementerClient, duplicateTx, 'duplicate open_review', DUPLICATE_ERROR);
  const afterDuplicateAttempt = await readCanonicalState(sponsorClient, address, reserveId, implementer.address);

  if (duplicateReceipt.summary.executionStatus !== 'ERROR') throw new Error('Duplicate evidence was not rejected.');
  const evidence = {
    network: 'studionet',
    chainId: 61999,
    contractAddress: address,
    sourceCommit: deployment.sourceCommit,
    reserveId,
    reviewIds: {invalidReviewId, validReviewId, duplicateReviewId},
    transactions: {
      createReserve: createReceipt,
      invalidOpenReview: invalidReceipt,
      validOpenReview: validReceipt,
      adjudicate: adjudicateReceipt,
      duplicateOpenReview: duplicateReceipt,
    },
    beforeAttack,
    afterInvalidAttack,
    afterSettlement,
    afterDuplicateAttempt,
    checks: {
      freshReserveBeforeAttack: beforeAttack.reserve?.status === 'ACTIVE' && beforeAttack.reserve?.review_count === 0 && beforeAttack.reserve?.reserve_balance_gen === '2.00',
      invalidAttackUnchanged: sameJson(beforeAttack, afterInvalidAttack),
      oneMaterialCredit: afterSettlement.reserve?.reserve_balance_gen === '1.00' && afterSettlement.reserve?.review_count === 1 && afterSettlement.implementerCredits === addGen(beforeAttack.implementerCredits),
      duplicateReviewNotCreated: sameJson(afterSettlement, afterDuplicateAttempt),
      balancedAfterDuplicate: afterDuplicateAttempt.accounting.balanced === true && afterDuplicateAttempt.accounting.accounted_total_gen === beforeAttack.accounting.total_received_gen,
    },
    verifiedAt: new Date().toISOString(),
  };
  if (!Object.values(evidence.checks).every(Boolean)) throw new Error('One or more canonical proof checks failed.');
  const evidencePath = join(EVIDENCE_DIR, `errata-identity-proof-${Date.now()}.json`);
  writeJson(evidencePath, evidence);
  console.log(JSON.stringify({
    proof: true,
    contractAddress: address,
    reserveId,
    invalidExecution: invalidReceipt.summary.executionStatus,
    invalidError: invalidReceipt.expectedError,
    validVerdict: afterSettlement.reviews.find((review) => review.review_id === validReviewId)?.verdict,
    duplicateExecution: duplicateReceipt.summary.executionStatus,
    finalAccounting: afterDuplicateAttempt.accounting,
    evidenceFile: evidencePath.replace(`${PROJECT_ROOT}\\`, ''),
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
