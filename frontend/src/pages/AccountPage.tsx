import type {ContractAdapter} from '../services/contractAdapter';
import type {Accounting} from '../types';

export function AccountPage({account, adapter, connected, accounting, walletCredits, onReload}: {
  account: string;
  adapter: ContractAdapter;
  connected: boolean;
  accounting: Accounting | null;
  walletCredits: string;
  onReload: () => Promise<void>;
}) {
  const hasWithdrawableCredit = connected && !/^0(?:\.0+)?$/.test(walletCredits.trim());

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
        <p><strong>{connected ? walletCredits : '0.00'} GEN</strong> Your withdrawable credit.</p>
        <p className="muted">{accounting?.credits_pending_gen || '0.00'} GEN remains pending across the contract.</p>
        {!hasWithdrawableCredit && connected && <p className="muted">No finalized credit is withdrawable for this wallet.</p>}
        <button disabled={!hasWithdrawableCredit} className="primary" onClick={() => void withdraw()}>Withdraw finalized credits</button>
      </section>
    </section>
  );
}
