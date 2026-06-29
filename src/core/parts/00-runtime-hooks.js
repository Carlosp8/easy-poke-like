(function() {
    'use strict';

    // Runtime guards live first because later synthetic clicks can trigger
    // browser pointer-capture errors before the engine has started.
    // --- Hook setPointerCapture/releasePointerCapture to swallow NotFoundError from synthetic events ---
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function(pointerId) {
        try {
            if (originalSetPointerCapture) {
                originalSetPointerCapture.call(this, pointerId);
            }
        } catch (e) {
            if (e.name === 'NotFoundError') {
                console.warn('[Engine] Swallowed setPointerCapture NotFoundError for pointerId:', pointerId);
            } else {
                throw e;
            }
        }
    };

    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.releasePointerCapture = function(pointerId) {
        try {
            if (originalReleasePointerCapture) {
                originalReleasePointerCapture.call(this, pointerId);
            }
        } catch (e) {
            if (e.name === 'NotFoundError') {
                console.warn('[Engine] Swallowed releasePointerCapture NotFoundError for pointerId:', pointerId);
            } else {
                throw e;
            }
        }
    };

    // ╔══════════════════════════════════════════════════════════════╗
