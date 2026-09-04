import {RefreshCcw} from 'lucide-react';
import {productFacts} from '../productCopy';
import type {Accounting, Reserve, Review} from '../types';

export function LandingPage({accounting, reserves, reviews, onNavigate, onReload}: {
  accounting: Accounting | null;
  reserves: Reserve[];
  reviews: Review[];
  onNavigate: (path: string) => void;
  onReload: () => Promise<void>;
}) {
  const settled = reviews.filter((review) => review.verdict === 'MATERIAL_IMPACT').length;
  return (
    <section className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">{productFacts.category} on Studionet</p>
          <h1>Protocol remediation reserves</h1>
          <p className="lede">{productFacts.oneLiner}</p>
          <div className="hero-actions">
            <a className="primary cta-link" href="/start" onClick={(event) => { event.preventDefault(); onNavigate('/start'); }}>Try it step by step</a>
            <a className="secondary cta-link" href={productFacts.explorerUrl} target="_blank" rel="noreferrer">GenLayer Explorer</a>
          </div>
        </div>
        <button className="secondary" onClick={onReload}><RefreshCcw aria-hidden="true" size={18} /> Reload canonical state</button>
      </div>
      <section className="summary-strip" aria-label="Current contract summary">
        <div><span>Active records</span><strong>{reserves.length}</strong></div>
        <div><span>Material outcomes</span><strong>{settled}</strong></div>
        <div><span>Credits pending</span><strong>{accounting?.credits_pending_gen || '0.00'} GEN</strong></div>
      </section>
    </section>
  );
}
