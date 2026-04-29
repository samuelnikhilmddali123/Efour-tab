/**
 * Safe Printer Service that handles both Native and Mock environments.
 */
let BLEPrinter = null;
try {
  const p = require('react-native-thermal-receipt-printer-image-qr');
  if (p && p.BLEPrinter) {
    BLEPrinter = p.BLEPrinter;
  }
} catch (e) {
  console.log('PrinterService: Native module load failed, using mock.');
}

const mockPrinter = {
  init: () => {
    console.log('MockPrinter: init');
    return Promise.resolve();
  },
  getDeviceList: () => {
    console.log('MockPrinter: getDeviceList');
    return Promise.resolve([]);
  },
  connectPrinter: (addr) => {
    console.log('MockPrinter: connectPrinter', addr);
    return Promise.resolve();
  },
  printText: (text) => {
    console.log('MockPrinter: printText', text);
    return Promise.resolve();
  },
  printQRCode: (data) => {
    console.log('MockPrinter: printQRCode', data);
    return Promise.resolve();
  },
  cutPaper: () => {
    console.log('MockPrinter: cutPaper');
    return Promise.resolve();
  }
};

// Use the native printer if available, otherwise use mock
export const PrinterService = BLEPrinter || mockPrinter;
export const isNativePrinter = !!BLEPrinter;
