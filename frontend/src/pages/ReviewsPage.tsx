import {useState} from 'react';
import {ProgressStepper} from '../components/ProgressStepper';
import type {ContractAdapter} from '../services/contractAdapter';
import type {Reserve, Review} from '../types';

export function ReviewsPage({adapter, connected, reserves, reviews, onReload}: {
  adapter: ContractAdapter;
  connected: boolean;
  reserves: Reserve[];
  reviews: Review[];
  onReload: () => Promise<void>;
}) {
  const [reserveId, setReserveId] = useState('');
  const [errataId, setErrataId] = useState('9034');
  const [errataUrl, setErrataUrl] = useState('https://www.rfc-editor.org/errata/eid9034');
  const [error, setError] = useState('');
  const openReviews = reviews.filter((review) => review.status === 'OPEN');

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction could not be completed.');
    }
  };

  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">Implementer workflow</p>
        <h1>Submit official errata</h1>
        <p className="lede">Attach an RFC Editor erratum to an active reserve and wait for validator consensus.</p>
      </div>
      <ProgressStepper current={3} />
      <form className="panel" onSubmit={(event) => {
        event.preventDefault();
        void run(() => adapter.openReview({reserveId, errataId, errataUrl}));
      }}>
        <h2>Official evidence</h2>
        {error && <p role="alert" className="error">{error}</p>}
        <label>Reserve<select value={reserveId} onChange={(event) => setReserveId(event.target.value)}><option value="">Select reserve</option>{reserves.map((reserve) => <option key={reserve.reserve_id}>{reserve.reserve_id}</option>)}</select></label>
        <label>Errata ID<input value={errataId} onChange={(event) => setErrataId(event.target.value)} /></label>
        <label>RFC Editor errata URL<input value={errataUrl} onChange={(event) => setErrataUrl(event.target.value)} /></label>
        <button disabled={!connected || !reserveId} className="primary">Submit official erratum</button>
      </form>
      <section className="panel">
        <h2>Ready for decision</h2>
        {openReviews.length ? openReviews.map((review) => (
          <button key={review.review_id} className="secondary" disabled={!connected} onClick={() => void run(() => adapter.adjudicate(review.review_id))}>Request validator decision for {review.errata_id}</button>
        )) : <p className="empty">No submitted erratum is waiting for a validator decision.</p>}
      </section>
    </section>
  );
}
