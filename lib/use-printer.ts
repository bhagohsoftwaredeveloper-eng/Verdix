import { useCallback, useState } from 'react';
import { useWebSerial } from './use-web-serial';
import { useWebUSB } from './use-web-usb';

export interface UsePrinterReturn {
    isPrinting: boolean;
    isConnected: boolean;
    connect: () => Promise<boolean>;
    print: (data: Uint8Array) => Promise<boolean>;
    disconnect: () => Promise<void>;
    cut: () => Promise<boolean>;
    openDrawer: () => Promise<boolean>;
    printMode: 'browser' | 'escpos' | 'usb' | 'native' | 'epson';
}

export function usePrinter(mode: 'browser' | 'escpos' | 'usb' | 'native' | 'epson' = 'escpos', printerName?: string): UsePrinterReturn {
    const serial = useWebSerial();
    const usb = useWebUSB();
    
    // For native mode tracking
    const [nativeConnected, setNativeConnected] = useState(false);
    const [nativePrinting, setNativePrinting] = useState(false);

    const connect = useCallback(async () => {
        if (mode === 'native') {
            const api = (window as any).electronAPI;
            if (api && api.connectPrinter) {
                const targetPrinter = printerName || "XP-58-P";
                // Connecting directly to the Windows Printer Spooler Queue Name
                console.log(`[usePrinter] Attempting native connection to explicit driver name: '${targetPrinter}'`);
                const success = await api.connectPrinter(targetPrinter);
                setNativeConnected(success);
                console.log("[usePrinter] Native connected:", success);
                return success;
            }
            return false;
        }
        if (mode === 'epson') {
            const api = (window as any).electronAPI;
            if (api && api.connectEpsonPrinter) {
                const targetPrinter = printerName || "USB001";
                console.log(`[usePrinter] Attempting Epson SDK connection to: '${targetPrinter}'`);
                const success = await api.connectEpsonPrinter(targetPrinter);
                setNativeConnected(success);
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
        if (mode === 'epson') {
            const api = (window as any).electronAPI;
            if (api && api.printEpsonData) {
                setNativePrinting(true);
                const base64Data = btoa(String.fromCharCode.apply(null, data as unknown as number[]));
                const success = await api.printEpsonData(base64Data);
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
        if (mode === 'epson') {
            const api = (window as any).electronAPI;
            if (api && api.disconnectEpsonPrinter) {
                await api.disconnectEpsonPrinter();
                setNativeConnected(false);
            }
            return;
        }
        if (mode === 'usb') return usb.disconnect();
        if (mode === 'escpos') return serial.disconnect();
    }, [mode, serial, usb]);

    const cut = useCallback(async () => {
        if (mode === 'epson') {
            const api = (window as any).electronAPI;
            if (api && api.cutEpsonPaper) {
                return await api.cutEpsonPaper();
            }
        }
        return false;
    }, [mode]);

    const openDrawer = useCallback(async () => {
        if (mode === 'epson') {
            const api = (window as any).electronAPI;
            if (api && api.openEpsonDrawer) {
                return await api.openEpsonDrawer();
            }
        }
        return false;
    }, [mode]);

    const isConnected = mode === 'native' || mode === 'epson' ? nativeConnected : (mode === 'usb' ? usb.isConnected : (mode === 'escpos' ? serial.isConnected : true));
    const isPrinting = mode === 'native' || mode === 'epson' ? nativePrinting : (mode === 'usb' ? usb.isPrinting : (mode === 'escpos' ? serial.isPrinting : false));

    return {
        isPrinting,
        isConnected,
        connect,
        print,
        disconnect,
        cut,
        openDrawer,
        printMode: mode
    };
}
