import {useCallback, useEffect, useMemo, useState} from 'react';
import {Header} from './components/Header';
import {TransactionStatus} from './components/TransactionStatus';
import {WalletModal} from './components/WalletModal';
import {WalletProvider, useWallet} from './context/WalletContext';
import {AccountPage} from './pages/AccountPage';
import {CaseDetailPage} from './pages/CaseDetailPage';
import {HelpPage} from './pages/HelpPage';
import {HistoryPage} from './pages/HistoryPage';
import {LandingPage} from './pages/LandingPage';
import {ReviewsPage} from './pages/ReviewsPage';
import {StartPage} from './pages/StartPage';
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
  const [walletCredits, setWalletCredits] = useState('0.00');
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
      const [reserveRows, reviewRows, accountingRow, walletCreditRow] = await Promise.all([
        adapter.getReserves(),
        adapter.getReviews(),
        adapter.getAccounting(),
        account ? adapter.getCredits(account) : Promise.resolve('0.00'),
      ]);
      setReserves(reserveRows);
      setReviews(reviewRows);
      setAccounting(accountingRow);
      setWalletCredits(walletCreditRow);
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
          adapter={adapter}
          account={account}
          reserves={reserves}
          reviews={reviews}
          accounting={accounting}
          walletCredits={walletCredits}
        />
        {error && <p role="alert" className="banner">{error}</p>}
        <TransactionStatus />
      </main>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}

function RouteContent({route, caseId, navigate, reload, adapter, account, reserves, reviews, accounting, walletCredits}: {
  route: AppRoute;
  caseId?: string;
  navigate: (path: string) => void;
  reload: () => Promise<void>;
  adapter: ContractAdapter;
  account: string;
  reserves: Reserve[];
  reviews: Review[];
  accounting: Accounting | null;
  walletCredits: string;
}) {
  if (route === 'start') return <StartPage adapter={adapter} connected={Boolean(account)} onReload={reload} />;
  if (route === 'reviews') return <ReviewsPage adapter={adapter} connected={Boolean(account)} reserves={reserves} reviews={reviews} onReload={reload} />;
  if (route === 'history') return <HistoryPage reserves={reserves} reviews={reviews} onNavigate={navigate} />;
  if (route === 'account') return <AccountPage account={account} adapter={adapter} connected={Boolean(account)} accounting={accounting} walletCredits={walletCredits} onReload={reload} />;
  if (route === 'help') return <HelpPage />;
  if (route === 'case') return <CaseDetailPage caseId={caseId} reserves={reserves} reviews={reviews} />;
  return <LandingPage accounting={accounting} reserves={reserves} reviews={reviews} onNavigate={navigate} onReload={reload} />;
}

export function App() {
  return <WalletProvider><Shell /></WalletProvider>;
}
