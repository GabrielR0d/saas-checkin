import 'dotenv/config'
if (!process.env.DEVICE_API_KEY) { console.error('[Config] DEVICE_API_KEY required'); process.exit(1) }
export default {
  DEVICE_API_KEY: process.env.DEVICE_API_KEY,
  API_URL: process.env.API_URL || 'http://localhost:3001',
  READER_TYPE: (process.env.READER_TYPE || 'serial') as 'serial' | 'hid',
  SERIAL_PORT: process.env.SERIAL_PORT || '/dev/ttyUSB0',
  SERIAL_BAUD_RATE: parseInt(process.env.SERIAL_BAUD_RATE || '9600', 10),
  HID_VENDOR_ID: parseInt(process.env.HID_VENDOR_ID || '0', 10),
  HID_PRODUCT_ID: parseInt(process.env.HID_PRODUCT_ID || '0', 10),
}
