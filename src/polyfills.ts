// This file is a workaround for libraries (like @neondatabase/serverless)
// that try to polyfill 'fetch' by assigning to window.fetch.
// In some environments (like the AI Studio preview iframe), window.fetch is a getter-only property
// on the prototype, which causes "Cannot set property fetch of #<Window>" errors.

if (typeof window !== 'undefined') {
  try {
    // 1. Check if fetch is defined on Window.prototype
    const proto = Window.prototype;
    let desc = Object.getOwnPropertyDescriptor(proto, 'fetch');
    
    // 2. If it exists and is a getter-only (no setter), we need to patch it.
    if (desc && desc.get && !desc.set) {
      console.log('[Polyfill Patch] Detected read-only window.fetch on prototype.');
      
      // Strategy A: Try to define a setter on the prototype (if configurable)
      try {
        Object.defineProperty(proto, 'fetch', {
          get: desc.get,
          set: function(val: any) {
            console.warn('[Polyfill Patch] Blocked attempt to overwrite window.fetch (prototype setter) with:', val);
          },
          configurable: true,
          enumerable: desc.enumerable
        });
        console.log('[Polyfill Patch] Successfully patched Window.prototype.fetch');
      } catch (err) {
        console.warn('[Polyfill Patch] Failed to patch Window.prototype.fetch, trying instance override...', err);
        
        // Strategy B: Define a writable property on the window instance itself
        // This shadows the prototype getter.
        try {
            const originalFetch = window.fetch.bind(window); // Bind to window just in case
            Object.defineProperty(window, 'fetch', {
                value: originalFetch,
                writable: true,
                configurable: true,
                enumerable: true
            });
            console.log('[Polyfill Patch] Successfully defined writable window.fetch on instance.');
        } catch (instanceErr) {
             console.error('[Polyfill Patch] Failed to patch window.fetch on instance:', instanceErr);
        }
      }
    }
  } catch (e) {
    console.warn('[Polyfill Patch] General error in polyfill script:', e);
  }
}
