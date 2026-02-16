
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UseWebSerialReturn {
    isPrinting: boolean;
    isConnected: boolean;
    connect: () => Promise<boolean>;
    print: (data: Uint8Array) => Promise<boolean>;
    disconnect: () => Promise<void>;
}

export function useWebSerial(): UseWebSerialReturn {
    const [isPrinting, setIsPrinting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const portRef = useRef<any>(null);
    const { toast } = useToast();

    const connect = useCallback(async () => {
        if (!('serial' in navigator)) {
            toast({
                title: "Not Supported",
                description: "WebSerial is not supported in this browser.",
                variant: "destructive"
            });
            return false;
        }

        try {
            // First, try to see if we already have an authorized port
            const ports = await (navigator as any).serial.getPorts();
            let port = ports[0];

            if (!port) {
                // No authorized ports, request one from the user
                port = await (navigator as any).serial.requestPort();
            }

            if (port) {
                // Check if port is already open
                // In WebSerial, there isn't a direct 'isOpen' property, 
                // but checking readable/writable is a common way, 
                // or just catching the specific error.
                try {
                    await port.open({ baudRate: 9600 });
                } catch (openErr: any) {
                    // If it's already open, we might be fine, but we should verify it's the right one
                    if (openErr.name !== 'InvalidStateError') {
                        throw openErr;
                    }
                }
                
                portRef.current = port;
                setIsConnected(true);
                toast({ title: "Printer Connected", description: "Serial printer connected successfully." });
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error connecting to printer:', err);
            
            // Handle specific WebSerial errors
            if (err.name === 'NotFoundError') {
                // User cancelled the picker - no need for a scary error toast,
                // but we can inform them that no device was chosen.
                toast({ 
                    title: "No Device Selected", 
                    description: "Please select your printer from the list to continue.",
                    variant: "default"
                });
            } else if (err.name === 'SecurityError') {
                toast({ 
                    title: "Access Denied", 
                    description: "The browser blocked access to the serial port.",
                    variant: "destructive" 
                });
            } else {
                toast({ 
                    title: "Connection Failed", 
                    description: err.message || "Could not connect to printer.", 
                    variant: "destructive" 
                });
            }
            return false;
        }
    }, [toast]);

    const disconnect = useCallback(async () => {
        if (portRef.current) {
            try {
                await portRef.current.close();
                portRef.current = null;
                setIsConnected(false);
                toast({ title: "Disconnected", description: "Printer disconnected." });
            } catch (err) {
                console.error("Error closing port:", err);
            }
        }
    }, [toast]);

    const print = useCallback(async (data: Uint8Array) => {
        if (!portRef.current) {
            toast({ title: "No Printer", description: "Please connect a printer first.", variant: "destructive" });
            return false;
        }

        if (portRef.current.writable?.locked) {
            toast({ title: "Printer Busy", description: "Please wait for the current print to complete.", variant: "default" });
            return false;
        }

        setIsPrinting(true);
        let writer;
        try {
            writer = portRef.current.writable.getWriter();
            await writer.write(data);
            return true;
        } catch (err: any) {
            console.error('Printing error:', err);
            toast({ title: "Print Failed", description: "Failed to send data to printer.", variant: "destructive" });
            return false;
        } finally {
            if (writer) {
                writer.releaseLock();
            }
            setIsPrinting(false);
        }
    }, [toast]);

    return {
        isPrinting,
        isConnected,
        connect,
        print,
        disconnect
    };
}
