import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {App} from '../App';

const reserves = [{
  reserve_id: 'reserve-rfc2865-mtn91esz',
  sponsor: '0x1111111111111111111111111111111111111111',
  implementer: '0x2222222222222222222222222222222222222222',
  rfc_id: 'RFC2865',
  section: '4.1',
  claim_text: 'Implementation accepts Access-Request packets from valid RADIUS clients.',
  claim_version: 'claim-v1',
  status: 'IMPACT_SETTLED',
  reserve_balance_gen: '1.00',
  material_credit_gen: '1.00',
  expires_at: 1800000000,
  review_count: 1,
}];

const reviews = [{
  review_id: 'review-9034-mtn91esz',
  reserve_id: 'reserve-rfc2865-mtn91esz',
  errata_id: '9034',
  errata_url: 'https://www.rfc-editor.org/errata/eid9034',
  status: 'MATERIAL_IMPACT',
  verdict: 'MATERIAL_IMPACT',
  rationale: 'The erratum changes the conformance meaning for this claim.',
  settlement_credit_gen: '1.00',
}];

vi.mock('../services/wallet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/wallet')>()),
  CONTRACT_ADDRESS: '0xEB12772823ab2d4F14fEF52A5d452C01FE514dbc',
}));

vi.mock('../services/contractAdapter', () => ({
  ContractAdapter: class {
    getReserves = async () => reserves;
    getReviews = async () => reviews;
    getAccounting = async () => ({
      total_received_gen: '2.00',
      reserve_balances_gen: '1.00',
      credits_pending_gen: '1.00',
      total_withdrawn_gen: '0.00',
      accounted_total_gen: '2.00',
      balanced: true,
    });
  },
}));

describe('product flow pages', () => {
  it('shows prior cases as user outcomes and opens a case detail route', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', {name: 'History'}));
    expect(await screen.findByText(/RFC2865 section 4.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Material impact settled/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: /View case/i}));
    expect(screen.getByRole('heading', {name: /RFC2865 section 4.1/i})).toBeInTheDocument();
    expect(screen.getByText(/1.00 GEN implementer credit/i)).toBeInTheDocument();
  });

  it('keeps raw method names out of the primary product surface', async () => {
    render(<App />);
    expect(await screen.findByText(/Fund protocol remediation/i)).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).queryByText(/adjudicate_review/i)).not.toBeInTheDocument();
    expect(within(main).queryByText(/get_all_reserves/i)).not.toBeInTheDocument();
  });

  it('guides a fresh reviewer through the exact try path without prior context', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(/Fund protocol remediation/i)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Try it step by step/i})).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: /Try it step by step/i}));
    expect(screen.getByRole('heading', {name: /Start a remediation reserve/i})).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Create reserve with 2 GEN/i})).toBeDisabled();

    await user.click(screen.getByRole('link', {name: 'Reviews'}));
    expect(screen.getByRole('heading', {name: /Submit official errata/i})).toBeInTheDocument();
    expect(screen.getByText(/RFC Editor errata URL/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: 'Account'}));
    expect(screen.getByRole('heading', {name: /Wallet and credits/i})).toBeInTheDocument();
    expect(screen.getByText(/Connect a wallet to withdraw finalized credits/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: 'Help'}));
    expect(screen.getByRole('heading', {name: /Try ProtocolErrataReserve/i})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Open the live app/i})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Check the contract on GenLayer Explorer/i})).toBeInTheDocument();
  });
});
