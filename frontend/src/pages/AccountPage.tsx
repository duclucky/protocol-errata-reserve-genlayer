import type {ContractAdapter} from '../services/contractAdapter';
import type {Accounting} from '../types';

export function AccountPage({account, adapter, connected, accounting, onReload}: {
  account: string;
  adapter: ContractAdapter;
  connected: boolean;
  accounting: Accounting | null;
  onReload: () => Promise<void>;
}) {
  const withdraw = async () => {
    await adapter.withdrawCredits();
    await onReload();
  };

  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">Account</p>
        <h1>Wallet and credits</h1>
        <p className="lede">{connected ? `Connected wallet ${account}` : 'Connect a wallet to withdraw finalized credits.'}</p>
      </div>
      <section className="panel">
        <h2>Credit status</h2>
        <p><strong>{accounting?.credits_pending_gen || '0.00'} GEN</strong> pending implementer credits across the contract.</p>
        <button disabled={!connected} className="primary" onClick={() => void withdraw()}>Withdraw finalized credits</button>
      </section>
    </section>
  );
}
