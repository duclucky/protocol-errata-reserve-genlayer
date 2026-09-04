import type {TxPhase} from '../types';
import {walletError} from './wallet';

export type TransactionState = {
  phase: TxPhase;
  message: string;
  hash?: string;
};

export class TransactionTracker {
  state: TransactionState = {phase: 'idle', message: 'No transaction submitted.'};
  private listeners = new Set<(state: TransactionState) => void>();

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
    try {
      this.update({phase: 'wallet', message: 'Review the transaction in the selected wallet.'});
      const hash = await write();
      if (!/^0x[0-9a-fA-F]+$/.test(hash)) throw new Error('Wallet returned an invalid transaction hash.');
      this.update({phase: 'submitted', message: 'Transaction submitted to Studionet.', hash});
      const receipt = await readReceipt(hash);
      const execution = String(receipt?.executionStatus || receipt?.execution_status || receipt?.execution?.status || receipt?.result?.status || '').toUpperCase();
      const finality = String(receipt?.finality || receipt?.status || '').toUpperCase();
      if (execution === 'ERROR' || execution === 'FAILED') throw new Error(receipt?.message || 'Contract execution failed.');
      const phase: TxPhase = finality.includes('FINAL') || execution === 'SUCCESS' ? 'finalized' : 'pending';
      this.update({phase, message: phase === 'finalized' ? 'Finalized successfully; canonical state reloaded.' : 'Submitted; waiting for finality.', hash});
      return hash;
    } catch (error) {
      const detail = walletError(error);
      this.update({phase: detail.code === 4001 ? 'rejected' : 'failed', message: detail.message});
      throw error;
    }
  }
}

export const transactions = new TransactionTracker();
