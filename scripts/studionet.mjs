import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAccount, createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus} from 'genlayer-js/types';
import {assertSuccessfulExecution, safeReceiptShape, safeReceiptSummary} from './lib/receipt.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_PATH = join(PROJECT_ROOT, 'contracts', 'protocol_errata_reserve.py');
const PROJECT_ENV = join(PROJECT_ROOT, '.env');
const ROOT_ENV = join(PROJECT_ROOT, '..', '.env');
const EVIDENCE_DIR = join(PROJECT_ROOT, 'docs', 'evidence', 'studionet');
const DEPLOYMENT_PATH = join(EVIDENCE_DIR, 'deployment.json');
const PENDING_DEPLOYMENT_PATH = join(EVIDENCE_DIR, 'deployment-pending.json');
const PENDING_LIFECYCLE_PATH = join(EVIDENCE_DIR, 'lifecycle-pending.json');
const GEN = 10n ** 18n;

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const entries = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    entries[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return entries;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function shortError(error) {
  return error instanceof Error ? error.message : String(error);
}

function configPresence() {
  const projectEnv = readEnvFile(PROJECT_ENV);
  const parentEnv = readEnvFile(ROOT_ENV);
  const merged = {...parentEnv, ...projectEnv, ...process.env};
  return {
    rpc: merged.GENLAYER_RPC_URL || merged.VITE_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api',
    hasPrivateKey: Boolean(merged.STUDIONET_PRIVATE_KEY || merged.ACCOUNT_PRIVATE_KEY_1),
    hasContractAddress: Boolean(merged.VITE_CONTRACT_ADDRESS || merged.CONTRACT_ADDRESS),
  };
}

function signers() {
  const merged = {...readEnvFile(ROOT_ENV), ...readEnvFile(PROJECT_ENV), ...process.env};
  const sponsorKey = merged.STUDIONET_PRIVATE_KEY || merged.GENLAYER_PRIVATE_KEY;
  const implementerKey = merged.STUDIONET_INTEGRATOR_PRIVATE_KEY || merged.STUDIONET_PROVIDER_PRIVATE_KEY;
  if (!sponsorKey) throw new Error('Missing STUDIONET_PRIVATE_KEY.');
  if (!implementerKey) throw new Error('Missing STUDIONET_INTEGRATOR_PRIVATE_KEY.');
  return {sponsor: createAccount(sponsorKey), implementer: createAccount(implementerKey)};
}

const clientFor = (account) => createClient({chain: studionet, account});

async function finalizeDeployment({client, hash, contractAddressCandidate, sponsorAddress}) {
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: 5000,
      retries: 120,
      fullTransaction: true,
    });
  } catch (error) {
    const transaction = await client.getTransaction({hash}).catch(() => null);
    writeJson(join(EVIDENCE_DIR, `deployment-wait-${Date.now()}.json`), {
      network: 'studionet',
      chainId: 61999,
      deployTxHash: hash,
      error: shortError(error),
      currentReceipt: transaction ? safeReceiptSummary(transaction) : null,
      currentShape: transaction ? safeReceiptShape(transaction) : null,
      checkedAt: new Date().toISOString(),
    });
    throw error;
  }
  const parsed = assertSuccessfulExecution(receipt, 'deploy');
  const contractAddress = parsed.contractAddress || contractAddressCandidate;
  if (!contractAddress) {
    writeJson(join(EVIDENCE_DIR, `deployment-diagnostic-${Date.now()}.json`), {
      network: 'studionet',
      chainId: 61999,
      deployTxHash: hash,
      deployReceipt: safeReceiptSummary(receipt),
      receiptShape: safeReceiptShape(receipt),
      diagnosedAt: new Date().toISOString(),
    });
    throw new Error('Deployment receipt did not include a contract address.');
  }
  if (existsSync(DEPLOYMENT_PATH)) {
    const archive = join(EVIDENCE_DIR, 'archive', `deployment-${Date.now()}.json`);
    mkdirSync(dirname(archive), {recursive: true});
    copyFileSync(DEPLOYMENT_PATH, archive);
  }
  const record = {
    network: 'studionet',
    chainId: 61999,
    contractName: 'ProtocolErrataReserve',
    contractAddress,
    deployTxHash: hash,
    deployReceipt: safeReceiptSummary(receipt),
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://explorer-studio.genlayer.com/address/${contractAddress}`,
    sponsorAddress,
  };
  writeJson(DEPLOYMENT_PATH, record);
  console.log(JSON.stringify({deployed: true, contractAddress, deployTxHash: hash}, null, 2));
  return contractAddress;
}

