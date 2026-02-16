
import { useCallback } from 'react';
import { useWebSerial } from './use-web-serial';
import { useWebUSB } from './use-web-usb';

export interface UsePrinterReturn {
    isPrinting: boolean;
    isConnected: boolean;
    connect: () => Promise<boolean>;
    print: (data: Uint8Array) => Promise<boolean>;
    disconnect: () => Promise<void>;
    printMode: 'browser' | 'escpos' | 'usb';
}

export function usePrinter(mode: 'browser' | 'escpos' | 'usb' = 'escpos'): UsePrinterReturn {
    const serial = useWebSerial();
    const usb = useWebUSB();

    const connect = useCallback(async () => {
        if (mode === 'usb') return usb.connect();
        if (mode === 'escpos') return serial.connect();
        return true; // Browser mode doesn't need "connect"
    }, [mode, serial, usb]);

    const print = useCallback(async (data: Uint8Array) => {
        if (mode === 'usb') return usb.print(data);
        if (mode === 'escpos') return serial.print(data);
        return false;
    }, [mode, serial, usb]);

    const disconnect = useCallback(async () => {
        if (mode === 'usb') return usb.disconnect();
        if (mode === 'escpos') return serial.disconnect();
    }, [mode, serial, usb]);

    const isConnected = mode === 'usb' ? usb.isConnected : (mode === 'escpos' ? serial.isConnected : true);
    const isPrinting = mode === 'usb' ? usb.isPrinting : (mode === 'escpos' ? serial.isPrinting : false);

    return {
        isPrinting,
        isConnected,
        connect,
        print,
        disconnect,
        printMode: mode
    };
}
