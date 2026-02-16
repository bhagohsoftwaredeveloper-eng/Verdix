import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import React from 'react';


export const printReactComponent = (component: React.ReactNode, paperSize: '58mm' | '80mm' = '80mm') => {
    // Clean up any existing print iframes first
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) {
        document.body.removeChild(existingIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = paperSize === '80mm' ? '80mm' : '58mm';
    iframe.style.height = '100vh'; // Ensure enough height for content
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Set base href to ensure relative links work
    const base = doc.createElement('base');
    base.href = window.location.origin;
    doc.head.appendChild(base);

    // Copy styles from main document
    // We prioritize <link rel="stylesheet"> and <style> tags
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(node => {
        const clone = node.cloneNode(true) as HTMLElement;
        if (clone.tagName === 'LINK' && (clone as HTMLLinkElement).href) {
            // Absolute URL is safer for iframes
            (clone as HTMLLinkElement).href = new URL((node as HTMLLinkElement).href, window.location.href).href;
        }
        doc.head.appendChild(clone);
    });

    // Add specific print styles
    const style = doc.createElement('style');
    style.textContent = `
        @page { size: ${paperSize} auto; margin: 0; }
        body { margin: 0; padding: 0; background-color: white !important; color: black !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    `;
    doc.head.appendChild(style);

    // Create a container for React
    const container = doc.createElement('div');
    container.id = 'print-root';
    doc.body.appendChild(container);

    const root = createRoot(container);
    
    // Render
    flushSync(() => {
        root.render(component);
    });

    // Wait for content to render and resources (fonts/styles) to apply
    setTimeout(() => {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        } catch (error) {
            console.error("Print failed:", error);
        } finally {
            // Delay removal to ensure print dialog has taken over
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 5000); 
        }
    }, 1000); 
};
