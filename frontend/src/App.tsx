import {useEffect, useMemo, useState} from 'react';
import {BookOpen, FileSearch, Landmark, RefreshCcw} from 'lucide-react';
import {Header} from './components/Header';
import {TransactionStatus} from './components/TransactionStatus';
import {WalletModal} from './components/WalletModal';
import {WalletProvider, useWallet} from './context/WalletContext';
import {ContractAdapter} from './services/contractAdapter';
import {CONTRACT_ADDRESS} from './services/wallet';
import type {Accounting, Reserve, Review} from './types';

function Shell() {
  const {account, provider} = useWallet();
  const [walletOpen, setWalletOpen] = useState(false);
  const adapter = useMemo(() => new ContractAdapter(account, provider), [account, provider]);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [accounting, setAccounting] = useState<Accounting | null>(null);
  const [error, setError] = useState('');

  const reload = async () => {
    setError('');
    if (!CONTRACT_ADDRESS) {
      setReserves([]);
      setReviews([]);
      setAccounting(null);
      setError('Contract address is not configured. Set VITE_CONTRACT_ADDRESS after Studionet deployment.');
      return;
    }
    try {
      const [reserveRows, reviewRows, accountingRow] = await Promise.all([adapter.getReserves(), adapter.getReviews(), adapter.getAccounting()]);
      setReserves(reserveRows);
      setReviews(reviewRows);
      setAccounting(accountingRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read canonical contract state.');
    }
  };

  useEffect(() => { void reload(); }, [adapter]);

  return (
    <>
      <Header onConnect={() => setWalletOpen(true)} />
      <main className="layout">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Studionet Projects track</p>
            <h1>Official RFC errata impact reserves</h1>
            <p className="lede">Lock a 2 GEN remediation reserve, submit an official RFC Editor erratum, and let GenLayer validators decide whether it materially affects the locked conformance claim.</p>
          </div>
          <button className="secondary" onClick={reload}><RefreshCcw aria-hidden="true" size={18} /> Reload canonical state</button>
        </section>
        {error && <p role="alert" className="banner">{error}</p>}
        <TransactionStatus />
        <section className="stats">
          <Metric label="Total received" value={accounting?.total_received_gen || '0.00'} />
          <Metric label="Reserve balances" value={accounting?.reserve_balances_gen || '0.00'} />
          <Metric label="Pending credits" value={accounting?.credits_pending_gen || '0.00'} />
          <Metric label="Accounting" value={accounting?.balanced ? 'Balanced' : 'Unverified'} />
        </section>
        <section className="grid">
          <ReserveForm adapter={adapter} reload={reload} connected={Boolean(account)} />
          <ReviewForm adapter={adapter} reload={reload} reserves={reserves} connected={Boolean(account)} />
          <ActionPanel adapter={adapter} reload={reload} reserves={reserves} reviews={reviews} connected={Boolean(account)} />
          <DataPanel title="Reserves" icon={<Landmark aria-hidden="true" />} rows={reserves.map((r) => `${r.reserve_id} | ${r.rfc_id} ${r.section} | ${r.status} | ${r.reserve_balance_gen} GEN`)} />
          <DataPanel title="Reviews" icon={<FileSearch aria-hidden="true" />} rows={reviews.map((r) => `${r.review_id} | EID ${r.errata_id} | ${r.status} | ${r.settlement_credit_gen} GEN`)} />
          <Guide />
        </section>
      </main>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function ReserveForm({adapter, reload, connected}: {adapter: ContractAdapter; reload: () => Promise<void>; connected: boolean}) {
  const [implementer, setImplementer] = useState('');
  const [claim, setClaim] = useState('Implementation accepts Access-Request packets from valid RADIUS clients without requiring Message-Authenticator.');
  return (
    <form className="panel" onSubmit={async (event) => {
      event.preventDefault();
      await adapter.createReserve({implementer, rfcId: 'RFC2865', section: '4.1', claim, claimVersion: 'claim-v1', expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400});
      await reload();
    }}>
      <h2>Create reserve</h2>
      <label>Implementer address<input value={implementer} onChange={(e) => setImplementer(e.target.value)} placeholder="0x..." /></label>
      <label>Locked claim<textarea value={claim} onChange={(e) => setClaim(e.target.value)} /></label>
      <button disabled={!connected} className="primary">Create with 2 GEN</button>
    </form>
  );
}

function ReviewForm({adapter, reload, reserves, connected}: {adapter: ContractAdapter; reload: () => Promise<void>; reserves: Reserve[]; connected: boolean}) {
  const [reserveId, setReserveId] = useState('');
  const [errataId, setErrataId] = useState('9034');
  const [errataUrl, setErrataUrl] = useState('https://www.rfc-editor.org/errata/eid9034');
  return (
    <form className="panel" onSubmit={async (event) => {
      event.preventDefault();
      await adapter.openReview({reserveId, errataId, errataUrl});
      await reload();
    }}>
      <h2>Open review</h2>
      <label>Reserve<select value={reserveId} onChange={(e) => setReserveId(e.target.value)}><option value="">Select reserve</option>{reserves.map((r) => <option key={r.reserve_id}>{r.reserve_id}</option>)}</select></label>
      <label>Errata ID<input value={errataId} onChange={(e) => setErrataId(e.target.value)} /></label>
      <label>Official URL<input value={errataUrl} onChange={(e) => setErrataUrl(e.target.value)} /></label>
      <button disabled={!connected || !reserveId} className="primary">Submit official erratum</button>
    </form>
  );
}

function ActionPanel({adapter, reload, reserves, reviews, connected}: {adapter: ContractAdapter; reload: () => Promise<void>; reserves: Reserve[]; reviews: Review[]; connected: boolean}) {
  const [error, setError] = useState('');
  const callableReviews = reviews.filter((review) => review.status === 'OPEN');
  const closableReserves = reserves.filter((reserve) => reserve.status === 'ACTIVE' || reserve.status === 'IMPACT_SETTLED');
  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction could not be completed.');
    }
  };
  return (
    <section className="panel wide">
      <h2>Lifecycle actions</h2>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="action-grid">
        <button className="secondary" disabled={!connected} onClick={() => void run(() => adapter.withdrawCredits())}>Withdraw finalized credits</button>
        {callableReviews.length ? callableReviews.map((review) => (
          <button key={review.review_id} className="secondary" disabled={!connected} onClick={() => void run(() => adapter.adjudicate(review.review_id))}>Adjudicate {review.review_id}</button>
        )) : <p className="empty">No open review is ready for adjudication.</p>}
        {closableReserves.length ? closableReserves.map((reserve) => (
          <button key={reserve.reserve_id} className="secondary" disabled={!connected} onClick={() => void run(() => adapter.closeReserve(reserve.reserve_id))}>Close {reserve.reserve_id}</button>
        )) : <p className="empty">No reserve is ready to close.</p>}
      </div>
    </section>
  );
}

function DataPanel({title, icon, rows}: {title: string; icon: React.ReactNode; rows: string[]}) {
  return <section className="panel"><h2 className="title-row">{icon}{title}</h2>{rows.length ? rows.map((row) => <p className="row" key={row}>{row}</p>) : <p className="empty">No finalized contract data loaded.</p>}</section>;
}

function Guide() {
  return (
    <section className="panel wide">
      <h2 className="title-row"><BookOpen aria-hidden="true" /> Reviewer path</h2>
      <ol>
        <li>Connect a detected EVM wallet and switch to GenLayer Studionet.</li>
        <li>Create a reserve with exactly 2 GEN and a locked RFC claim.</li>
        <li>As the implementer, submit the official RFC Editor errata URL.</li>
        <li>Trigger review from the lifecycle actions panel after deployment wiring is configured.</li>
        <li>Wait for finality, reload canonical state, and withdraw credited GEN only when the contract shows credit.</li>
      </ol>
    </section>
  );
}

export function App() {
  return <WalletProvider><Shell /></WalletProvider>;
}
