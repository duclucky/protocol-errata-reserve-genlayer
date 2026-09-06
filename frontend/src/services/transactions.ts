import type {TxPhase} from '../types';
import {walletError} from './wallet';

export type TransactionState = {
  phase: TxPhase;
  message: string;
  hash?: string;
};

export type TransactionTrackerOptions = {
  pollAttempts?: number;
  pollIntervalMs?: number;
};

function delay(ms: number) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function receiptStatus(receipt: any) {
  const leaderReceipt = receipt?.consensus_data?.leader_receipt?.[0] || {};
  const execution = String(receipt?.executionStatus || receipt?.execution_status || receipt?.txExecutionResultName || receipt?.execution?.status || receipt?.result?.status || '').toUpperCase();
  const leaderExecution = String(leaderReceipt.execution_result || '').toUpperCase();
  const finality = String(receipt?.finality || receipt?.statusName || receipt?.status_name || receipt?.status || '').toUpperCase();
  return {execution: execution || leaderExecution, finality};
}

export class TransactionTracker {
  state: TransactionState = {phase: 'idle', message: 'No transaction submitted.'};
  private listeners = new Set<(state: TransactionState) => void>();
  private pollAttempts: number;
  private pollIntervalMs: number;

  constructor(options: TransactionTrackerOptions = {}) {
    this.pollAttempts = options.pollAttempts ?? 60;
    this.pollIntervalMs = options.pollIntervalMs ?? 5000;
  }

  subscribe(listener: (state: TransactionState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  update(next: TransactionState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  async execute(write: () => Promise<string>, readReceipt: (hash: string) => Promise<any>) {
    let hash: string | undefined;
    try {
      this.update({phase: 'wallet', message: 'Review the transaction in the selected wallet.'});
      hash = await write();
      if (!/^0x[0-9a-fA-F]+$/.test(hash)) throw new Error('Wallet returned an invalid transaction hash.');
      this.update({phase: 'submitted', message: 'Transaction submitted to Studionet.', hash});
      for (let attempt = 0; attempt < this.pollAttempts; attempt += 1) {
        const receipt = await readReceipt(hash);
        const {execution, finality} = receiptStatus(receipt);
        if (execution === 'ERROR' || execution === 'FAILED') throw new Error(receipt?.message || 'Contract execution failed.');
        if (finality.includes('FINAL') || execution === 'SUCCESS') {
          this.update({phase: 'finalized', message: 'Finalized successfully; canonical state reloaded.', hash});
          return hash;
        }
        this.update({phase: 'pending', message: 'Submitted; waiting for finality.', hash});
        if (attempt < this.pollAttempts - 1) await delay(this.pollIntervalMs);
      }
      this.update({phase: 'unknown', message: 'Submitted, but finality is not confirmed yet. Reload canonical state after a short wait.', hash});
      return hash;
    } catch (error) {
      const detail = walletError(error);
      this.update({phase: detail.code === 4001 ? 'rejected' : 'failed', message: detail.message, ...(hash ? {hash} : {})});
      throw error;
    }
  }
}

export const transactions = new TransactionTracker();