async function waitSuccessfulTx(client, hash, label) {
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      interval: 5000,
      retries: 120,
      fullTransaction: true,
    });
    assertSuccessfulExecution(receipt, label);
    return receipt;
  } catch (error) {
    const transaction = await client.getTransaction({hash}).catch(() => null);
    writeJson(join(EVIDENCE_DIR, `${label}-wait-${Date.now()}.json`), {
      network: 'studionet',
      chainId: 61999,
      txHash: hash,
      label,
      error: shortError(error),
      currentReceipt: transaction ? safeReceiptSummary(transaction) : null,
      currentShape: transaction ? safeReceiptShape(transaction) : null,
      checkedAt: new Date().toISOString(),
    });
    throw error;
  }
}

async function readCanonicalState(client, address) {
  const [reservesJson, reviewsJson, accountingJson] = await Promise.all([
    client.readContract({address, functionName: 'get_all_reserves', args: []}),
    client.readContract({address, functionName: 'get_all_reviews', args: []}),
    client.readContract({address, functionName: 'get_accounting', args: []}),
  ]);
  return {
    reserves: JSON.parse(reservesJson),
    reviews: JSON.parse(reviewsJson),
    accounting: JSON.parse(accountingJson),
  };
}

async function deploy() {
  const {sponsor} = signers();
  const client = clientFor(sponsor);
  const code = readFileSync(CONTRACT_PATH, 'utf8');
  const deployResult = await client.deployContract({account: sponsor, code, args: []});
  const hash = typeof deployResult === 'string'
    ? deployResult
    : deployResult.hash || deployResult.transactionHash || deployResult.transaction_hash || deployResult.txHash;
  if (!hash) {
    throw new Error('Deploy did not return a transaction hash.');
  }
  const immediateContractAddress = typeof deployResult === 'object'
    ? deployResult.contractAddress || deployResult.contract_address || null
    : null;
  writeJson(PENDING_DEPLOYMENT_PATH, {
    network: 'studionet',
    chainId: 61999,
    contractName: 'ProtocolErrataReserve',
    deployTxHash: hash,
    submittedAt: new Date().toISOString(),
    sponsorAddress: sponsor.address,
    contractAddressCandidate: immediateContractAddress,
  });
  return finalizeDeployment({
    client,
    hash,
    contractAddressCandidate: immediateContractAddress,
    sponsorAddress: sponsor.address,
  });
}

async function waitDeploy() {
  const {sponsor} = signers();
  const pending = readJson(PENDING_DEPLOYMENT_PATH);
  if (!pending?.deployTxHash) throw new Error('No deployment-pending.json with deployTxHash.');
  return finalizeDeployment({
    client: clientFor(sponsor),
    hash: pending.deployTxHash,
    contractAddressCandidate: pending.contractAddressCandidate,
    sponsorAddress: pending.sponsorAddress || sponsor.address,
  });
}

