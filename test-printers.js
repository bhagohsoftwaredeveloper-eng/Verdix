const koffi = require('koffi');
const path = require('path');

const dllPath = path.join(__dirname, 'lib/sdk/x64/printer.sdk.dll');
const lib = koffi.load(dllPath);

const _ListPrinters = lib.func('ListPrinters', 'int', ['_Out_ uint8*', 'unsigned int', '_Out_ uint32*']);

let needSizeArr = [0];

// Call 1: Get the required size
_ListPrinters(null, 0, needSizeArr);
console.log("Required Size:", needSizeArr[0]);

if (needSizeArr[0] > 0) {
    const bufferSize = needSizeArr[0];
    const buffer = Buffer.alloc(bufferSize);
    
    // Call 2: Fill the buffer
    const res = _ListPrinters(buffer, bufferSize, needSizeArr);
    console.log("ListPrinters 2nd Return Code:", res);

    const structSize = 584; // 64 for model, 520 for port
    const numPrinters = bufferSize / structSize;
    for (let i = 0; i < numPrinters; i++) {
      const offset = i * structSize;
      const modelBuf = buffer.subarray(offset, offset + 64);
      const portBuf = buffer.subarray(offset + 64, offset + 584);
      console.log(`[${i}] Raw Model: `, modelBuf.subarray(0, 16));
      console.log(`[${i}] Raw Port: `, portBuf.subarray(0, 16));

      // Quick guess: maybe it's utf8 inside a 584 byte struct? 
      const modelName8 = modelBuf.toString('utf8').replace(/\0.*$/s, '');
      const portName8 = portBuf.toString('utf8').replace(/\0.*$/s, '');
      console.log(`[${i}] As UTF-8: Model: '${modelName8}' | Port: '${portName8}'`);
    }
} else {
    console.log("No printers found.");
}
