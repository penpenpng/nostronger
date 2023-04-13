<script lang="ts">
  import Button, { Label as ButtonLabel } from '@smui/button';
  import Textfield from '@smui/textfield';
  import HelperText from '@smui/textfield/helper-text';
  import Snackbar, { Label as SnackbarLabel, Actions as SnackbarActions } from '@smui/snackbar';
  import IconButton from '@smui/icon-button';
  import { bech32encode, isValidHex } from '../../lib/nostr';
  import { getKeyPair, setKeyPair } from '../../lib/store';

  let input = '';
  let errorMessage = '';

  getKeyPair().then(({ seckey }) => {
    input = seckey;
  });

  let snackbar: Snackbar;
  type SnackbarType = 'success' | 'error';
  let snackbarType: SnackbarType = 'success';
  let snackbarMessage = '';

  function showSnackbar(type: SnackbarType, message: string) {
    if (snackbar.isOpen()) {
      return;
    }

    snackbarType = type;
    snackbarMessage = message;
    snackbar.open();
  }

  async function trySave() {
    errorMessage = '';

    let seckey = input;
    try {
      if (/^nsec1/.test(seckey)) {
        seckey = bech32encode(seckey);
      }
    } catch {
      errorMessage = 'Invalid nsec format';
      return;
    }

    if (!isValidHex(seckey)) {
      errorMessage = 'Invalid hex format';
      return;
    }

    try {
      await setKeyPair(seckey);
      showSnackbar('success', 'Saved successfully');
    } catch (err) {
      showSnackbar('error', 'Input is appropriate but failed to save');
      throw err;
    }
  }
</script>

<main>
  <h1>Nostronger Options</h1>

  <Textfield
    variant="outlined"
    style="width: 80%;"
    bind:value={input}
    label="Secret Key (nsec1... or hex)"
    type="password"
    invalid={!!errorMessage}
  >
    <HelperText slot="helper" validationMsg={true}>{errorMessage}</HelperText>
  </Textfield>

  <div class="actions">
    <Button variant="raised" on:click={trySave}>
      <ButtonLabel>Save</ButtonLabel>
    </Button>
  </div>

  <Snackbar bind:this={snackbar} class={`snackbar-${snackbarType}`}>
    <SnackbarLabel>{snackbarMessage}</SnackbarLabel>
    <SnackbarActions>
      <IconButton class="material-icons" title="Dismiss">close</IconButton>
    </SnackbarActions>
  </Snackbar>
</main>

<style lang="scss">
  @use '@material/snackbar/mixins' as snackbar;
  @use '@material/theme/color-palette';
  @use '@material/theme/theme-color';

  main {
    padding: 0 10px;
  }

  .actions {
    margin-top: 20px;
  }

  :global {
    .snackbar-success {
      @include snackbar.fill-color(color-palette.$green-500);
      @include snackbar.label-ink-color(theme-color.accessible-ink-color(color-palette.$green-500));
      .mdc-snackbar__label {
        color: white;
      }
    }
    .snackbar-error {
      @include snackbar.fill-color(color-palette.$red-500);
      @include snackbar.label-ink-color(theme-color.accessible-ink-color(color-palette.$red-500));
      .mdc-snackbar__label {
        color: white;
      }
    }
  }
</style>
