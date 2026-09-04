import {useCallback, useEffect, useMemo, useState} from 'react';
import {RefreshCcw} from 'lucide-react';
import {Header} from './components/Header';
import {TransactionStatus} from './components/TransactionStatus';
import {WalletModal} from './components/WalletModal';
import {WalletProvider, useWallet} from './context/WalletContext';
import {productFacts} from './productCopy';
import {parseRoute, type AppRoute} from './routing';
import {ContractAdapter} from './services/contractAdapter';
import {CONTRACT_ADDRESS} from './services/wallet';
import type {Accounting, Reserve, Review} from './types';

function Shell() {
  const {account, provider} = useWallet();
  const [walletOpen, setWalletOpen] = useState(false);
  const [routeState, setRouteState] = useState(() => parseRoute(window.location.pathname));
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

  useEffect(() => {
    const onPopState = () => setRouteState(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRouteState(parseRoute(path));
  }, []);

  return (
    <>
      <Header activeRoute={routeState.route} onConnect={() => setWalletOpen(true)} onNavigate={navigate} />
      <main className="layout">
        <RouteContent
          route={routeState.route}
          caseId={routeState.caseId}
          navigate={navigate}
          reload={reload}
          reserves={reserves}
          reviews={reviews}
          accounting={accounting}
        />
        {error && <p role="alert" className="banner">{error}</p>}
        <TransactionStatus />
      </main>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}

function RouteContent({route, caseId, navigate, reload, reserves, reviews, accounting}: {
  route: AppRoute;
  caseId?: string;
  navigate: (path: string) => void;
  reload: () => Promise<void>;
  reserves: Reserve[];
  reviews: Review[];
  accounting: Accounting | null;
}) {
  if (route === 'start') return <SimplePage title="Start a remediation reserve" body="Create a 2 GEN reserve for a specific RFC claim and implementer." />;
  if (route === 'reviews') return <SimplePage title="Submit official errata" body="Submit an official RFC Editor erratum for an active reserve." />;
  if (route === 'history') return <SimplePage title="Reserve history" body={`${reserves.length} reserves and ${reviews.length} reviews loaded from canonical contract views.`} />;
  if (route === 'account') return <SimplePage title="Wallet and credits" body={`Pending credits: ${accounting?.credits_pending_gen || '0.00'} GEN.`} />;
  if (route === 'help') return <SimplePage title="Try ProtocolErrataReserve" body="Follow the app from overview, start, reviews, history, case detail, and account." />;
  if (route === 'case') return <SimplePage title={caseId || 'Case detail'} body="Review the canonical status and finalized consequence for this reserve." />;
  return (
    <section className="hero-panel">
      <div>
        <p className="eyebrow">{productFacts.category} on Studionet</p>
        <h1>Protocol remediation reserves</h1>
        <p className="lede">{productFacts.oneLiner}</p>
        <a className="primary cta-link" href="/start" onClick={(event) => { event.preventDefault(); navigate('/start'); }}>Try it step by step</a>
      </div>
      <button className="secondary" onClick={reload}><RefreshCcw aria-hidden="true" size={18} /> Reload canonical state</button>
    </section>
  );
}

function SimplePage({title, body}: {title: string; body: string}) {
  return (
    <section className="panel wide">
      <p className="eyebrow">ProtocolErrataReserve</p>
      <h1>{title}</h1>
      <p className="lede">{body}</p>
    </section>
  );
}

export function App() {
  return <WalletProvider><Shell /></WalletProvider>;
}
