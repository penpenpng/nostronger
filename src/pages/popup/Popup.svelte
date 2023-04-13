<script lang="ts">
  import Button, { Label as ButtonLabel } from '@smui/button';
  import LinearProgress from '@smui/linear-progress';

  let progress = 50;
  let sigPower = 3;
</script>

<main>
  <span>Your Signature Power: {sigPower}</span>
  <LinearProgress {progress} style="height: 10px" />
  <Button variant="raised">
    <ButtonLabel>Connect Ring-Con to charge Signature Power</ButtonLabel>
  </Button>
</main>
