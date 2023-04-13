// crx-rpc ------------------------------------------------

type ExtName = 'nostronger';

type CrxRpcMessage = CrxRpcRequestMessage | CrxRpcResponseMessage;
interface CrxRpcRequestMessage extends _CrxRpcMessageBase {
  src: CrxMessageOrigin;
  path: CrxMessageOrigin[];
  payload: CrxRpcRequestPayload;
}
interface CrxRpcResponseMessage extends _CrxRpcMessageBase {
  payload: CrxRpcResponsePayload;
}

interface _CrxRpcMessageBase {
  ext: ExtName;
  messageId: number;
}

type CrxMessageOrigin = 'nip07-provider' | 'content' | 'background' | 'charge';

type CrxRpc =
  | {
      // possible paths:
      // - 'nip07-provider' -> 'content' -> 'background'
      kind: 'getPubkey';
      request: {};
      response: string;
    }
  | {
      // possible paths:
      // - 'nip07-provider' -> 'content' -> 'background'
      kind: 'signEvent';
      request: UnsignedEvent;
      response: SignedEvent;
    }
  | {
      // possible paths:
      // - 'nip07-provider' -> 'content' -> 'background'
      // - 'charge' -> 'background'
      kind: 'getSignPower';
      request: {};
      response: number;
    }
  | {
      // possible paths:
      // - 'nip07-provider' -> 'content' -> 'background'
      // - 'charge' -> 'background'
      kind: 'setSignPower';
      request: { value: number };
      response: void;
    }
  | {
      // possible paths:
      // - 'nip07-provider' -> 'content'
      kind: 'enterChargeMode';
      request: {};
      response: boolean;
    }
  | {
      // possible paths:
      // - 'content' -> 'background'
      kind: 'openChargeWindow';
      request: {};
      response: number; // tabId
    }
  | {
      // possible paths:
      // - 'content' -> 'charge'
      kind: 'sendStrain';
      request: {
        value: number;
        neutral: number;
      };
      response: void;
    }
  | {
      // possible paths:
      // - 'charge' -> 'background' -> 'content'
      kind: 'leaveChargeMode';
      request: {
        senderTabId: number;
      };
      response: void;
    };

type CrxRpcRequestPayload = _CrxRpcRequestPayload<CrxRpc>;
type CrxRpcResponsePayload = _CrxRpcResponsePayload<CrxRpc>;
type CrxRpcResponse<Req extends CrxRpcRequestPayload> = _CrxRpc<CrxRpc, Req['kind']>['response'];

type _CrxRpcRequestPayload<T extends CrxRpc> = T extends T ? Omit<T, 'response'> : never;
type _CrxRpcResponsePayload<T extends CrxRpc> = T extends T ? Omit<T, 'request'> : never;
type _CrxRpc<T extends CrxRpc, K extends CrxRpc['kind']> = T extends { kind: K } ? T : never;

// nostr --------------------------------------------------

interface KeyPair {
  seckey: string;
  pubkey: string;
}

interface UnsignedEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

interface SignedEvent extends UnsignedEvent {
  id: string;
  sig: string;
  pubkey: string;
}
