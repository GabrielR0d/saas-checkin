// Minimal type stubs so TypeScript compiles without the packages installed.
// The real types ship inside node-hid and serialport themselves when npm-installed.

declare module 'node-hid' {
  class HID {
    constructor(vendorId: number, productId: number)
    on(event: 'data', listener: (data: Buffer) => void): this
    on(event: 'error', listener: (err: Error) => void): this
    close(): void
  }
  export { HID }
}

declare module 'serialport' {
  interface SerialPortOptions {
    path: string
    baudRate: number
    autoOpen?: boolean
  }
  class SerialPort {
    constructor(options: SerialPortOptions)
    pipe<T>(parser: T): T
    open(cb: (err: Error | null) => void): void
    close(cb: (err: Error | null) => void): void
    on(event: 'error', listener: (err: Error) => void): this
  }
  export { SerialPort }
}

declare module '@serialport/parser-readline' {
  class ReadlineParser {
    constructor(options: { delimiter: string })
    on(event: 'data', listener: (line: string) => void): this
  }
  export { ReadlineParser }
}
