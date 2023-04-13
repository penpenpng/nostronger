import { handleCrxRpcRequest } from '../lib/messaging';
import { signEvent } from '../lib/nostr';
import { getKeyPair, getSignPower, setSignPower } from '../lib/store';

// * -> ...
chrome.runtime.onMessage.addListener((msg: CrxRpcRequestMessage, sender, _sendResponse) => {
  const { next, shouldBeHandled } = handleCrxRpcRequest(msg, 'background');
  if (!shouldBeHandled) {
    return;
  }

  const payload = msg.payload;

  if (next === 'content' && payload.kind === 'leaveChargeMode') {
    chrome.tabs.sendMessage(payload.request.senderTabId, msg);
    return;
  } else if (!!next) {
    console.warn('Unexpected message', msg);
    return;
  }

  const sendResponse = (val: any) => {
    const res: CrxRpcResponseMessage = {
      ...msg,
      payload: {
        kind: payload.kind,
        response: val,
      },
    };
    _sendResponse(res);
  };

  // ... -> HERE
  switch (payload.kind) {
    case 'getPubkey':
      getKeyPair().then(({ pubkey }) => {
        sendResponse(pubkey);
      });
      return true; // For async response
    case 'signEvent':
      getKeyPair().then(async (keypair) => {
        const signed = await signEvent(keypair, payload.request);
        sendResponse(signed);
      });
      return true;
    case 'getSignPower':
      getSignPower().then((power) => {
        sendResponse(power);
      });
      return true;
    case 'setSignPower':
      setSignPower(payload.request.value).then(() => {
        sendResponse(void 0);
      });
      return true;
    case 'openChargeWindow':
      chrome.windows
        .create({
          url: chrome.runtime.getURL('charge.html'),
          type: 'popup',
        })
        .then((res) => {
          const tabId = res.tabs?.[0].id;
          sendResponse(tabId);
        });
      return true;
    default:
      break;
  }
});
