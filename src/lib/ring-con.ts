import { wait } from './messaging';

export async function getJoyconDevice() {
  const [device] = await navigator.hid.requestDevice({
    filters: [
      {
        vendorId: 0x057e, // Nintendo vendor ID
        productId: 0x2007, // joy-con R
      },
    ],
  });
  if (!device) {
    throw new Error('device not found.');
  }

  if (!device.opened) {
    await device.open();
  }

  await setupJoycon(device);

  return device;
}

export async function setupJoycon(joycon: HIDDevice) {
  // set_input_report_mode_to_0x30
  await communicate(joycon, [0x03, 0x30], [[14, 0x03]]);
  // enabling_MCU_data_22_1
  await communicate(
    joycon,
    [0x22, 0x01],
    [
      [13, 0x80],
      [14, 0x22],
    ],
  );
  // enabling_MCU_data_21_21_1_1
  await communicate(
    joycon,
    [
      0x21, 0x21, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf3,
    ],
    [[14, 0x21]],
  );
  // get_ext_data_59
  await communicate(
    joycon,
    [0x59],
    [
      [14, 0x59],
      [16, 0x20],
    ],
  );
  // get_ext_dev_in_format_config_5C
  await communicate(
    joycon,
    [
      0x5c, 0x06, 0x03, 0x25, 0x06, 0x00, 0x00, 0x00, 0x00, 0x1c, 0x16, 0xed, 0x34, 0x36, 0x00,
      0x00, 0x00, 0x0a, 0x64, 0x0b, 0xe6, 0xa9, 0x22, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x90, 0xa8, 0xe1, 0x34, 0x36,
    ],
    [[14, 0x5c]],
  );
  // start_external_polling_5A
  await communicate(joycon, [0x5a, 0x04, 0x01, 0x01, 0x02], [[14, 0x5a]]);

  // blink LED
  await communicate(joycon, [0x30, 0x90], [[14, 0x30]]);
}

async function communicate(device: HIDDevice, subcommand: number[], expected: [number, number][]) {
  await wait<HIDInputReportEvent, void>(
    (resolve) => (event) => {
      if (event.reportId !== 0x21) {
        return;
      }

      const data = new Uint8Array(event.data.buffer);
      if (expected.every(([pos, val]) => data[pos - 1] === val)) {
        resolve();
      }
    },
    {
      addEventListener: (listener) => device.addEventListener('inputreport', listener),
      removeEventListener: (listener) => device.removeEventListener('inputreport', listener),
      prepare: () => {
        device.sendReport(
          0x01,
          new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ...subcommand]),
        );
      },
      // timeout: 5000,
    },
  );
}

export async function getNextStrain(joycon: HIDDevice) {
  return wait<HIDInputReportEvent, number>(
    (resolve) => (event) => {
      const strain = getStrain(event);
      if (strain) {
        resolve(strain);
      }
    },
    {
      addEventListener: (listener) => joycon.addEventListener('inputreport', listener),
      removeEventListener: (listener) => joycon.removeEventListener('inputreport', listener),
      // timeout: 5000,
    },
  );
}

export function getStrain(event: HIDInputReportEvent) {
  if (event.reportId === 0x30) {
    return new DataView(event.data.buffer, 38, 2).getInt16(0, true);
  } else {
    return null;
  }
}
