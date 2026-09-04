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
});
