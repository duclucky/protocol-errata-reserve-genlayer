import {isAddress, parseUnits, formatUnits} from 'viem';
import {studionet} from 'genlayer-js/chains';

export interface Eip1193Provider {
  request: (request: {method: string; params?: unknown[]}) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

export type WalletProviderInfo = {
  id: string;
  name: string;
  icon?: string;
  provider: Eip1193Provider;
};

export const STUDIONET_CHAIN_ID = `0x${studionet.id.toString(16)}`;
export const EXPLORER_URL = import.meta.env.VITE_GENLAYER_EXPLORER_URL || 'https://explorer-studio.genlayer.com';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export function rpcChain() {
  const configured = import.meta.env.VITE_GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0];
  const browserSafe = typeof window === 'undefined' ? configured : new URL('/genlayer-rpc', window.location.origin).href;
  return {...studionet, rpcUrls: {default: {http: [browserSafe]}}};
}

export function validAddress(value: string, label: string): asserts value is `0x${string}` {
  if (!isAddress(value)) throw new Error(`${label} must be a valid 20-byte wallet address.`);
}

export function genAmount(value: string, exactGen?: string): bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value.trim())) throw new Error('Enter a valid GEN amount.');
  const amount = parseUnits(value.trim(), 18);
  if (amount <= 0n) throw new Error('GEN amount must be greater than zero.');
  if (exactGen && amount !== parseUnits(exactGen, 18)) throw new Error(`This action requires exactly ${exactGen} GEN.`);
  return amount;
}

export function formatGen(value: bigint, decimals = 2) {
  const [whole, fraction = ''] = formatUnits(value, 18).split('.');
  const trimmed = fraction.slice(0, decimals).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : `${whole}.00`;
}

export async function ensureChain(provider: Eip1193Provider) {
  if (String(await provider.request({method: 'eth_chainId'})).toLowerCase() === STUDIONET_CHAIN_ID) return;
  try {
    await provider.request({method: 'wallet_switchEthereumChain', params: [{chainId: STUDIONET_CHAIN_ID}]});
  } catch (error: any) {
    if (error?.code !== 4902 && error?.data?.originalError?.code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{chainId: STUDIONET_CHAIN_ID, chainName: studionet.name, nativeCurrency: studionet.nativeCurrency, rpcUrls: [...studionet.rpcUrls.default.http], blockExplorerUrls: [EXPLORER_URL]}],
    });
    await provider.request({method: 'wallet_switchEthereumChain', params: [{chainId: STUDIONET_CHAIN_ID}]});
  }
  if (String(await provider.request({method: 'eth_chainId'})).toLowerCase() !== STUDIONET_CHAIN_ID) throw new Error('Wallet is still on the wrong network.');
}

export async function verifyAccount(provider: Eip1193Provider, address: string) {
  validAddress(address, 'Selected wallet');
  const accounts = await provider.request({method: 'eth_accounts'});
  if (!Array.isArray(accounts) || accounts[0]?.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Wallet account changed or is locked. Reconnect before signing.');
  }
}

export function walletError(error: unknown) {
  let node: any = error;
  let message = '';
  let code: number | undefined;
  for (let i = 0; node && i < 8; i += 1) {
    if (typeof node.code === 'number') code = node.code;
    if (typeof node.message === 'string') message += ` ${node.message}`;
    node = node.cause || node.data?.originalError;
  }
  if (code === 4001 || /user (rejected|denied)|denied request/i.test(message)) return {code, message: 'The wallet rejected the request. No transaction hash was recorded.'};
  if (/account changed|locked|valid GEN|exactly|configured|wrong network/i.test(message)) return {code, message: message.trim()};
  return {code, message: 'The request could not be completed. Check wallet and network state before retrying.'};
}
