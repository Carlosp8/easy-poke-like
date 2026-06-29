    // ║           🚀 INITIALIZATION                                 ║
    // ╚══════════════════════════════════════════════════════════════╝

    // Startup is last: all helpers above must be defined before timers begin.
    function printBanner() {
        console.log('%c╔══════════════════════════════════════════════════╗', 'color: #00ff88; font-weight: bold');
        console.log('%c║  Easy Pokelike v9.5 - Fusion Engine            ║', 'color: #00ff88; font-weight: bold');
        console.log('%c╠══════════════════════════════════════════════════╣', 'color: #00ff88; font-weight: bold');
        console.log('%c║  Story • Tower • Challenge • Weekly modes       ║', 'color: #88ffaa');
        console.log('%c║  Shiny, duplicate, item, MT and route tactics   ║', 'color: #88ffaa');
        console.log('%c║  Trait-aware drafting • Smart counter-picks     ║', 'color: #88ffaa');
        console.log('%c║  Telemetry • Anti-stuck • Auto-restart          ║', 'color: #88ffaa');
        console.log('%c╚══════════════════════════════════════════════════╝', 'color: #00ff88; font-weight: bold');
        console.log(`%c  Loop: ${CONFIG.LOOP_SPEED_MS}ms | Eevee: ${CONFIG.EEVEE_EVOLUTION_PREFERENCE} | Restart: ${getBotControlAutoRestartEnabled()}`, 'color: #aaaaaa');
    }

    // Stats reporter
    function reportStats() {
        const s = engineStats;
        log('info', '📊', `Stats — Loops: ${s.loops} | Catches: ${s.catches} | Map catches: ${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP} | Rerolls: ${s.rerolls} | Items: ${s.items} | Swaps: ${s.swaps}`);
    }

    // Start the engine
    printBanner();
    exposeRunHistoryHelpers();
    setInterval(engineLoop, CONFIG.LOOP_SPEED_MS);
    setInterval(reportStats, 60000); // Report every 60s

})();
