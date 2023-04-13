import { ext, generateMessageId, handleCrxRpcRequest, wait } from '../lib/messaging';
import { getJoyconDevice, getNextStrain, getStrain, setupJoycon } from '../lib/ring-con';

injectResourceScript('js/nip07-provider.js');

// 'nip07-provider' -> ...
window.addEventListener('message', async ({ data }: MessageEvent<CrxRpcRequestMessage>) => {
  const { next, shouldBeHandled } = handleCrxRpcRequest(data, 'content');
  if (!shouldBeHandled) {
    return;
  }

  if (next === 'background') {
    // ... -> HERE -> 'background'
    const response: CrxRpcResponseMessage = await chrome.runtime.sendMessage(data);
    window.postMessage(response);
    return;
  } else if (!!next) {
    console.warn('Unexpected message', data);
    return;
  }

  //...  -> HERE
  switch (data.payload.kind) {
    case 'enterChargeMode':
      {
        try {
          const response = await enterChargeMode(data);
          window.postMessage(response);
        } catch (err) {
          console.error(err);
          window.postMessage({
            ext,
            messageId: data.messageId,
            payload: {
              kind: 'enterChargeMode',
              response: false,
            },
          });
          throw err;
        }
      }
      break;
    default:
      break;
  }
});

async function enterChargeMode({
  messageId,
  payload,
}: CrxRpcRequestMessage): Promise<CrxRpcResponseMessage> {
  if (payload.kind !== 'enterChargeMode') {
    throw 'Unexpected message';
  }

  const openChargeWindowReq: CrxRpcMessage = {
    ext,
    messageId: generateMessageId(),
    src: 'content',
    path: ['background'],
    payload: {
      kind: 'openChargeWindow',
      request: {},
    },
  };
  const { payload: result }: CrxRpcResponseMessage = await chrome.runtime.sendMessage(
    openChargeWindowReq,
  );

  if (result.kind !== 'openChargeWindow') {
    throw 'Unexpected message';
  }

  // Keep sending strain signals.
  const joycon = await getJoyconDevice();
  await setupJoycon(joycon);
  const neutral = await getNextStrain(joycon);
  const sendStrain = (value: number) => {
    const req: CrxRpcMessage = {
      ext,
      messageId: generateMessageId(),
      src: 'content',
      path: ['charge'],
      payload: {
        kind: 'sendStrain',
        request: {
          value,
          neutral,
        },
      },
    };
    chrome.runtime.sendMessage(req);
  };
  const reportListener = (ev: HIDInputReportEvent) => {
    const value = getStrain(ev);
    if (value) {
      sendStrain(value);
    }
  };
  joycon.addEventListener('inputreport', reportListener);

  // Wait for `leaveChargeMode` signal.
  await wait<CrxRpcRequestMessage, void>(
    (resolve) => (msg) => {
      const { next, shouldBeHandled } = handleCrxRpcRequest(msg, 'content');
      if (!shouldBeHandled) {
        return;
      }
      if (!!next) {
        console.warn('Unexpected message', msg);
        return;
      }
      if (msg.payload.kind === 'leaveChargeMode') {
        resolve();
      }
    },
    {
      addEventListener: (listener) => {
        chrome.runtime.onMessage.addListener(listener);
      },
      removeEventListener: (listener) => {
        chrome.runtime.onMessage.removeListener(listener);
      },
    },
  );

  // Stop sending strain signals.
  joycon.removeEventListener('inputreport', reportListener);

  return {
    ext,
    messageId,
    payload: {
      kind: 'enterChargeMode',
      response: true,
    },
  };
}

function injectResourceScript(path: string) {
  const script = document.createElement('script');
  script.setAttribute('async', 'false');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL(path));
  document.head.appendChild(script);
}