async function lifecycle() {
  const {sponsor, implementer} = signers();
  const sponsorClient = clientFor(sponsor);
  const implementerClient = clientFor(implementer);
  const deployment = readJson(DEPLOYMENT_PATH);
  if (!deployment?.contractAddress) throw new Error('No verified deployment.json. Run deploy first.');
  const address = deployment.contractAddress;
  const suffix = Date.now().toString(36);
  const reserveId = `reserve-rfc2865-${suffix}`;
  const reviewId = `review-9034-${suffix}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 86400;

  const pending = {
    network: 'studionet',
    chainId: 61999,
    contractAddress: address,
    reserveId,
    reviewId,
    startedAt: new Date().toISOString(),
  };
  writeJson(PENDING_LIFECYCLE_PATH, pending);

  const createTx = await sponsorClient.writeContract({
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
  writeJson(PENDING_LIFECYCLE_PATH, pending);
  const createReceipt = await waitSuccessfulTx(sponsorClient, createTx, 'create_reserve');

  const openTx = await implementerClient.writeContract({
    address,
    functionName: 'open_review',
    args: [reviewId, reserveId, '9034', 'https://www.rfc-editor.org/errata/eid9034'],
  });
  pending.openReviewTx = openTx;
  writeJson(PENDING_LIFECYCLE_PATH, pending);
  const openReceipt = await waitSuccessfulTx(implementerClient, openTx, 'open_review');

  const adjudicateTx = await sponsorClient.writeContract({address, functionName: 'adjudicate_review', args: [reviewId]});
  pending.adjudicateTx = adjudicateTx;
  writeJson(PENDING_LIFECYCLE_PATH, pending);
  const adjudicateReceipt = await waitSuccessfulTx(sponsorClient, adjudicateTx, 'adjudicate_review');

  const reserveJson = await sponsorClient.readContract({address, functionName: 'get_reserve', args: [reserveId]});
  const reviewJson = await sponsorClient.readContract({address, functionName: 'get_review', args: [reviewId]});
  const implementerCredits = await sponsorClient.readContract({address, functionName: 'get_credits', args: [implementer.address]});
  const accountingJson = await sponsorClient.readContract({address, functionName: 'get_accounting', args: []});

  const record = {
    reserveId,
    reviewId,
    createReserveTx: createTx,
    openReviewTx: openTx,
    adjudicateTx,
    createReceipt: safeReceiptSummary(createReceipt),
    openReceipt: safeReceiptSummary(openReceipt),
    adjudicateReceipt: safeReceiptSummary(adjudicateReceipt),
    finalReserve: JSON.parse(reserveJson),
    finalReview: JSON.parse(reviewJson),
    implementerCredits,
    finalAccounting: JSON.parse(accountingJson),
    executedAt: new Date().toISOString(),
  };
  deployment.lifecycle = record;
  writeJson(DEPLOYMENT_PATH, deployment);
  console.log(JSON.stringify({lifecycle: true, reserveId, reviewId, verdict: record.finalReview.verdict, implementerCredits}, null, 2));
}

async function waitTransaction(hash, label = 'transaction') {
  const {sponsor} = signers();
  const receipt = await waitSuccessfulTx(clientFor(sponsor), hash, label);
  console.log(JSON.stringify({finalized: true, txHash: hash, receipt: safeReceiptSummary(receipt)}, null, 2));
}

async function state() {
  const {sponsor} = signers();
  const deployment = readJson(DEPLOYMENT_PATH);
  if (!deployment?.contractAddress) throw new Error('No verified deployment.json. Run deploy first.');
  const snapshot = await readCanonicalState(clientFor(sponsor), deployment.contractAddress);
  writeJson(join(EVIDENCE_DIR, `state-${Date.now()}.json`), {
    network: 'studionet',
    chainId: 61999,
    contractAddress: deployment.contractAddress,
    ...snapshot,
    readAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({
    contractAddress: deployment.contractAddress,
    reserves: snapshot.reserves.length,
    reviews: snapshot.reviews.length,
    accounting: snapshot.accounting,
  }, null, 2));
}

export async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'inspect';
  const cfg = configPresence();
  if (command === 'inspect') {
    console.log(JSON.stringify({
      network: 'studionet',
      chainId: 61999,
      rpc: cfg.rpc,
      hasPrivateKey: cfg.hasPrivateKey,
      hasContractAddress: cfg.hasContractAddress,
    }, null, 2));
    return 0;
  }
  if (command === 'deploy') {
    await deploy();
    return 0;
  }
  if (command === 'wait-deploy') {
    await waitDeploy();
    return 0;
  }
  if (command === 'lifecycle') {
    await lifecycle();
    return 0;
  }
  if (command === 'wait-tx') {
    if (!argv[1]) throw new Error('Usage: node scripts/studionet.mjs wait-tx <hash> [label]');
    await waitTransaction(argv[1], argv[2] || 'transaction');
    return 0;
  }
  if (command === 'state') {
    await state();
    return 0;
  }
  console.error(`Unknown command: ${command}`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
