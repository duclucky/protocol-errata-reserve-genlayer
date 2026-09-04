import {StatusPill} from '../components/StatusPill';
import type {Reserve, Review} from '../types';

function reviewForReserve(reserveId: string, reviews: Review[]) {
  return reviews.find((review) => review.reserve_id === reserveId);
}

export function HistoryPage({reserves, reviews, onNavigate}: {reserves: Reserve[]; reviews: Review[]; onNavigate: (path: string) => void}) {
  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">Canonical history</p>
        <h1>Reserve history</h1>
        <p className="lede">Revisit funded RFC claims, validator outcomes, and GEN consequences loaded from the deployed contract.</p>
      </div>
      <div className="case-list">
        {reserves.length ? reserves.map((reserve) => {
          const review = reviewForReserve(reserve.reserve_id, reviews);
          return (
            <article className="case-card" key={reserve.reserve_id}>
              <div>
                <p className="eyebrow">{reserve.reserve_id}</p>
                <h2>{reserve.rfc_id} section {reserve.section}</h2>
                <p>{reserve.claim_text}</p>
              </div>
              <StatusPill status={review?.verdict || reserve.status} />
              <p><strong>{review?.settlement_credit_gen || '0.00'} GEN</strong> implementer credit</p>
              <a href={`/cases/${reserve.reserve_id}`} onClick={(event) => { event.preventDefault(); onNavigate(`/cases/${reserve.reserve_id}`); }}>View case</a>
            </article>
          );
        }) : <p className="empty">No reserves have been finalized on the configured contract yet.</p>}
      </div>
    </section>
  );
}
