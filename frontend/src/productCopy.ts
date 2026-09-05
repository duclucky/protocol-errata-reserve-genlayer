import type {AppRoute} from './routing';

export const routes: Array<{id: AppRoute; path: string; label: string}> = [
  {id: 'home', path: '/', label: 'Overview'},
  {id: 'start', path: '/start', label: 'Start'},
  {id: 'reviews', path: '/reviews', label: 'Reviews'},
  {id: 'history', path: '/history', label: 'History'},
  {id: 'account', path: '/account', label: 'Account'},
  {id: 'help', path: '/help', label: 'Help'},
];

export const productFacts = {
  name: 'ProtocolErrataReserve',
  category: 'Projects',
  logoPath: '/listing/logo.svg',
  oneLiner: 'Fund protocol remediation when official RFC errata materially affect a locked conformance claim.',
  shortDescription: 'For protocol sponsors and implementers, ProtocolErrataReserve locks a 2 GEN reserve, lets GenLayer validators judge official RFC Editor errata, and credits remediation when the erratum materially changes the claim.',
  liveUrl: 'https://protocol-errata-reserve-genlayer.vercel.app',
  explorerUrl: 'https://explorer-studio.genlayer.com/address/0x0fe3043e4A3e17dB8BE5424aB95Cc5e2fa4AcBCe',
};

export const howToTrySteps = [
  'Open the live app.',
  'Connect a funded EVM wallet and switch to GenLayer Studionet.',
  'Open Start and create a reserve with exactly 2 GEN.',
  'Open Reviews and submit an official RFC Editor erratum URL.',
  'Wait for the transaction to finalize and reload canonical state.',
  'Open History or the case detail page to verify the validator outcome.',
  'Check the contract on GenLayer Explorer.',
];
