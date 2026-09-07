import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ReviewsPage} from '../pages/ReviewsPage';
import type {ContractAdapter} from '../services/contractAdapter';
import {canonicalErrataUrl} from '../services/errata';

const reserve = {
  reserve_id: 'reserve-rfc2865-review-test',
  sponsor: '0x1111111111111111111111111111111111111111',
  implementer: '0x2222222222222222222222222222222222222222',
  rfc_id: 'RFC2865',
  section: '4.1',
  claim_text: 'Implementation accepts Access-Request packets from valid RADIUS clients.',
  claim_version: 'claim-v1',
  status: 'ACTIVE',
  reserve_balance_gen: '2.00',
  material_credit_gen: '1.00',
  expires_at: 1800000000,
  review_count: 0,
};

function renderReviews() {
  const adapter = {
    openReview: vi.fn(async () => ({hash: '0xreview'})),
    adjudicate: vi.fn(async () => '0xadjudicate'),
  } as unknown as ContractAdapter;
  const onReload = vi.fn(async () => undefined);
  render(
    <ReviewsPage
      adapter={adapter}
      connected={true}
      reserves={[reserve]}
      reviews={[]}
      onReload={onReload}
    />,
  );
  return {adapter, onReload};
}

describe('ReviewsPage errata identity validation', () => {
  it('blocks a prefix-mismatched EID before calling the contract adapter', async () => {
    const user = userEvent.setup();
    const {adapter, onReload} = renderReviews();

    await user.selectOptions(screen.getByRole('combobox', {name: 'Reserve'}), reserve.reserve_id);
    const errataId = screen.getByRole('textbox', {name: 'Errata ID'});
    await user.clear(errataId);
    await user.type(errataId, '903');
    await user.click(screen.getByRole('button', {name: 'Submit official erratum'}));

    expect(await screen.findByText(/must exactly match the EID/i)).toBeInTheDocument();
    expect(adapter.openReview).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('accepts only the exact canonical URL and rejects identity aliases', () => {
    const cases = [
      ['9034', 'https://www.rfc-editor.org/errata/eid9034', 'https://www.rfc-editor.org/errata/eid9034'],
      ['903', 'https://www.rfc-editor.org/errata/eid9034', null],
      ['09034', 'https://www.rfc-editor.org/errata/eid9034', null],
      ['9034', 'https://www.rfc-editor.org/errata/eid09034', null],
      ['9034', 'https://www.rfc-editor.org/errata/eid9034/', null],
      ['9034', 'https://www.rfc-editor.org/errata/eid9034?source=x', null],
      ['9034', 'https://www.rfc-editor.org/errata/eid9034#fragment', null],
      ['9034', 'https://www.rfc-editor.org/errata/eid90340', null],
      ['9034', 'https://www.rfc-editor.org:443/errata/eid9034', null],
      ['9034', 'https://rfc-editor.org/errata/eid9034', null],
    ] as const;

    for (const [errataId, errataUrl, expected] of cases) {
      expect(canonicalErrataUrl(errataId, errataUrl)).toBe(expected);
    }
  });
});
