import {StatusPill, verdictLabel} from '../components/StatusPill';
import type {Reserve, Review} from '../types';

const explorerBase = 'https://explorer-studio.genlayer.com/address/0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc';

export function CaseDetailPage({caseId, reserves, reviews}: {caseId?: string; reserves: Reserve[]; reviews: Review[]}) {
  const reserve = reserves.find((item) => item.reserve_id === caseId) || reserves[0];
  const review = reserve ? reviews.find((item) => item.reserve_id === reserve.reserve_id) : undefined;

  if (!reserve) {
    return (
      <section className="panel wide">
        <p className="eyebrow">Case detail</p>
        <h1>Case not found</h1>
        <p className="lede">Reload canonical state or open History to choose a reserve.</p>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">{reserve.reserve_id}</p>
        <h1>{reserve.rfc_id} section {reserve.section}</h1>
        <p className="lede">{reserve.claim_text}</p>
      </div>
      <div className="detail-grid">
        <article className="panel">
          <h2>Outcome</h2>
          <StatusPill status={review?.verdict || reserve.status} />
          <p>{verdictLabel(review?.verdict || reserve.status)} based on the official RFC Editor erratum evidence.</p>
          <p><strong>{review?.settlement_credit_gen || '0.00'} GEN implementer credit</strong> is recorded by canonical contract state.</p>
        </article>
        <article className="panel">
          <h2>Official evidence</h2>
          <p>RFC Editor erratum EID {review?.errata_id || 'not submitted'}.</p>
          {review?.errata_url && <a href={review.errata_url} target="_blank" rel="noreferrer">Open RFC Editor evidence</a>}
          <a href={explorerBase} target="_blank" rel="noreferrer">Open GenLayer Explorer</a>
        </article>
      </div>
    </section>
  );
}
