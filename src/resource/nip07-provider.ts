// Note that web accessible scripts cannot import or export because they must be compiled into a single file by tsc.

(window as any).nostr = {
  async getPublicKey(): Promise<string> {
    return rpc(
      {
        kind: 'getPubkey',
        request: {},
      },
      ['content', 'background'],
    );
  },
  async signEvent(event: UnsignedEvent): Promise<SignedEvent | undefined> {
    let signPower = await rpc(
      {
        kind: 'getSignPower',
        request: {},
      },
      ['content', 'background'],
    );

    if (signPower <= 0) {
      await rpc(
        {
          kind: 'enterChargeMode',
          request: {},
        },
        ['content'],
      );
      signPower = await rpc(
        {
          kind: 'getSignPower',
          request: {},
        },
        ['content', 'background'],
      );
    }

    if (signPower > 0) {
      rpc(
        {
          kind: 'setSignPower',
          request: { value: signPower - 1 },
        },
        ['content', 'background'],
      );
      return rpc(
        {
          kind: 'signEvent',
          request: event,
        },
        ['content', 'background'],
      );
    }
  },
};

const ext: ExtName = 'nostronger';

function rpc<T extends CrxRpcRequestPayload>(
  req: T,
  path: CrxMessageOrigin[],
  timeout?: number,
): Promise<CrxRpcResponse<T>> {
  return new Promise((resolve, reject) => {
    const messageId = Math.floor(Math.random() * 1000000);
    const message: CrxRpcRequestMessage = {
      ext,
      messageId,
      src: 'nip07-provider',
      path,
      payload: req,
    };

    window.addEventListener('message', listener);
    window.postMessage(message, '*');

    const timeoutId = timeout
      ? setTimeout(() => {
          window.removeEventListener('message', listener);
          reject(`Request \`${req.kind}\` timed out`);
        }, timeout)
      : -1;

    function listener(ev: MessageEvent<CrxRpcResponseMessage>) {
      const data = ev.data;
      if (
        data.ext !== 'nostronger' ||
        data.messageId !== messageId ||
        data.payload.kind !== req.kind ||
        !('response' in data.payload)
      ) {
        return;
      }

      // Assumed by `data.payload.kind !== req.kind`
      const response = data.payload.response as CrxRpcResponse<T> | PromiseLike<CrxRpcResponse<T>>;

      window.removeEventListener('message', listener);
      clearInterval(timeoutId);
      resolve(response);
    }
  });
}
