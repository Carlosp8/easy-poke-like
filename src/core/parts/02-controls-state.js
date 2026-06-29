    // ║             🔧 ENGINE STATE                                 ║
    // ╚══════════════════════════════════════════════════════════════╝

    // Mutable engine state, persisted bot controls, panel rendering and drag helpers.
    let lastLoggedState = '';
    let stuckCounter = 0;
    let lastStateForStuck = '';
    let lastStuckProgressSignature = '';
    let lastMapDecisionFingerprint = '';
    let lastCatchRerollSignature = '';
    let lastCatchRerollAt = 0;
    let catchRerollAttemptsBySignature = {};
    let catchScreenSessionActive = false;
    let catchRerollsThisEncounter = 0;
    let sinnohCarryKnownTmTiers = {};
    let lastElitePrepBagClickSignature = '';
    let lastElitePrepBagClickAt = 0;
    let lastMapBagClickSignature = '';
    let lastMapBagClickAt = 0;
    let lastChosenItemName = '';
    let baggedItemCooldowns = {};
    let blockedItemAssignmentKeys = {};
    let pokemonRuntimeInfoCache = {};
    let currentRunTelemetry = null;
    let lastRunFinalizedAt = 0;
    let currentMapKey = '';
    let capturesThisMap = 0;
    let duplicatePriorityCatchNodesTaken = 0;
    let lastMapClickSignature = '';
    let repeatedMapClickCount = 0;
    let activeAutoRunMode = null;
    let activeChallengeContext = null;
    let lastTeamReorderSignature = '';
    let lastTeamReorderAt = 0;
    let teamReorderAttemptsBySignature = {};
    const BOT_CONTROL_TACTICS = {
        auto: 'Auto',
        boss: 'Boss prep',
        capture: 'Captura',
        shiny: 'Shiny',
        xp: 'XP',
        duplicate: 'Duplicados'
    };
    const BOT_CONTROL_RUN_MODES = {
        battleTower: 'Torre batalla',
        story: 'Historia',
        weeklyChallenges: 'Desafio semanal',
        challengeMode: 'Desafio',
        auto: 'Auto config',
        manual: 'Manual'
    };
    const BOT_CONTROL_DEFAULT_STATE = {
        paused: false,
        tactic: 'auto',
        runMode: 'battleTower',
        mapPreference: '',
        mainCarryKey: '',
        lockedKeys: [],
        panel: { x: 16, y: 128 },
        collapsed: false,
        duplicateCatches: false,
        starterMode: 'auto',
        autoRestart: CONFIG.AUTO_RESTART,
        starterPreference: ''
    };
    let botControlState = null;
    let botControlPanel = null;
    let botControlLastRenderSignature = '';
    let botControlInteractingUntil = 0;
    let engineStats = { loops: 0, screens: {}, catches: 0, items: 0, swaps: 0, rerolls: 0 };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║         📢 LOGGING SYSTEM                                   ║
    // ╚══════════════════════════════════════════════════════════════╝

    const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

    function log(level, emoji, msg) {
        if (LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.LOG_LEVEL]) {
            console.log(`${emoji} [Engine] ${msg}`);
        }
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║    🎛️ PHYSICS ENGINE (Click Simulation & Drag/Drop)         ║
    // ╚══════════════════════════════════════════════════════════════╝

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeBotControlState(raw = {}) {
        raw = raw && typeof raw === 'object' ? raw : {};
        return {
            ...BOT_CONTROL_DEFAULT_STATE,
            ...raw,
            tactic: BOT_CONTROL_TACTICS[raw.tactic] ? raw.tactic : BOT_CONTROL_DEFAULT_STATE.tactic,
            runMode: BOT_CONTROL_RUN_MODES[raw.runMode] ? raw.runMode : BOT_CONTROL_DEFAULT_STATE.runMode,
            mapPreference: raw.mapPreference || '',
            mainCarryKey: raw.mainCarryKey || '',
            lockedKeys: Array.isArray(raw.lockedKeys) ? [...new Set(raw.lockedKeys.filter(Boolean))] : [],
            panel: {
                x: Number.isFinite(raw?.panel?.x) ? raw.panel.x : BOT_CONTROL_DEFAULT_STATE.panel.x,
                y: Number.isFinite(raw?.panel?.y) ? raw.panel.y : BOT_CONTROL_DEFAULT_STATE.panel.y
            },
            collapsed: Boolean(raw.collapsed),
            duplicateCatches: raw.tactic === 'duplicate',
            paused: Boolean(raw.paused),
            starterMode: ['auto', 'manual', 'preferred'].includes(raw.starterMode)
                ? raw.starterMode
                : (raw.starterPreference ? 'preferred' : BOT_CONTROL_DEFAULT_STATE.starterMode),
            autoRestart: raw.autoRestart === undefined ? CONFIG.AUTO_RESTART : Boolean(raw.autoRestart),
            starterPreference: raw.starterPreference || ''
        };
    }

    function getBotControlState() {
        if (botControlState) return botControlState;
        try {
            const stored = localStorage.getItem(CONFIG.BOT_CONTROL_STORAGE_KEY);
            const legacyStored = !stored ? localStorage.getItem(CONFIG.BOT_CONTROL_LEGACY_STORAGE_KEY) : null;
            botControlState = normalizeBotControlState(JSON.parse(stored || legacyStored || '{}'));
            if (!stored && legacyStored) saveBotControlState();
        } catch (e) {
            botControlState = normalizeBotControlState();
        }
        return botControlState;
    }

    function saveBotControlState() {
        try {
            localStorage.setItem(CONFIG.BOT_CONTROL_STORAGE_KEY, JSON.stringify(getBotControlState()));
        } catch (e) {
            log('warn', 'controls', `Could not save controls: ${e.message}`);
        }
    }

    function updateBotControlState(patch = {}) {
        botControlState = normalizeBotControlState({ ...getBotControlState(), ...patch });
        saveBotControlState();
        botControlLastRenderSignature = '';
    }

    function getBotControlTactic() {
        return getBotControlState().tactic || 'auto';
    }

    function getBotControlRunMode() {
        return getBotControlState().runMode || BOT_CONTROL_DEFAULT_STATE.runMode;
    }

    function getBotControlMapPreference() {
        return foldText(getBotControlState().mapPreference || '');
    }

    function isBotPaused() {
        return Boolean(getBotControlState().paused);
    }

    function getBotControlSelectedMainKey() {
        return getBotControlState().mainCarryKey || '';
    }

    function getBotControlAutoRestartEnabled() {
        return Boolean(getBotControlState().autoRestart);
    }

    function getBotControlDuplicateCatchesEnabled() {
        const state = getBotControlState();
        return state.tactic === 'duplicate';
    }

    function isDuplicatePriorityMode() {
        return getBotControlTactic() === 'duplicate' && getBotControlDuplicateCatchesEnabled();
    }

    function canUseDuplicatePriorityCatchNode(team = []) {
        return Boolean(
            isDuplicatePriorityMode() &&
            duplicatePriorityCatchNodesTaken < CONFIG.DUPLICATE_PRIORITY_CATCH_NODE_LIMIT &&
            hasOpenTeamSlot(team)
        );
    }

    function shouldPrioritizeOpeningDuplicatePair(team = []) {
        const teamSize = (team || []).length;
        const freeSlots = Math.max(0, CONFIG.TEAM_TARGET_SIZE - teamSize);
        return Boolean(
            isDuplicatePriorityMode() &&
            duplicatePriorityCatchNodesTaken < CONFIG.DUPLICATE_PRIORITY_CATCH_NODE_LIMIT &&
            !hasDuplicatePair(team) &&
            freeSlots >= 2 &&
            teamSize <= CONFIG.EARLY_CORE_TEAM_SIZE
        );
    }

    function isBotControlLockedKey(key) {
        return Boolean(key && getBotControlState().lockedKeys.includes(key));
    }

    function isBotControlLockedUnit(unit) {
        return Boolean(unit && isBotControlLockedKey(getPokemonIdentityKey(unit.name)));
    }

    function toggleBotControlLockedKey(key) {
        if (!key) return;
        const state = getBotControlState();
        const locked = new Set(state.lockedKeys || []);
        if (locked.has(key)) locked.delete(key);
        else locked.add(key);
        updateBotControlState({ lockedKeys: [...locked] });
    }

    function ensureBotControlLockedKey(key, reason = 'auto') {
        if (!key || isBotControlLockedKey(key)) return false;
        const locked = new Set(getBotControlState().lockedKeys || []);
        locked.add(key);
        updateBotControlState({ lockedKeys: [...locked] });
        log('info', 'shiny', `Locked [${key}] (${reason}).`);
        return true;
    }

    function lockVisibleShinyTeamMembers(team, reason = 'shiny-team') {
        if (getBotControlTactic() !== 'shiny') return 0;
        let lockedCount = 0;
        (team || []).forEach(unit => {
            if (!unit?.isShiny || !unit.name) return;
            const key = getPokemonIdentityKey(unit.name);
            if (ensureBotControlLockedKey(key, reason)) lockedCount++;
        });
        return lockedCount;
    }

    function getBotControlTeamSignature(team) {
        return (team || []).map(unit => [
            unit.index,
            getPokemonIdentityKey(unit.name),
            unit.name,
            unit.hp || 0,
            unit.level || 0,
            unit.isFainted ? 'F' : 'A',
            unit.heldItem || ''
        ].join(':')).join('|');
    }

    function getPokemonSpriteSrcFromUnit(unit) {
        const img = unit?.element?.querySelector('img.poke-sprite, .poke-sprite-wrap img, img');
        return img ? (img.src || img.getAttribute('src') || '') : '';
    }

    function getBotControlPanelHtml(team) {
        const state = getBotControlState();
        const mainKey = state.mainCarryKey || '';
        const locked = new Set(state.lockedKeys || []);
        const tacticOptions = Object.entries(BOT_CONTROL_TACTICS).map(([key, label]) => {
            return `<option value="${escapeHtml(key)}"${state.tactic === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
        const runModeOptions = Object.entries(BOT_CONTROL_RUN_MODES).map(([key, label]) => {
            return `<option value="${escapeHtml(key)}"${state.runMode === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
        const starterModeOptions = [
            ['auto', 'Auto IA'],
            ['preferred', 'Forzar nombre'],
            ['manual', 'Jugador']
        ].map(([key, label]) => {
            return `<option value="${escapeHtml(key)}"${state.starterMode === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
        const mainOptions = [
            `<option value=""${!mainKey ? ' selected' : ''}>Auto</option>`,
            ...(team || []).map(unit => {
                const key = getPokemonIdentityKey(unit.name);
                const label = `${unit.name || 'slot'} Lv${unit.level || 0}`;
                return `<option value="${escapeHtml(key)}"${mainKey === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
            })
        ].join('');
        const slots = (team || []).map(unit => {
            const key = getPokemonIdentityKey(unit.name);
            const sprite = getPokemonSpriteSrcFromUnit(unit);
            const isMain = mainKey ? mainKey === key : isMainCarryUnit(unit);
            const isLocked = locked.has(key);
            const hp = Math.max(0, Math.min(100, unit.hp || 0));
            const hpClass = unit.isFainted || hp <= 0 ? ' is-fainted' : (hp < CONFIG.LOW_HP_THRESHOLD ? ' is-low' : '');
            const spriteHtml = sprite
                ? `<img class="e7c-slot-img" src="${escapeHtml(sprite)}" alt="">`
                : `<span class="e7c-slot-fallback">${escapeHtml((unit.name || '?').slice(0, 2).toUpperCase())}</span>`;
            const title = `${unit.name || 'unknown'} Lv${unit.level || 0} / ${hp}%${isLocked ? ' - bloqueado' : ''}${isMain ? ' - principal' : ''}`;
            return `
                <div class="e7c-mon${isMain ? ' is-main' : ''}${isLocked ? ' is-locked' : ''}${hpClass}" data-key="${escapeHtml(key)}" title="${escapeHtml(title)}">
                    <button class="e7c-mon-main" data-action="main" data-key="${escapeHtml(key)}" title="Marcar como principal">${isMain ? 'M' : '+'}</button>
                    <button class="e7c-mon-lock" data-action="lock" data-key="${escapeHtml(key)}" title="Bloquear o liberar reemplazo">
                        ${spriteHtml}
                    </button>
                    <span class="e7c-mon-hp" aria-hidden="true"><span style="width:${hp}%"></span></span>
                </div>
            `;
        }).join('') || '<div class="e7c-empty">Sin equipo visible</div>';

        return `
            <div class="e7c-head" data-drag-handle="true">
                <button class="e7c-icon-btn e7c-play" data-action="pause" data-short="${state.paused ? '>' : '||'}" title="${state.paused ? 'Reanudar' : 'Pausar'}">${state.paused ? 'Play' : 'Pause'}</button>
                <strong>Engine 7</strong>
                <button class="e7c-icon-btn" data-action="collapse" title="Plegar">${state.collapsed ? '+' : '-'}</button>
            </div>
            <div class="e7c-body"${state.collapsed ? ' hidden' : ''}>
                <label class="e7c-field">Modo run
                    <select data-action="run-mode">${runModeOptions}</select>
                </label>
                <label class="e7c-field">Mapa/region
                    <input type="text" data-action="map-input" value="${escapeHtml(state.mapPreference || '')}" placeholder="Auto o texto (ej: Sinnoh/Lorelei)" style="width:100%;min-height:30px;color:#f8fafc;background:#111827;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 8px;">
                </label>
                <label class="e7c-field">Tactica
                    <select data-action="tactic">${tacticOptions}</select>
                </label>
                <label class="e7c-field">Principal
                    <select data-action="main-select">${mainOptions}</select>
                </label>
                <label class="e7c-field">Starter
                    <select data-action="starter-mode">${starterModeOptions}</select>
                </label>
                <label class="e7c-field">Nombre starter
                    <input type="text" data-action="starter-input" value="${escapeHtml(state.starterPreference || '')}" placeholder="Nombre (ej: Dialga)" style="width:100%;min-height:30px;color:#f8fafc;background:#111827;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 8px;">
                </label>
                <label class="e7c-check">
                    <input type="checkbox" data-action="auto-restart"${state.autoRestart ? ' checked' : ''}>
                    <span>Restart automatico</span>
                </label>
                <div class="e7c-team">${slots}</div>
            </div>
        `;
    }

    function injectBotControlStyles() {
        if (document.getElementById('Engine-control-style')) return;
        const style = document.createElement('style');
        style.id = 'Engine-control-style';
        style.textContent = `
            #Engine-control-panel { position: fixed; z-index: 2147483647; width: min(360px, calc(100vw - 24px)); min-width: 224px; max-width: calc(100vw - 12px); min-height: 42px; max-height: min(620px, calc(100vh - 24px)); overflow: hidden; resize: both; background: rgba(18,24,31,.94); color: #f7fafc; border: 1px solid rgba(255,255,255,.18); box-shadow: 0 14px 36px rgba(0,0,0,.35); border-radius: 8px; font: 12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
            #Engine-control-panel.is-collapsed { width: auto; max-width: calc(100vw - 12px); max-height: 42px; }
            #Engine-control-panel * { box-sizing: border-box; }
            .e7c-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; padding: 8px; cursor: move; background: rgba(255,255,255,.08); user-select: none; }
            #Engine-control-panel.is-collapsed .e7c-head { grid-template-columns: auto auto; gap: 6px; padding: 6px; }
            .e7c-head strong { font-size: 13px; letter-spacing: 0; }
            #Engine-control-panel.is-collapsed .e7c-head strong { display: none; }
            .e7c-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 8px; padding: 8px; overflow: auto; max-height: calc(100% - 42px); }
            .e7c-field { display: grid; gap: 4px; color: #cbd5e1; }
            .e7c-field select { width: 100%; min-height: 30px; color: #f8fafc; background: #111827; border: 1px solid rgba(255,255,255,.2); border-radius: 6px; padding: 4px 8px; }
            .e7c-check { display: flex; align-items: center; gap: 8px; min-height: 28px; color: #cbd5e1; }
            .e7c-check input { width: 16px; height: 16px; accent-color: #74d680; }
            .e7c-team { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(42px, 1fr)); gap: 6px; }
            .e7c-mon { position: relative; aspect-ratio: 1; min-width: 0; min-height: 42px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.22); border-radius: 7px; background: linear-gradient(180deg, rgba(83,176,91,.95), rgba(42,126,62,.92)); padding: 2px; overflow: hidden; }
            .e7c-mon:hover { filter: brightness(1.08); }
            .e7c-mon.is-main { outline: 2px solid #facc15; outline-offset: -2px; }
            .e7c-mon.is-locked { background: linear-gradient(180deg, rgba(210,72,72,.96), rgba(139,38,38,.94)); }
            .e7c-mon.is-low:not(.is-locked) { background: linear-gradient(180deg, rgba(224,151,54,.96), rgba(151,92,29,.94)); }
            .e7c-mon.is-fainted { filter: grayscale(.8) brightness(.78); }
            .e7c-mon-lock { position: absolute; inset: 0; display: grid; place-items: center; border: 0; background: transparent; cursor: pointer; padding: 2px; }
            .e7c-mon-main { position: absolute; z-index: 2; top: 3px; left: 3px; width: 18px; height: 18px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.42); border-radius: 5px; color: #f8fafc; background: rgba(17,24,39,.64); cursor: pointer; font: 700 10px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding: 0; }
            .e7c-mon-main:hover { background: rgba(255,255,255,.18); }
            .e7c-mon.is-main .e7c-mon-main { color: #111827; background: #facc15; border-color: transparent; }
            .e7c-slot-img { width: 100%; height: 100%; max-width: 42px; max-height: 42px; object-fit: contain; }
            .e7c-slot-fallback { font-weight: 700; color: #e2e8f0; }
            .e7c-mon-hp { position: absolute; z-index: 2; left: 4px; right: 4px; bottom: 4px; height: 4px; border-radius: 4px; background: rgba(0,0,0,.35); overflow: hidden; pointer-events: none; }
            .e7c-mon-hp span { display: block; height: 100%; border-radius: inherit; background: #bbf7d0; }
            .e7c-mon.is-low .e7c-mon-hp span { background: #fde68a; }
            .e7c-mon.is-fainted .e7c-mon-hp span { background: #fecaca; }
            .e7c-icon-btn { min-width: 30px; min-height: 28px; border: 1px solid rgba(255,255,255,.18); border-radius: 6px; color: #f8fafc; background: rgba(255,255,255,.08); cursor: pointer; font: inherit; }
            .e7c-icon-btn:hover { background: rgba(255,255,255,.16); }
            #Engine-control-panel.is-collapsed .e7c-icon-btn { width: 32px; min-width: 32px; padding: 0; overflow: hidden; white-space: nowrap; }
            #Engine-control-panel.is-collapsed .e7c-play { font-size: 0; }
            #Engine-control-panel.is-collapsed .e7c-play::after { content: attr(data-short); font-size: 12px; }
            .e7c-empty { grid-column: 1 / -1; color: #a7b4c4; padding: 10px; text-align: center; }
            @media (max-width: 520px) {
                #Engine-control-panel { width: min(360px, calc(100vw - 12px)); max-height: calc(100vh - 12px); }
                .e7c-body { max-height: calc(100vh - 58px); }
            }
        `;
        document.head?.appendChild(style);
    }

    function holdBotControlRender(ms = 2500) {
        botControlInteractingUntil = Date.now() + ms;
    }

    function attachBotControlHandlers(panel) {
        panel.onpointerdown = () => holdBotControlRender(3000);
        panel.onfocusin = () => holdBotControlRender(3000);

        panel.onclick = event => {
            const button = event.target.closest('[data-action]');
            if (!button || !panel.contains(button)) return;
            const action = button.getAttribute('data-action');
            if (action === 'pause') {
                updateBotControlState({ paused: !getBotControlState().paused });
            } else if (action === 'collapse') {
                updateBotControlState({ collapsed: !getBotControlState().collapsed });
            } else if (action === 'lock') {
                toggleBotControlLockedKey(button.getAttribute('data-key'));
            } else if (action === 'main') {
                const key = button.getAttribute('data-key') || '';
                updateBotControlState({ mainCarryKey: getBotControlState().mainCarryKey === key ? '' : key });
            }
            renderBotControlPanel(true);
        };
        panel.onchange = event => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'run-mode') updateBotControlState({ runMode: target.value || 'battleTower' });
            else if (action === 'tactic') updateBotControlState({ tactic: target.value });
            else if (action === 'main-select') updateBotControlState({ mainCarryKey: target.value || '' });
            else if (action === 'starter-mode') updateBotControlState({ starterMode: target.value || 'auto' });
            else if (action === 'auto-restart') updateBotControlState({ autoRestart: Boolean(target.checked) });
            else if (action === 'starter-input') updateBotControlState({ starterPreference: target.value });
            else if (action === 'map-input') updateBotControlState({ mapPreference: target.value });
            renderBotControlPanel(true);
        };
        panel.addEventListener('input', event => {
            holdBotControlRender(3000);
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'starter-input') updateBotControlState({ starterPreference: target.value });
            else if (action === 'map-input') updateBotControlState({ mapPreference: target.value });
        });

        const handle = panel.querySelector('[data-drag-handle]');
        if (!handle) return;
        handle.onpointerdown = event => {
            if (event.target.closest('button, select, input, label')) return;
            const state = getBotControlState();
            const startX = event.clientX;
            const startY = event.clientY;
            const startLeft = state.panel.x;
            const startTop = state.panel.y;
            handle.setPointerCapture?.(event.pointerId);
            const move = moveEvent => {
                const nextX = Math.max(4, Math.min(window.innerWidth - panel.offsetWidth - 4, startLeft + moveEvent.clientX - startX));
                const nextY = Math.max(4, Math.min(window.innerHeight - panel.offsetHeight - 4, startTop + moveEvent.clientY - startY));
                panel.style.left = `${nextX}px`;
                panel.style.top = `${nextY}px`;
                state.panel = { x: nextX, y: nextY };
            };
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                saveBotControlState();
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        };
    }

    function renderBotControlPanel(force = false) {
        if (!botControlPanel || !document.body) return;

        const isInteracting = Date.now() < botControlInteractingUntil ||
                              (botControlPanel.contains(document.activeElement) &&
                              ['INPUT', 'SELECT'].includes(document.activeElement?.tagName));

        if (!force && isInteracting) return;

        const team = parseTeamStatus();
        const state = getBotControlState();
        const signature = JSON.stringify({ state, team: getBotControlTeamSignature(team) });
        if (!force && signature === botControlLastRenderSignature) return;

        const activeAction = isInteracting ? document.activeElement.getAttribute('data-action') : null;
        const activeIsTextInput = activeAction &&
                                  document.activeElement.tagName === 'INPUT' &&
                                  ['text', 'search', ''].includes(document.activeElement.type || '');
        const activeSelStart = activeIsTextInput ? document.activeElement.selectionStart : null;
        const activeSelEnd = activeIsTextInput ? document.activeElement.selectionEnd : null;

        botControlLastRenderSignature = signature;
        botControlPanel.style.left = `${state.panel.x}px`;
        botControlPanel.style.top = `${state.panel.y}px`;
        botControlPanel.classList.toggle('is-collapsed', Boolean(state.collapsed));
        botControlPanel.innerHTML = getBotControlPanelHtml(team);
        attachBotControlHandlers(botControlPanel);

        if (force && activeAction) {
            const toFocus = botControlPanel.querySelector(`[data-action="${activeAction}"]`);
            if (toFocus) {
                toFocus.focus();
                if (toFocus.tagName === 'INPUT' && activeSelStart !== null) {
                    toFocus.setSelectionRange(activeSelStart, activeSelEnd);
                }
            }
        }
    }

    function ensureBotControlPanel() {
        if (!document.body) return;
        injectBotControlStyles();
        if (!botControlPanel) {
            botControlPanel = document.createElement('div');
            botControlPanel.id = 'Engine-control-panel';
            document.body.appendChild(botControlPanel);
        }
        renderBotControlPanel();
    }

    function triggerRealClick(element, options = {}) {
        if (!element) return false;
        const target = element.querySelector('rect') || element.querySelector('image') || element;
        const rect = target.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) return false;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pointerOpts = { view: window, bubbles: true, cancelable: true, buttons: 1, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true };
        const mouseOpts = { view: window, bubbles: true, cancelable: true, buttons: 1, clientX: cx, clientY: cy };
        const dispatchTargets = options.singleTarget
            ? [target]
            : [
                target,
                element,
                document.elementFromPoint(cx, cy)
            ].filter(Boolean);
        [...new Set(dispatchTargets)].forEach(clickTarget => {
            clickTarget.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
            clickTarget.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
            clickTarget.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
            clickTarget.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, buttons: 0 }));
            clickTarget.dispatchEvent(new MouseEvent('click', mouseOpts));
        });
        return true;
    }

    function simulateDragAndDrop(sourceElem, targetElem) {
        if (!sourceElem || !targetElem || sourceElem === targetElem) return false;

        const srcRect = sourceElem.getBoundingClientRect();
        const tgtRect = targetElem.getBoundingClientRect();
        const srcX = srcRect.left + srcRect.width / 2;
        const srcY = srcRect.top + srcRect.height / 2;
        const tgtX = tgtRect.left + tgtRect.width / 2;
        const tgtY = tgtRect.top + tgtRect.height / 2;

        const downOpts = { clientX: srcX, clientY: srcY, bubbles: true, cancelable: true, view: window, buttons: 1, pointerId: 1, isPrimary: true };
        sourceElem.dispatchEvent(new PointerEvent('pointerdown', downOpts));
        sourceElem.dispatchEvent(new MouseEvent('mousedown', downOpts));

        // Simulate intermediate move steps for smoother gesture detection
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            const ratio = i / steps;
            const mx = srcX + (tgtX - srcX) * ratio;
            const my = srcY + (tgtY - srcY) * ratio;
            const moveOpts = { clientX: mx, clientY: my, bubbles: true, cancelable: true, view: window, buttons: 1, pointerId: 1, isPrimary: true };
            sourceElem.dispatchEvent(new PointerEvent('pointermove', moveOpts));
            sourceElem.dispatchEvent(new MouseEvent('mousemove', moveOpts));
            document.dispatchEvent(new PointerEvent('pointermove', moveOpts));
            document.dispatchEvent(new MouseEvent('mousemove', moveOpts));
            window.dispatchEvent(new PointerEvent('pointermove', moveOpts));
        }

        const upOpts = { clientX: tgtX, clientY: tgtY, bubbles: true, cancelable: true, view: window, button: 0, buttons: 0, pointerId: 1, isPrimary: true };
        
        // Dispatch pointerup and mouseup on both target and source elements to cover capture listeners
        targetElem.dispatchEvent(new PointerEvent('pointerup', upOpts));
        targetElem.dispatchEvent(new MouseEvent('mouseup', upOpts));
        sourceElem.dispatchEvent(new PointerEvent('pointerup', upOpts));
        sourceElem.dispatchEvent(new MouseEvent('mouseup', upOpts));

        // Dispatch lostpointercapture on source element to cleanly terminate synthetic capture
        sourceElem.dispatchEvent(new PointerEvent('lostpointercapture', { clientX: tgtX, clientY: tgtY, bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true }));

        // Dispatch on document and window for global listeners
        document.dispatchEvent(new PointerEvent('pointerup', upOpts));
        document.dispatchEvent(new MouseEvent('mouseup', upOpts));
        window.dispatchEvent(new PointerEvent('pointerup', upOpts));
        window.dispatchEvent(new MouseEvent('mouseup', upOpts));

        log('info', '🫴', `Drag ${sourceElem.className} → ${targetElem.className}`);
        return true;
    }

    function getTeamUnitStableKey(unit) {
        if (!unit) return '';
        const name = foldText(unit.name || '');
        if (!name) return '';
        const types = normalizeTypeList(unit.types || []).join('/');
        const attacks = normalizeTypeList(unit.attackTypes || getUnitAttackTypes(unit) || []).join('/');
        return [
            name,
            unit.level || 0,
            unit.hp || 0,
            unit.isFainted ? 'fainted' : 'alive',
            normalizeItemName(unit.heldItem || ''),
            types,
            attacks
        ].join(':');
    }

    function getElementUnitStableKey(element) {
        if (!element) return '';
        const info = parsePokemonInfoFromCard(element, 'reorder-key');
        const name = info?.name || getPokemonNameFromCard(element);
        if (!name) return '';
        const hp = info?.hp?.percent ?? parseCardHp(element)?.percent ?? 0;
        const heldItem = getHeldItem(element) || '';
        const types = normalizeTypeList(info?.types || getKnownPokemonTypes(name)).join('/');
        const attacks = normalizeTypeList(info?.attackTypes || getAttackTypesFromElement(element, info?.types || [])).join('/');
        return [
            foldText(name),
            info?.level || parseLevelText(element.innerText || ''),
            hp,
            hp === 0 ? 'fainted' : 'alive',
            normalizeItemName(heldItem),
            types,
            attacks
        ].join(':');
    }

    function getReorderKey(unit, element) {
        return getTeamUnitStableKey(unit) || getElementUnitStableKey(element);
    }

    function getReorderIdentityKey(unit, element) {
        const name = unit?.name || getPokemonNameFromCard(element);
        return getPokemonIdentityKey(name);
    }

    function areSameReorderIdentity(sourceUnit, targetUnit, sourceElem, targetElem) {
        const sourceIdentity = getReorderIdentityKey(sourceUnit, sourceElem);
        const targetIdentity = getReorderIdentityKey(targetUnit, targetElem);
        return Boolean(sourceIdentity && targetIdentity && sourceIdentity === targetIdentity);
    }

    function shouldSkipLowValueDuplicateReorder(sourceUnit, targetUnit, sourceElem, targetElem, reason) {
        if (!areSameReorderIdentity(sourceUnit, targetUnit, sourceElem, targetElem)) return false;
        if (reason === 'fainted-lead' || reason === 'lead-level-correction' || reason === 'lead-item-holder') return false;
        if (!sourceUnit || !targetUnit) return false;
        if (sourceUnit.isFainted !== targetUnit.isFainted) return false;

        const levelGap = Math.abs((sourceUnit.level || 0) - (targetUnit.level || 0));
        const hpGap = Math.abs((sourceUnit.hp || 0) - (targetUnit.hp || 0));
        const itemDiffers = normalizeItemName(sourceUnit.heldItem || '') !== normalizeItemName(targetUnit.heldItem || '');
        return !itemDiffers && levelGap <= 3 && hpGap <= 30;
    }

    function tryTeamReorder(sourceElem, targetElem, sourceUnit = null, targetUnit = null, reason = 'team-order') {
        if (!sourceElem || !targetElem || sourceElem === targetElem) return false;

        const sourceKey = getReorderKey(sourceUnit, sourceElem);
        const targetKey = getReorderKey(targetUnit, targetElem);
        if (sourceKey && targetKey && sourceKey === targetKey) {
            log('debug', '🎯', `Skipping reorder of equivalent duplicate [${sourceKey.split(':')[0]}].`);
            return false;
        }

        if (shouldSkipLowValueDuplicateReorder(sourceUnit, targetUnit, sourceElem, targetElem, reason)) {
            log('debug', 'team-order', `Skipping low-value duplicate reorder [${sourceUnit.name}] (${reason}).`);
            return false;
        }

        const signature = `${reason}:${sourceKey || sourceElem.className}->${targetKey || targetElem.className}`;
        const now = Date.now();
        if (signature === lastTeamReorderSignature && now - lastTeamReorderAt < CONFIG.TEAM_REORDER_REPEAT_COOLDOWN_MS) {
            log('warn', '🎯', `Skipping repeated reorder (${reason}); keeping current order and continuing.`);
            return false;
        }

        const attempts = teamReorderAttemptsBySignature[signature] || { count: 0, firstAt: now, lastAt: 0, blockedUntil: 0 };
        if (attempts.blockedUntil > now) {
            log('warn', 'team-order', `Reorder signature blocked after repeated failed attempts (${reason}); waiting ${Math.ceil((attempts.blockedUntil - now) / 1000)}s.`);
            return false;
        }
        if (now - attempts.firstAt > CONFIG.TEAM_REORDER_ATTEMPT_WINDOW_MS) {
            attempts.count = 0;
            attempts.firstAt = now;
            attempts.blockedUntil = 0;
        }
        if (attempts.count >= CONFIG.TEAM_REORDER_MAX_ATTEMPTS_PER_SIGNATURE) {
            attempts.blockedUntil = now + CONFIG.TEAM_REORDER_STALE_BLOCK_MS;
            attempts.lastAt = now;
            teamReorderAttemptsBySignature[signature] = attempts;
            log('warn', 'team-order', `Blocking stale reorder (${reason}) after ${attempts.count} attempts.`);
            return false;
        }

        lastTeamReorderSignature = signature;
        lastTeamReorderAt = now;
        attempts.count++;
        attempts.lastAt = now;
        teamReorderAttemptsBySignature[signature] = attempts;
        return simulateDragAndDrop(sourceElem, targetElem);
    }

    // ╔══════════════════════════════════════════════════════════════╗
