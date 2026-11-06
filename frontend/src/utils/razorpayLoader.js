/**
 * Reusable dynamic script loader for Razorpay Checkout SDK.
 * 
 * - Avoids duplicate script injection if Razorpay is already available or loading.
 * - Handles script-load errors safely.
 * - Returns a Promise resolving to boolean (true if loaded, false otherwise).
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    // If Razorpay SDK is already loaded on window
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }

    if (typeof document === 'undefined') {
      return resolve(false);
    }

    const scriptSrc = 'https://checkout.razorpay.com/v1/checkout.js';

    // Check if script tag is already in DOM
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
    if (existingScript) {
      // If already loaded
      if (window.Razorpay) {
        return resolve(true);
      }
      // If currently loading, attach event listeners
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    // Create and insert script tag
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout script from checkout.razorpay.com');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}
