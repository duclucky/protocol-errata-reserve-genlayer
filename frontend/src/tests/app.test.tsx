import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {App} from '../App';

vi.mock('../services/wallet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/wallet')>()),
  CONTRACT_ADDRESS: '',
}));

describe('product shell', () => {
  it('renders persistent navigation for the full product, not a one-screen dashboard', async () => {
    render(<App />);

    expect(screen.getByRole('heading', {name: /Protocol remediation reserves/i})).toBeInTheDocument();
    const nav = screen.getByRole('navigation', {name: /Primary/i});
    for (const name of ['Start', 'Reviews', 'History', 'Account', 'Help']) {
      expect(within(nav).getByRole('link', {name})).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', {name: /Lifecycle actions/i})).not.toBeInTheDocument();
    expect(await screen.findByText(/Contract address is not configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/fake/i)).not.toBeInTheDocument();
  });

  it('moves between product routes with real links', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', {name: 'Start'}));
    expect(screen.getByRole('heading', {name: /Start a remediation reserve/i})).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: 'Help'}));
    expect(screen.getByRole('heading', {name: /Try ProtocolErrataReserve/i})).toBeInTheDocument();
  });
});
