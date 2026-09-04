import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {WalletProvider, useWallet} from '../context/WalletContext';
import {genAmount, STUDIONET_CHAIN_ID} from '../services/wallet';

function Probe() {
  const {wallets, account, connect, disconnect} = useWallet();
  return <div><p>Wallets {wallets.length}</p><p>{account || 'no-account'}</p>{wallets[0] && <button onClick={() => connect(wallets[0])}>Connect first</button>}<button onClick={disconnect}>Disconnect</button></div>;
}

describe('wallet behavior', () => {
  it('connects only after user selects a detected wallet and can disconnect', async () => {
    const provider = {request: vi.fn(async ({method}: {method: string}) => {
      if (method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111'];
      if (method === 'eth_chainId') return STUDIONET_CHAIN_ID;
      return [];
    })};
    (window as any).ethereum = provider;
    render(<WalletProvider><Probe /></WalletProvider>);
    await waitFor(() => expect(screen.getByText(/Wallets 1/)).toBeInTheDocument());
    expect(screen.getByText('no-account')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: /Connect first/i}));
    expect(await screen.findByText('0x1111111111111111111111111111111111111111')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: /Disconnect/i}));
    expect(screen.getByText('no-account')).toBeInTheDocument();
    delete (window as any).ethereum;
  });

  it('parses exact whole GEN amounts without floats', () => {
    expect(genAmount('2', '2')).toBe(2000000000000000000n);
    expect(() => genAmount('1.5', '2')).toThrow(/exactly 2 GEN/);
  });
});
