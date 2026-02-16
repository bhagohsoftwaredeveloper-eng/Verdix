
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UseWebUSBReturn {
    isPrinting: boolean;
    isConnected: boolean;
    connect: () => Promise<boolean>;
    print: (data: Uint8Array) => Promise<boolean>;
    disconnect: () => Promise<void>;
}

export function useWebUSB(): UseWebUSBReturn {
    const [isPrinting, setIsPrinting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const deviceRef = useRef<any>(null);
    const { toast } = useToast();

    const connect = useCallback(async () => {
        if (!('usb' in navigator)) {
            toast({
                title: "Not Supported",
                description: "WebUSB is not supported in this browser.",
                variant: "destructive"
            });
            return false;
        }

        try {
            // Request device from user
            const device = await (navigator as any).usb.requestDevice({ filters: [] });
            
            await device.open();
            
            // Thermal printers usually have 1 configuration
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }
            
            // Claim the first interface (usually index 0)
            await device.claimInterface(0);
            
            deviceRef.current = device;
            setIsConnected(true);
            toast({ title: "Printer Connected", description: `USB device ${device.productName} connected.` });
            return true;
        } catch (err: any) {
            console.error('Error connecting to USB printer:', err);
            if (err.name !== 'NotFoundError') {
                toast({ 
                    title: "USB Connection Failed", 
                    description: "Ensure the printer is not in use. On Windows, you may need to use Zadig to install the WinUSB driver for this device.", 
                    variant: "destructive" 
                });
            }
            return false;
        }
    }, [toast]);

    const disconnect = useCallback(async () => {
        if (deviceRef.current) {
            try {
                await deviceRef.current.close();
                deviceRef.current = null;
                setIsConnected(false);
                toast({ title: "Disconnected", description: "USB Printer disconnected." });
            } catch (err) {
                console.error("Error closing USB device:", err);
            }
        }
    }, [toast]);

    const print = useCallback(async (data: Uint8Array) => {
        if (!deviceRef.current) {
            toast({ title: "No Printer", description: "Please connect the USB printer first.", variant: "destructive" });
            return false;
        }

        setIsPrinting(true);
        try {
            // Thermal printers usually have an OUT endpoint on endpoint number 1, 2, or 3.
            // We'll look for the first bulk OUT endpoint.
            const device = deviceRef.current as any;
            const interface_ = device.configuration?.interfaces[0];
            const alternate = interface_?.alternates[0];
            const outEndpoint = alternate?.endpoints.find((e: any) => e.direction === 'out' && e.type === 'bulk');

            if (!outEndpoint) {
                throw new Error("Could not find a valid output endpoint on this USB device.");
            }

            // Send the data
            await device.transferOut(outEndpoint.endpointNumber, data);
            return true;
        } catch (err: any) {
            console.error('USB Printing error:', err);
            toast({ 
                title: "Print Failed", 
                description: "USB transfer failed. Check driver settings (WinUSB may be required).", 
                variant: "destructive" 
            });
            return false;
        } finally {
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
