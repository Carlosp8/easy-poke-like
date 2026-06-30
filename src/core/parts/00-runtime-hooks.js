    // Runtime guards live first because later synthetic clicks can trigger
    // browser pointer-capture errors before the engine has started.
    const POINTER_CAPTURE_GUARD_KEY = '__easyPokelikePointerCaptureGuard';

    function shouldWarnPointerCaptureGuard(options = {}) {
        return options.warn !== false && globalThis.__easyPokelikePointerGuardWarnings !== false;
    }

    function invokePointerCaptureGuard(original, element, pointerId, action, logger, options = {}) {
        if (typeof original !== 'function') return;
        try {
            original.call(element, pointerId);
        } catch (e) {
            if (e && e.name === 'NotFoundError') {
                if (shouldWarnPointerCaptureGuard(options) && logger?.warn) {
                    logger.warn(`[Engine] Swallowed ${action} NotFoundError for pointerId:`, pointerId);
                }
                return;
            }
            throw e;
        }
    }

    function installPointerCaptureGuard(elementPrototype = globalThis.Element?.prototype, options = {}) {
        if (!elementPrototype || elementPrototype[POINTER_CAPTURE_GUARD_KEY]) {
            return false;
        }

        const logger = options.logger || console;
        const originalSetPointerCapture = elementPrototype.setPointerCapture;
        const originalReleasePointerCapture = elementPrototype.releasePointerCapture;

        Object.defineProperty(elementPrototype, POINTER_CAPTURE_GUARD_KEY, {
            value: {
                originalSetPointerCapture,
                originalReleasePointerCapture
            },
            configurable: false,
            enumerable: false,
            writable: false
        });

        elementPrototype.setPointerCapture = function(pointerId) {
            invokePointerCaptureGuard(originalSetPointerCapture, this, pointerId, 'setPointerCapture', logger, options);
        };

        elementPrototype.releasePointerCapture = function(pointerId) {
            invokePointerCaptureGuard(originalReleasePointerCapture, this, pointerId, 'releasePointerCapture', logger, options);
        };

        return true;
    }

    installPointerCaptureGuard();

    // ========================================================================
