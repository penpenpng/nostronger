async function getJoyconDevice() {
  const [device] = await navigator.hid.requestDevice({
    filters: [
      {
        vendorId: 0x057e, // Nintendo vendor ID
        productId: 0x2007, // joy-con R
      },
    ],
  })
  if (!device) {
    throw new Error('device not found.')
  }

  if (!device.opened) {
    await device.open()
  }

  await setupJoycon(device)

  return device
}

async function setupJoycon(joycon: HIDDevice) {
  // set_input_report_mode_to_0x30
  await communicate(joycon, [0x03, 0x30], [[14, 0x03]])
  // enabling_MCU_data_22_1
  await communicate(
    joycon,
    [0x22, 0x01],
    [
      [13, 0x80],
      [14, 0x22],
    ],
  )
  // enabling_MCU_data_21_21_1_1
  await communicate(
    joycon,
    [
      0x21, 0x21, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf3,
    ],
    [[14, 0x21]],
  )
  // get_ext_data_59
  await communicate(
    joycon,
    [0x59],
    [
      [14, 0x59],
      [16, 0x20],
    ],
  )
  // get_ext_dev_in_format_config_5C
  await communicate(
    joycon,
    [
      0x5c, 0x06, 0x03, 0x25, 0x06, 0x00, 0x00, 0x00, 0x00, 0x1c, 0x16, 0xed, 0x34, 0x36, 0x00,
      0x00, 0x00, 0x0a, 0x64, 0x0b, 0xe6, 0xa9, 0x22, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x90, 0xa8, 0xe1, 0x34, 0x36,
    ],
    [[14, 0x5c]],
  )
  // start_external_polling_5A
  await communicate(joycon, [0x5a, 0x04, 0x01, 0x01, 0x02], [[14, 0x5a]])

  const neutralStrain = await getNextStrain(joycon)
  console.log('Ready!')
  console.log('neutralStrain:', neutralStrain)

  // blink LED
  await communicate(joycon, [0x30, 0x90], [[14, 0x30]])
}

async function communicate(device: HIDDevice, subcommand: number[], expected: [number, number][]) {
  device.sendReport(
    0x01,
    new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ...subcommand]),
  )
  await waitReport<void>(device, (resolve) => (event) => {
    if (event.reportId !== 0x21) {
      return
    }

    const data = new Uint8Array(event.data.buffer)
    if (expected.every(([pos, val]) => data[pos - 1] === val)) {
      resolve()
    }
  })
}

function waitReport<T>(
  device: HIDDevice,
  createListener: (resolve: (val: T) => void) => (event: HIDInputReportEvent) => void,
  timeout?: number,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      device.removeEventListener('inputreport', listener)
      reject('timed out')
    }, timeout ?? 5000)

    const listener = createListener((val) => {
      clearTimeout(timeoutId)
      device.removeEventListener('inputreport', listener)
      resolve(val)
    })

    device.addEventListener('inputreport', listener)
  })
}

// function onChange(device: HIDDevice) {
//   const NEUTRAL_STRAIN_RADIUS = 0x0200
//   const NEUTRAL_STRAIN_RADIUS_MARGIN = 0x0010

//   device.addEventListener('inputreport', (event) => {
//     const strain = getStrain(event)
//     if (!strain) {
//       return
//     }

//     state.strain = strain

//     if (isPressing) {
//       isPressing =
//         neutralStrain - NEUTRAL_STRAIN_RADIUS + NEUTRAL_STRAIN_RADIUS_MARGIN > strain ||
//         strain > neutralStrain + NEUTRAL_STRAIN_RADIUS - NEUTRAL_STRAIN_RADIUS_MARGIN
//     } else {
//       if (strain < neutralStrain - NEUTRAL_STRAIN_RADIUS) {
//         state.count--
//         isPressing = true
//       } else if (neutralStrain + NEUTRAL_STRAIN_RADIUS < strain) {
//         state.count++
//         isPressing = true
//       } else {
//         isPressing = false
//       }
//     }
//   })
// }

async function getNextStrain(device: HIDDevice) {
  return waitReport<number>(device, (resolve) => (event) => {
    const strain = getStrain(event)
    if (strain) {
      resolve(strain)
    }
  })
}

function getStrain(event: HIDInputReportEvent) {
  if (event.reportId === 0x30) {
    return new DataView(event.data.buffer, 38, 2).getInt16(0, true)
  } else {
    return null
  }
}

const nip05 = {
  async getPublicKey() {
    return '8c59239319637f97e007dad0d681e65ce35b1ace333b629e2d33f9465c132608'
  },
  async signEvent() {
    const joycon = await getJoyconDevice()

    console.log('strain', await getNextStrain(joycon))
    // const id = Math.floor(Math.random() * 10000)

    // return new Promise((resolve, reject) => {
    //   const handler = (
    //     ev: MessageEvent<{ ext: 'nostronger'; result: string } | { ext: 'nostronger'; error: any }>,
    //   ) => {
    //     const data = ev?.data;
    //     if (data.ext !== ext) {
    //       return
    //     }
    //     window.removeEventListener('message', handler)

    //     if ('error' in data) {
    //       reject(data.error)
    //     } else {
    //       resolve(data.result)
    //     }
    //   }
    //   window.addEventListener('message', handler)
    // })
  },
}

;(window as any).nostr = nip05
