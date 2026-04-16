import { EventEmitter } from 'events'
import HID from 'node-hid'
import config from '../config'

const SCAN_MAP: Record<number, string> = {
  0x04:'A',0x05:'B',0x06:'C',0x07:'D',0x08:'E',0x09:'F',0x0a:'G',0x0b:'H',0x0c:'I',0x0d:'J',
  0x0e:'K',0x0f:'L',0x10:'M',0x11:'N',0x12:'O',0x13:'P',0x14:'Q',0x15:'R',0x16:'S',0x17:'T',
  0x18:'U',0x19:'V',0x1a:'W',0x1b:'X',0x1c:'Y',0x1d:'Z',
  0x1e:'1',0x1f:'2',0x20:'3',0x21:'4',0x22:'5',0x23:'6',0x24:'7',0x25:'8',0x26:'9',0x27:'0',
}
const ENTER = new Set([0x28, 0x58])

export class HidReader extends EventEmitter {
  private device: HID.HID
  private buffer = ''
  constructor() {
    super()
    this.device = new HID.HID(config.HID_VENDOR_ID, config.HID_PRODUCT_ID)
    console.log(`[HID] Opened ${config.HID_VENDOR_ID}:${config.HID_PRODUCT_ID}`)
    this.device.on('data', (data: Buffer) => {
      const key = data[2]; if (!key) return
      if (ENTER.has(key)) { if (this.buffer) { console.log(`[HID] Card: ${this.buffer}`); this.emit('card', this.buffer); this.buffer = '' } }
      else { const c = SCAN_MAP[key]; if (c) this.buffer += c }
    })
    this.device.on('error', (err: Error) => { console.error('[HID] Error:', err.message); this.emit('error', err) })
  }
  close(): void { this.device.close() }
}
