const os = require('os');
const path = require('path');

// Mock Electron `app` object so printer-sdk.js doesn't crash in standard Node
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'electron') {
    return { app: { isPackaged: false } };
  }
  return originalRequire.apply(this, arguments);
};

const { connectPrinter, printData, disconnectPrinter } = require('./printer-sdk.js');

async function test() {
    console.log("Starting test...");
    
    // Test direct connection to printer driver name
    const connected = await connectPrinter('XP-58-P');
    console.log("Connected to XP-58-P:", connected);
    
    if (connected) {
        const textToPrint = "Hello World from Node.js!\n\x1D\x56\x00"; // Print text + Cut paper
        const buffer = Buffer.from(textToPrint, 'utf8');
        
        console.log("Attempting to write data...");
        const result = printData(buffer);
        console.log("Write Data Result:", result);
        
        console.log("Disconnecting...");
        await disconnectPrinter();
        console.log("Done.");
    } else {
        console.error("Could not connect to XP-58-P");
    }
}

test().catch(console.error);
