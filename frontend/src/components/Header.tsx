import {ShieldCheck, Wallet} from 'lucide-react';
import {useWallet} from '../context/WalletContext';
import type {AppRoute} from '../routing';
import {ProductNav} from './ProductNav';

export function Header({activeRoute, onConnect, onNavigate}: {activeRoute: AppRoute; onConnect: () => void; onNavigate: (path: string) => void}) {
  const {account, disconnect} = useWallet();
  return (
    <header className="app-header">
      <div className="brand"><ShieldCheck aria-hidden="true" /><span>ProtocolErrataReserve</span></div>
      <ProductNav active={activeRoute} onNavigate={onNavigate} />
      {account ? (
        <details className="account-menu">
          <summary>{account.slice(0, 6)}...{account.slice(-4)}</summary>
          <button onClick={disconnect}>Disconnect</button>
        </details>
      ) : (
        <button className="primary" onClick={onConnect}><Wallet aria-hidden="true" size={18} /> Connect wallet</button>
      )}
    </header>
  );
}
