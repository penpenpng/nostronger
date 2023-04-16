import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bech32 } from 'bech32';

const utf8Encoder = new TextEncoder();
secp256k1.utils.sha256Sync = (...msgs) => sha256(secp256k1.utils.concatBytes(...msgs));

export async function calcPubkey(seckey: string): Promise<string> {
  return secp256k1.utils.bytesToHex(secp256k1.schnorr.getPublicKey(seckey));
}

export async function signEvent(
  { seckey, pubkey }: KeyPair,
  unsignedEvent: UnsignedEvent,
): Promise<SignedEvent> {
  const { created_at, kind, tags, content } = unsignedEvent;

  const id = secp256k1.utils.bytesToHex(
    sha256(utf8Encoder.encode(JSON.stringify([0, pubkey, created_at, kind, tags, content]))),
  );
  const sig = secp256k1.utils.bytesToHex(secp256k1.schnorr.signSync(id, seckey));

  return {
    id,
    pubkey,
    sig,
    ...unsignedEvent,
  };
}

export function bech32encode(str: string) {
  return hexEncode(fromWords(bech32.decode(str).words));
}

function hexEncode(buf: number[]) {
  let str = '';
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    str += hexChar(c >> 4);
    str += hexChar(c & 0xf);
  }
  return str;
}

function hexChar(val: number) {
  if (val < 10) return String.fromCharCode(48 + val);
  else return String.fromCharCode(97 + val - 10);
}

function fromWords(words: number[]) {
  const res = convertbits(words, 5, 8, false);
  if (Array.isArray(res)) return res;
  throw new Error(res);
}

function convertbits(data: number[], inBits: number, outBits: number, pad: boolean) {
  let value = 0;
  let bits = 0;
  const maxV = (1 << outBits) - 1;
  const result = [];
  for (let i = 0; i < data.length; ++i) {
    value = (value << inBits) | data[i];
    bits += inBits;
    while (bits >= outBits) {
      bits -= outBits;
      result.push((value >> bits) & maxV);
    }
  }
  if (pad) {
    if (bits > 0) {
      result.push((value << (outBits - bits)) & maxV);
    }
  } else {
    if (bits >= inBits) return 'Excess padding';
    if ((value << (outBits - bits)) & maxV) return 'Non-zero padding';
  }
  return result;
}

export function isValidHex(hex: string): boolean {
  return /^[a-f0-9]{64}$/.test(hex);
}
