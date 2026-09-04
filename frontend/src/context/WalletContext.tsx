import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {ensureChain, validAddress, type Eip1193Provider, type WalletProviderInfo} from '../services/wallet';

type WalletContextValue = {
  account: string;
  provider: Eip1193Provider | null;
  wallets: WalletProviderInfo[];
  connect: (wallet: WalletProviderInfo) => Promise<void>;
  disconnect: () => void;
  refreshWallets: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const fallbackWallets = () => {
  const w = window as any;
  return [w.ethereum, w.okxwallet, w.rabby, w.coinbaseWalletExtension, w.braveEthereum]
    .filter(Boolean)
    .map((provider, index) => ({id: `injected-${index}`, name: index === 0 ? 'Browser injected wallet' : `Injected wallet ${index + 1}`, provider}));
};

export function WalletProvider({children}: {children: ReactNode}) {
  const [wallets, setWallets] = useState<WalletProviderInfo[]>([]);
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);

  const refreshWallets = useCallback(() => {
    const found = new Map<string, WalletProviderInfo>();
    for (const wallet of fallbackWallets()) found.set(wallet.id, wallet);
    setWallets([...found.values()]);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }, []);

  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.provider || !detail?.info) return;
      setWallets((prev) => {
        const next = new Map(prev.map((item) => [item.id, item]));
        next.set(detail.info.rdns || detail.info.uuid || detail.info.name, {
          id: detail.info.rdns || detail.info.uuid || detail.info.name,
          name: detail.info.name || 'Detected wallet',
          icon: detail.info.icon,
          provider: detail.provider,
        });
        return [...next.values()];
      });
    };
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    refreshWallets();
    return () => window.removeEventListener('eip6963:announceProvider', onAnnounce);
  }, [refreshWallets]);

  const connect = useCallback(async (wallet: WalletProviderInfo) => {
    const accounts = await wallet.provider.request({method: 'eth_requestAccounts'});
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error('The selected wallet returned no account.');
    validAddress(accounts[0], 'Selected wallet');
    await ensureChain(wallet.provider);
    setProvider(wallet.provider);
    setAccount(accounts[0]);
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setAccount('');
  }, []);

  useEffect(() => {
    if (!provider?.on) return;
    const onAccounts = (accounts: string[]) => setAccount(accounts?.[0] || '');
    provider.on('accountsChanged', onAccounts);
    return () => provider.removeListener?.('accountsChanged', onAccounts);
  }, [provider]);

  const value = useMemo(() => ({account, provider, wallets, connect, disconnect, refreshWallets}), [account, provider, wallets, connect, disconnect, refreshWallets]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used inside WalletProvider');
  return value;
}
