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
  oneLiner: 'Fund protocol remediation when official RFC errata materially affect a locked conformance claim.',
};
