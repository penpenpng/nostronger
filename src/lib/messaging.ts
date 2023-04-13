export const ext: ExtName = 'nostronger';
export function generateMessageId() {
  return Math.floor(Math.random() * 1000000);
}

export function wait<E, T>(
  createListener: (resolve: (val: T) => void) => (event: E) => void,
  params: {
    addEventListener: (listener: (event: E) => void) => void;
    removeEventListener: (listener: (event: E) => void) => void;
    prepare?: () => void;
    timeout?: number;
  },
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = params.timeout
      ? setTimeout(() => {
          params.removeEventListener(listener);
          reject('timed out');
        })
      : -1;

    const listener = createListener((val) => {
      clearTimeout(timeoutId);
      params.removeEventListener(listener);
      resolve(val);
    });

    params.addEventListener(listener);
    params.prepare?.();
  });
}

export function handleCrxRpcRequest(
  msg: CrxRpcRequestMessage,
  origin: CrxMessageOrigin,
): { next?: CrxMessageOrigin; shouldBeHandled: boolean } {
  if (msg.ext !== 'nostronger' || !('request' in msg.payload) || msg.path[0] !== origin) {
    return {
      shouldBeHandled: false,
    };
  }

  msg.path.shift();
  const next = msg.path[0];

  return {
    next,
    shouldBeHandled: true,
  };
}
