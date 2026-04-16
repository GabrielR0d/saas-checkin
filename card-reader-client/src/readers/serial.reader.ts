import { EventEmitter } from 'events'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import config from '../config'

export class SerialReader extends EventEmitter {
  private port: SerialPort
  constructor() {
    super()
    this.port = new SerialPort({ path: config.SERIAL_PORT, baudRate: config.SERIAL_BAUD_RATE, autoOpen: false })
    const parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }))
    parser.on('data', (line: string) => { const uid = line.trim(); if (uid) { console.log(`[Serial] Card: ${uid}`); this.emit('card', uid) } })
    this.port.on('error', (err) => { console.error('[Serial] Error:', err.message); this.emit('error', err) })
  }
  open(): Promise<void> { return new Promise((resolve, reject) => this.port.open((err) => err ? reject(err) : (console.log(`[Serial] Opened ${config.SERIAL_PORT}`), resolve()))) }
  close(): Promise<void> { return new Promise((resolve) => this.port.close(() => resolve())) }
}
