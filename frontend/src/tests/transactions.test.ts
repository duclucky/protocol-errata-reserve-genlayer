import {describe, expect, it, vi} from 'vitest';
import {TransactionTracker, type TransactionState} from '../services/transactions';

const hash = `0x${'cd'.repeat(32)}`;

describe('transaction tracker', () => {
  it('polls receipt state until finality before resolving', async () => {
    const tracker = new TransactionTracker({pollIntervalMs: 0, pollAttempts: 3});
    const states: TransactionState[] = [];
    tracker.subscribe((state) => states.push(state));
    const readReceipt = vi.fn()
      .mockResolvedValueOnce({status: 'PENDING', execution: {status: 'PENDING'}})
      .mockResolvedValueOnce({status: 'FINALIZED', execution: {status: 'SUCCESS'}});

    await expect(tracker.execute(async () => hash, readReceipt)).resolves.toBe(hash);

    expect(readReceipt).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toMatchObject({
      phase: 'finalized',
      message: 'Finalized successfully; canonical state reloaded.',
      hash,
    });
  });

  it('marks a finalized leader execution error as failed', async () => {
    const tracker = new TransactionTracker({pollIntervalMs: 0, pollAttempts: 1});
    const states: TransactionState[] = [];
    tracker.subscribe((state) => states.push(state));
    const readReceipt = vi.fn().mockResolvedValue({
      status: 7,
      statusName: 'FINALIZED',
      result: 6,
      result_name: 'MAJORITY_AGREE',
      consensus_data: {
        leader_receipt: [{
          execution_result: 'ERROR',
          result: {status: 'rollback', payload: 'errata already credited for reserve'},
        }],
      },
    });

    await expect(tracker.execute(async () => hash, readReceipt)).rejects.toThrow(/Contract execution failed/);
    expect(states.at(-1)).toMatchObject({phase: 'failed', hash});
  });
});
