import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { loadRazorpayScript } from './razorpayLoader.js';

describe('Razorpay Script Loader Utility', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;

  afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
  });

  test('Resolves true immediately if window.Razorpay already exists', async () => {
    global.window = { Razorpay: function MockRazorpay() {} };
    global.document = {};

    const result = await loadRazorpayScript();
    assert.strictEqual(result, true);
  });

  test('Resolves false gracefully if document is not defined (SSR environment)', async () => {
    global.window = undefined;
    global.document = undefined;

    const result = await loadRazorpayScript();
    assert.strictEqual(result, false);
  });

  test('Attaches script tag to document.body and resolves true on load', async () => {
    let appendedScript = null;

    global.window = {};
    global.document = {
      querySelector: () => null,
      createElement: (tag) => {
        return {
          tagName: tag.toUpperCase(),
          src: '',
          async: false,
          onload: null,
          onerror: null
        };
      },
      body: {
        appendChild: (elem) => {
          appendedScript = elem;
          setTimeout(() => {
            if (elem.onload) elem.onload();
          }, 5);
        }
      }
    };

    const result = await loadRazorpayScript();
    assert.strictEqual(result, true);
    assert.ok(appendedScript);
    assert.strictEqual(appendedScript.src, 'https://checkout.razorpay.com/v1/checkout.js');
  });

  test('Resolves false gracefully if script tag triggers error event', async () => {
    global.window = {};
    global.document = {
      querySelector: () => null,
      createElement: () => ({ src: '', onload: null, onerror: null }),
      body: {
        appendChild: (elem) => {
          setTimeout(() => {
            if (elem.onerror) elem.onerror();
          }, 5);
        }
      }
    };

    const result = await loadRazorpayScript();
    assert.strictEqual(result, false);
  });
});
