import {useEffect, useRef, useState} from 'react';
import {X, Wallet} from 'lucide-react';
import {walletError} from '../services/wallet';
import {useWallet} from '../context/WalletContext';

export function WalletModal({open, onClose}: {open: boolean; onClose: () => void}) {
  const {wallets, connect, refreshWallets} = useWallet();
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      refreshWallets();
      setTimeout(() => closeRef.current?.focus(), 0);
    }
  }, [open, refreshWallets]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="wallet-title" className="modal-backdrop">
      <section className="modal">
        <header className="modal-header">
          <div className="title-row"><Wallet aria-hidden="true" size={20} /><h2 id="wallet-title">Connect wallet</h2></div>
          <button ref={closeRef} className="icon-button" aria-label="Close wallet dialog" onClick={onClose}><X aria-hidden="true" size={20} /></button>
        </header>
        <p className="muted">Choose a detected EVM wallet. The app never receives private keys and will request GenLayer Studionet before writes.</p>
        <div className="wallet-list">
          {wallets.map((wallet) => (
            <button key={wallet.id} className="wallet-choice" onClick={async () => {
              try {
                await connect(wallet);
                onClose();
              } catch (err) {
                setError(walletError(err).message);
              }
            }}>
              <span>{wallet.name}</span>
              <small>{wallet.id}</small>
            </button>
          ))}
          {!wallets.length && <p className="empty">No compatible EVM wallet detected in this browser.</p>}
        </div>
        {error && <p role="alert" className="error">{error}</p>}
      </section>
    </div>
  );
}
