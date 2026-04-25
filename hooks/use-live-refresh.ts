/**
 * use-live-refresh.ts
 *
 * A shared hook that subscribes to system-wide "stock-updated" events
 * across all open browser tabs and calls the provided refetch function.
 */
import { useEffect, useCallback } from 'react';

// Use a unique channel name for the app
const CHANNEL_NAME = 'stock-pilot-updates';

/**
 * Subscribes to 'stock-updated' events via BroadcastChannel (cross-tab)
 * and Window Events (same-tab) to call refetch automatically.
 */
export function useLiveRefresh(refetch: () => void) {
  useEffect(() => {
    // 1. Same-tab listener (fastest)
    const handleSameTabRefresh = () => {
      console.log('[LiveRefresh] Refreshing due to same-tab event');
      refetch();
    };

    // 2. Cross-tab listener (BroadcastChannel)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data === 'stock-updated') {
          console.log('[LiveRefresh] Refreshing due to cross-tab event');
          refetch();
        }
      };
    } catch (e) {
      console.warn('[LiveRefresh] BroadcastChannel not supported, falling back to window events only.');
    }

    window.addEventListener('stock-updated', handleSameTabRefresh);

    return () => {
      window.removeEventListener('stock-updated', handleSameTabRefresh);
      if (channel) {
        channel.close();
      }
    };
  }, [refetch]);
}

/**
 * Dispatches a system-wide 'stock-updated' event to trigger auto-refresh
 * in all listening modules across all open tabs.
 */
export function dispatchStockUpdate() {
  console.log('[LiveRefresh] Dispatching global update event');
  
  // Dispatch in current tab
  window.dispatchEvent(new Event('stock-updated'));

  // Dispatch to other tabs
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage('stock-updated');
    channel.close();
  } catch (e) {
    // Fallback for older browsers or restricted environments
  }
}
