import {useState} from 'react';
import {ProgressStepper} from '../components/ProgressStepper';
import type {ContractAdapter} from '../services/contractAdapter';

export function StartPage({adapter, connected, onReload}: {adapter: ContractAdapter; connected: boolean; onReload: () => Promise<void>}) {
  const [implementer, setImplementer] = useState('');
  const [claim, setClaim] = useState('Implementation accepts Access-Request packets from valid RADIUS clients without requiring Message-Authenticator.');
  const [error, setError] = useState('');

  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">Sponsor workflow</p>
        <h1>Start a remediation reserve</h1>
        <p className="lede">Lock exactly 2 GEN behind one RFC conformance claim and one implementer address.</p>
      </div>
      <ProgressStepper current={1} />
      <form className="panel" onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        try {
          await adapter.createReserve({implementer, rfcId: 'RFC2865', section: '4.1', claim, claimVersion: 'claim-v1', expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400});
          await onReload();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Reserve transaction could not be completed.');
        }
      }}>
        <h2>Reserve details</h2>
        {error && <p role="alert" className="error">{error}</p>}
        <label>Implementer wallet address<input value={implementer} onChange={(event) => setImplementer(event.target.value)} placeholder="0x..." /></label>
        <label>Locked RFC claim<textarea value={claim} onChange={(event) => setClaim(event.target.value)} /></label>
        <button disabled={!connected} className="primary">Create reserve with 2 GEN</button>
      </form>
    </section>
  );
}
