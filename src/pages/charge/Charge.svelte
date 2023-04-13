<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import CircularProgress from '@smui/circular-progress';
  import { getSignPower, setSignPower } from '../../lib/store';
  import { ext, generateMessageId, handleCrxRpcRequest } from '../../lib/messaging';

  let signPower = 0;
  getSignPower().then((power) => {
    signPower = power;
  });

  const gage = tweened(0, {
    duration: 400,
    easing: cubicOut,
  });
  const gain = () => {
    gage.update((x) => Math.min(x + 10, 100));
  };
  $: if ($gage >= 100) {
    gage.set(0, { duration: 0 });
    signPower++;
    setSignPower(signPower).then(() => {
      getSignPower();
    });
  }

  let connected = false;
  let strain = 0;
  let neutral = 0;
  let senderTabId = 0;
  let isPressing = false;
  const onStrainSignal = (val: number) => {
    const NEUTRAL_STRAIN_RADIUS = 0x0200;
    const NEUTRAL_STRAIN_RADIUS_MARGIN = 0x0010;

    if (isPressing) {
      isPressing =
        neutral - NEUTRAL_STRAIN_RADIUS + NEUTRAL_STRAIN_RADIUS_MARGIN > val ||
        val > neutral + NEUTRAL_STRAIN_RADIUS - NEUTRAL_STRAIN_RADIUS_MARGIN;
    } else if (val < neutral - NEUTRAL_STRAIN_RADIUS) {
      isPressing = true;
    } else if (neutral + NEUTRAL_STRAIN_RADIUS < val) {
      gain();
      isPressing = true;
    } else {
      isPressing = false;
    }
  };
  chrome.runtime.onMessage.addListener((msg: CrxRpcRequestMessage, sender) => {
    const { next, shouldBeHandled } = handleCrxRpcRequest(msg, 'charge');
    if (!shouldBeHandled) {
      return;
    }
    if (!!next) {
      console.warn('Unexpected message', msg);
      return;
    }

    const payload = msg.payload;
    switch (payload.kind) {
      case 'sendStrain':
        connected = true;
        neutral = payload.request.neutral;
        strain = payload.request.value;
        senderTabId = sender.tab?.id ?? 0;
        onStrainSignal(strain);
      default:
        break;
    }
  });

  const leaveChargeMode = () => {
    const req: CrxRpcRequestMessage = {
      ext,
      messageId: generateMessageId(),
      path: ['background', 'content'],
      src: 'charge',
      payload: {
        kind: 'leaveChargeMode',
        request: {
          senderTabId,
        },
      },
    };
    chrome.runtime.sendMessage(req);
  };
</script>

<main>
  {#if connected}
    <div class="screen">
      <div class="sign-power">Sing Power: {signPower}</div>
      <div class="strain">Strain: {strain}</div>
      <button on:click={leaveChargeMode}>Close</button>
    </div>
    <div class="gage" style:height={`${$gage}vh`} />
  {:else}
    <div class="screen">
      <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
  {/if}
</main>

<style>
  main {
    height: 100%;
  }
  .screen {
    position: relative;
    z-index: 1;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gage {
    position: fixed;
    z-index: 0;
    bottom: 0;
    width: 100%;
    background-color: orange;
  }
</style>
