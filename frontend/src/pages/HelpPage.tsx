import {howToTrySteps, productFacts} from '../productCopy';

export function HelpPage() {
  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">Reviewer guide</p>
        <h1>Try ProtocolErrataReserve</h1>
        <p className="lede">Use these steps from a fresh browser session; each step maps to a live app screen or a verified contract link.</p>
      </div>
      <ol className="instruction-list">
        {howToTrySteps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <section className="panel">
        <h2>Verified links</h2>
        <a href={productFacts.liveUrl}>Open the live app</a>
        <a href={productFacts.explorerUrl} target="_blank" rel="noreferrer">Check the contract on GenLayer Explorer</a>
      </section>
    </section>
  );
}
