import { useCallback, useState } from 'react';
import { useWebSerial } from './use-web-serial';
import { useWebUSB } from './use-web-usb';

export interface UsePrinterReturn {
    isPrinting: boolean;
    isConnected: boolean;
    connect: () => Promise<boolean>;
    print: (data: Uint8Array) => Promise<boolean>;
    disconnect: () => Promise<void>;
    printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

export function usePrinter(mode: 'browser' | 'escpos' | 'usb' | 'native' = 'escpos'): UsePrinterReturn {
    const serial = useWebSerial();
    const usb = useWebUSB();
    
    // For native mode tracking
    const [nativeConnected, setNativeConnected] = useState(false);
    const [nativePrinting, setNativePrinting] = useState(false);

    const connect = useCallback(async () => {
        if (mode === 'native') {
            const api = (window as any).electronAPI;
            if (api && api.connectPrinter) {
                // Connecting directly to the Windows Printer Spooler Queue Name
                console.log("[usePrinter] Attempting native connection to explicit driver name: 'XP-58-P'");
                const success = await api.connectPrinter("XP-58-P");
                setNativeConnected(success);
                console.log("[usePrinter] Native connected:", success);
                return success;
            }
            return false;
        }
        if (mode === 'usb') return usb.connect();
        if (mode === 'escpos') return serial.connect();
        return true; // Browser mode doesn't need "connect"
    }, [mode, serial, usb]);

    const print = useCallback(async (data: Uint8Array) => {
        if (mode === 'native') {
            const api = (window as any).electronAPI;
            if (api && api.printData) {
                setNativePrinting(true);
                // Convert Uint8Array to a Base64 string to guarantee exactly correct bytes over Electron IPC
                const base64Data = btoa(String.fromCharCode.apply(null, data as unknown as number[]));
                const success = await api.printData(base64Data);
                setNativePrinting(false);
                return success;
            }
            return false;
        }
        if (mode === 'usb') return usb.print(data);
        if (mode === 'escpos') return serial.print(data);
        return false;
    }, [mode, serial, usb, nativeConnected]);

    const disconnect = useCallback(async () => {
        if (mode === 'native') {
            const api = (window as any).electronAPI;
            if (api && api.disconnectPrinter) {
                await api.disconnectPrinter();
                setNativeConnected(false);
            }
            return;
        }
        if (mode === 'usb') return usb.disconnect();
        if (mode === 'escpos') return serial.disconnect();
    }, [mode, serial, usb]);

    const isConnected = mode === 'native' ? nativeConnected : (mode === 'usb' ? usb.isConnected : (mode === 'escpos' ? serial.isConnected : true));
    const isPrinting = mode === 'native' ? nativePrinting : (mode === 'usb' ? usb.isPrinting : (mode === 'escpos' ? serial.isPrinting : false));

    return {
        isPrinting,
        isConnected,
        connect,
        print,
        disconnect,
        printMode: mode
    };
}
