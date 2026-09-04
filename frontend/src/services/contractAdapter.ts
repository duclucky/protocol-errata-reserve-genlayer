import {createClient} from 'genlayer-js';
import {TransactionHashVariant, TransactionStatus} from 'genlayer-js/types';
import type {Accounting, Reserve, Review} from '../types';
import {CONTRACT_ADDRESS, ensureChain, genAmount, rpcChain, validAddress, verifyAccount, type Eip1193Provider} from './wallet';
import {transactions, type TransactionTracker} from './transactions';

function parseJson<T>(raw: unknown, label: string): T {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') throw new Error(`Contract returned malformed ${label}.`);
  return parsed as T;
}

export function parseList<T>(raw: unknown, label: string): T[] {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) throw new Error(`Contract returned unexpected ${label}.`);
  return parsed as T[];
}

export class ContractAdapter {
  private readClient: any;
  private walletClient: any;

  constructor(
    private account = '',
    private provider: Eip1193Provider | null = null,
    private tracker: TransactionTracker = transactions,
    private contractAddress = CONTRACT_ADDRESS,
  ) {
    this.readClient = createClient({chain: rpcChain()});
    if (account && provider) this.walletClient = createClient({chain: rpcChain(), account: account as `0x${string}`, provider});
  }

  private requireContract() {
    if (!this.contractAddress) throw new Error('GenLayer contract address is not configured.');
    validAddress(this.contractAddress, 'Contract address');
  }

  async getReserves() {
    this.requireContract();
    const raw = await this.readClient.readContract({address: this.contractAddress, functionName: 'get_all_reserves', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
    return parseList<Reserve>(raw, 'reserves');
  }

  async getReviews() {
    this.requireContract();
    const raw = await this.readClient.readContract({address: this.contractAddress, functionName: 'get_all_reviews', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
    return parseList<Review>(raw, 'reviews');
  }

  async getAccounting() {
    this.requireContract();
    const raw = await this.readClient.readContract({address: this.contractAddress, functionName: 'get_accounting', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
    return parseJson<Accounting>(raw, 'accounting');
  }

  async getCredits(address: string) {
    this.requireContract();
    validAddress(address, 'Wallet address');
    const raw = await this.readClient.readContract({address: this.contractAddress, functionName: 'get_credits', args: [address], transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
    if (typeof raw !== 'string' || !/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(raw)) throw new Error('Contract returned malformed credits.');
    return raw;
  }

  private async write(functionName: string, args: unknown[], value?: bigint) {
    this.requireContract();
    if (!this.walletClient || !this.provider || !this.account) throw new Error('Connect a compatible wallet before submitting this transaction.');
    validAddress(this.account, 'Selected wallet');
    await verifyAccount(this.provider, this.account);
    await ensureChain(this.provider);
    const hash = await this.tracker.execute(
      () => this.walletClient.writeContract({address: this.contractAddress, functionName, args, ...(value === undefined ? {} : {value})}),
      (txHash) => this.readClient.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        interval: 5000,
        retries: 60,
        fullTransaction: true,
      }),
    );
    return hash;
  }

  async createReserve(input: {implementer: string; rfcId: string; section: string; claim: string; claimVersion: string; expiresAt: number}) {
    validAddress(input.implementer, 'Implementer');
    const id = `reserve-${input.rfcId.toLowerCase()}-${Date.now()}`;
    const hash = await this.write('create_reserve', [id, input.implementer, input.rfcId, input.section, input.claim, input.claimVersion, input.expiresAt], genAmount('2', '2'));
    return {id, hash};
  }

  async openReview(input: {reserveId: string; errataId: string; errataUrl: string}) {
    const hash = await this.write('open_review', [`review-${input.errataId}-${Date.now()}`, input.reserveId, input.errataId, input.errataUrl]);
    return {hash};
  }

  async adjudicate(reviewId: string) {
    return this.write('adjudicate_review', [reviewId]);
  }

  async closeReserve(reserveId: string) {
    return this.write('close_reserve', [reserveId]);
  }

  async withdrawCredits() {
    return this.write('withdraw_credits', []);
  }
}
