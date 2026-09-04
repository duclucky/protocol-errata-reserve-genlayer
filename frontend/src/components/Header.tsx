import {ShieldCheck, Wallet} from 'lucide-react';
import {useWallet} from '../context/WalletContext';

export function Header({onConnect}: {onConnect: () => void}) {
  const {account, disconnect} = useWallet();
  return (
    <header className="app-header">
      <div className="brand"><ShieldCheck aria-hidden="true" /><span>ProtocolErrataReserve</span></div>
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
