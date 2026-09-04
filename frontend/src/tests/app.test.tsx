import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {App} from '../App';

vi.mock('../services/wallet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/wallet')>()),
  CONTRACT_ADDRESS: '',
}));

describe('app shell', () => {
  it('renders the usable reserve dashboard first and honest config warning', async () => {
    render(<App />);
    expect(screen.getByRole('heading', {name: /Official RFC errata impact reserves/i})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: /Lifecycle actions/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Withdraw finalized credits/i})).toBeDisabled();
    expect(await screen.findByText(/Contract address is not configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/fake/i)).not.toBeInTheDocument();
  });
});
