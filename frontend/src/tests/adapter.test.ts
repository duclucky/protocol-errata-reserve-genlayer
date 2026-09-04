import {describe, expect, it, vi} from 'vitest';
import {ContractAdapter, parseList} from '../services/contractAdapter';
import {TransactionTracker} from '../services/transactions';
import {STUDIONET_CHAIN_ID} from '../services/wallet';

const account = '0x1111111111111111111111111111111111111111';
const contract = '0x2222222222222222222222222222222222222222';
const hash = `0x${'ab'.repeat(32)}`;

function adapterFixture() {
  const provider = {request: vi.fn(async ({method}: {method: string}) => method === 'eth_accounts' ? [account] : STUDIONET_CHAIN_ID)};
  const tracker = new TransactionTracker();
  const adapter = new ContractAdapter(account, provider, tracker, contract);
  const writeContract = vi.fn(async () => hash);
  const readContract = vi.fn(async () => '[]');
  const getTransaction = vi.fn(async () => ({status: 'FINALIZED', execution: {status: 'SUCCESS'}}));
  Object.assign(adapter as any, {walletClient: {writeContract}, readClient: {readContract, getTransaction}});
  return {adapter, writeContract, readContract};
}

describe('contract adapter', () => {
  it('throws when contract address is not configured instead of showing fake data', async () => {
    await expect(new ContractAdapter('', null, new TransactionTracker(), '').getReserves()).rejects.toThrow(/not configured/);
  });

  it('rejects malformed list reads', () => {
    expect(() => parseList('{"not":"a list"}', 'reserves')).toThrow(/unexpected reserves/);
  });

  it('uses selected account client and sends create_reserve with exactly 2 GEN', async () => {
    const {adapter, writeContract} = adapterFixture();
    await adapter.createReserve({implementer: '0x3333333333333333333333333333333333333333', rfcId: 'RFC2865', section: '4.1', claim: 'claim', claimVersion: 'v1', expiresAt: 1900000000});
    expect(writeContract).toHaveBeenCalledWith(expect.objectContaining({functionName: 'create_reserve', value: 2000000000000000000n}));
  });
});
