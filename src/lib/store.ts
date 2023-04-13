import { calcPubkey } from '../lib/nostr';

const LOCAL_STORAGE_KEY = {
  KEY_PAIR: 'KEY_PAIR',
  SIGN_POWER: 'SIGN_POWER',
} as const;

async function get(key: string): Promise<any> {
  const { [key]: val } = await chrome.storage.local.get(key);
  return val;
}

async function set(key: string, val: any): Promise<void> {
  await chrome.storage.local.set({ [key]: val });
}

export async function getKeyPair(): Promise<KeyPair> {
  const { seckey, pubkey } = await get(LOCAL_STORAGE_KEY.KEY_PAIR);
  return { seckey, pubkey };
}

export async function setKeyPair(seckey: string) {
  const pubkey = await calcPubkey(seckey);
  await set(LOCAL_STORAGE_KEY.KEY_PAIR, { seckey, pubkey });
}

export async function getSignPower(): Promise<number> {
  const signPower = (await get(LOCAL_STORAGE_KEY.SIGN_POWER)) ?? 0;
  return Number(signPower) || 0;
}

export async function setSignPower(signPower: number) {
  await set(LOCAL_STORAGE_KEY.SIGN_POWER, signPower);
}
