import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {App} from '../App';
import {howToTrySteps, productFacts} from '../productCopy';

vi.mock('../services/wallet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/wallet')>()),
  CONTRACT_ADDRESS: '',
}));

describe('listing readiness', () => {
  it('has the required listing identity fields in product copy', () => {
    expect(productFacts.name).toBe('ProtocolErrataReserve');
    expect(productFacts.category).toBe('Projects');
    expect(productFacts.oneLiner.length).toBeGreaterThan(20);
    expect(productFacts.shortDescription).toMatch(/for protocol sponsors and implementers/i);
    expect(productFacts.logoPath).toBe('/listing/logo.svg');
    expect(howToTrySteps).toHaveLength(7);
  });

  it('shows logo, one-liner, contract link, and reviewer steps in the app', async () => {
    render(<App />);
    expect(screen.getByRole('img', {name: /ProtocolErrataReserve logo/i})).toBeInTheDocument();
    expect(screen.getByText(/Fund protocol remediation/i)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /GenLayer Explorer/i})).toHaveAttribute('href', expect.stringContaining('explorer-studio.genlayer.com/address/'));
    expect(screen.getByRole('link', {name: /Try it step by step/i})).toBeInTheDocument();
  });
});
