    // ║         🔍 STATE DETECTION (Priority-based)                 ║
    // ╚══════════════════════════════════════════════════════════════╝

    // DOM parsing, run context detection and high-level tactical heuristics.
    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function isLikelyItemTargetModal(modal) {
        if (!modal || !isVisible(modal)) return false;
        const idClass = foldText(`${modal.id || ''} ${modal.getAttribute?.('class') || ''} ${modal.getAttribute?.('role') || ''}`);
        const text = foldText((modal.innerText || modal.textContent || '').slice(0, 800));
        const pendingUsableItem = Boolean(lastChosenItemName && USABLE_ITEMS.has(normalizeItemName(lastChosenItemName)));
        const hasPokemonTargets = Boolean(modal.querySelector(
            '.equip-pokemon-row, .pokemon-row, .poke-row, .party-slot, .team-slot, .poke-card, .pokemon-card, [data-pokemon-index], [data-team-index]'
        ));

        if (idClass.match(/item|equip|usable|use-item/)) return true;
        if (text.match(/tm normal|mt normal|move tutor|tutor de movimientos|tutor movimientos|rare candy|caramelo raro|moon stone|piedra lunar|use item|usar objeto|equip item|equipar objeto/)) return true;
        return pendingUsableItem &&
            hasPokemonTargets &&
            text.match(/choose|select|target|pokemon|poke|player|jugador|elige|selecciona|objetivo/);
    }

    function getActiveItemModal() {
        const modals = [
            document.getElementById('item-equip-modal'),
            document.getElementById('usable-item-modal')
        ];
        const directModal = modals.find(modal => modal && isVisible(modal));
        if (directModal) return directModal;

        const genericModals = Array.from(document.querySelectorAll(
            '[role="dialog"], .modal, [class*="modal"], .dialog, [class*="dialog"], .overlay, [class*="overlay"]'
        ));
        return genericModals.find(modal => isLikelyItemTargetModal(modal));
    }

    function getPokemonRowActionTarget(row, options = {}) {
        if (!row || !isVisible(row)) return null;

        const disabledText = foldText([
            row.getAttribute?.('class') || '',
            row.getAttribute?.('aria-disabled') || '',
            row.getAttribute?.('data-disabled') || '',
            row.getAttribute?.('data-usable') || '',
            row.getAttribute?.('data-valid') || '',
            row.title || '',
            row.getAttribute?.('aria-label') || ''
        ].join(' '));
        if (row.matches('[disabled], [aria-disabled="true"]') ||
            disabledText.match(/disabled|locked|unavailable|invalid|cannot|no target|not usable|unusable|bloquead|deshabilitad|no usable|no valido/)) {
            return null;
        }

        const button = row.querySelector('button:not([disabled]), .btn:not(.disabled), [role="button"]:not([aria-disabled="true"])');
        if (button && isVisible(button)) return button;

        const style = window.getComputedStyle(row);
        if (style.pointerEvents === 'none') return null;

        const opacity = Number.parseFloat(style.opacity);
        if (!Number.isNaN(opacity) && opacity < 0.5) return null;

        const hasDirectAction = Boolean(
            row.onclick ||
            row.matches('[role="button"], [onclick], [data-action], [data-target], [tabindex]') ||
            disabledText.match(/clickable|selectable|option|choice|row|pokemon-row|equip-pokemon-row/) ||
            style.cursor === 'pointer'
        );
        if (hasDirectAction) return row;

        const hasPokemonSignal = Boolean(row.querySelector(
            '.equip-poke-name, .team-slot-name, .poke-card-name, .pokemon-name, [class*="poke-name"], [class*="pokemon-name"], .hp-bar, [class*="level"], [class*="lv"], img[src*="pokemon"], img[src*="sprites"]'
        )) || foldText(row.innerText || '').match(/\b(lv|lvl|nivel|hp|ps)\b/);
        return options.allowPokemonRow && hasPokemonSignal ? row : null;
    }

    function getItemModalTargetRows(modal) {
        if (!modal) return [];
        const selectors = [
            '.equip-pokemon-row',
            '.pokemon-row',
            '.poke-row',
            '.party-pokemon-row',
            '.party-slot',
            '.team-slot',
            '.poke-card',
            '.pokemon-card',
            '[data-pokemon-index]',
            '[data-team-index]',
            '[data-idx]'
        ];
        const seen = new Set();
        return selectors
            .flatMap(selector => Array.from(modal.querySelectorAll(selector)))
            .filter(row => {
                if (!row || seen.has(row) || !isVisible(row)) return false;
                seen.add(row);
                const text = foldText([
                    row.innerText || row.textContent || '',
                    row.getAttribute?.('aria-label') || '',
                    row.getAttribute?.('title') || '',
                    row.getAttribute?.('class') || ''
                ].join(' '));
                const hasPokemonSignal = Boolean(row.querySelector(
                    '.equip-poke-name, .team-slot-name, .poke-card-name, .pokemon-name, [class*="poke-name"], [class*="pokemon-name"], .hp-bar, [class*="level"], [class*="lv"], img[src*="pokemon"], img[src*="sprites"]'
                )) || text.match(/\b(lv|lvl|nivel|hp|ps)\b/);
                const looksLikeExit = text.match(/\b(cancel|close|skip|bag|back|cancelar|cerrar|saltar|mochila|volver)\b/);
                return hasPokemonSignal && !looksLikeExit;
            });
    }

    function findItemModalExitControl(modal, preferBag = true) {
        const orderedSelectors = preferBag
            ? [
                '#btn-equip-to-bag',
                '#btn-cancel-use',
                '#btn-equip-cancel',
                '.btn-close',
                '.modal-close',
                '[data-action*="bag"]',
                '[data-action*="cancel"]',
                '[aria-label*="close"]',
                '[aria-label*="Close"]',
                '[aria-label*="cancel"]',
                '[aria-label*="Cancel"]'
            ]
            : [
                '#btn-cancel-use',
                '#btn-equip-cancel',
                '#btn-equip-to-bag',
                '.btn-close',
                '.modal-close',
                '[data-action*="cancel"]',
                '[data-action*="bag"]',
                '[aria-label*="close"]',
                '[aria-label*="Close"]',
                '[aria-label*="cancel"]',
                '[aria-label*="Cancel"]'
            ];

        for (const selector of orderedSelectors) {
            const scoped = modal ? Array.from(modal.querySelectorAll(selector)) : [];
            const global = selector.startsWith('#') ? [document.querySelector(selector)].filter(Boolean) : [];
            const control = [...scoped, ...global].find(item => isEnabledActionControl(item));
            if (control) return control;
        }

        const textPatterns = preferBag
            ? [
                /\b(bag|mochila|keep|guardar|send to bag|to bag)\b/,
                /\b(cancel|close|skip|back|cancelar|cerrar|saltar|volver)\b/
            ]
            : [
                /\b(cancel|close|skip|back|cancelar|cerrar|saltar|volver)\b/,
                /\b(bag|mochila|keep|guardar|send to bag|to bag)\b/
            ];
        const textControls = Array.from((modal || document).querySelectorAll('button, .btn, [role="button"], a'));
        for (const pattern of textPatterns) {
            const control = textControls.find(item => {
                if (!isEnabledActionControl(item)) return false;
                const text = foldText([
                    item.innerText || item.textContent || '',
                    item.getAttribute?.('aria-label') || '',
                    item.getAttribute?.('title') || '',
                    item.getAttribute?.('data-action') || ''
                ].join(' '));
                return pattern.test(text);
            });
            if (control) return control;
        }

        return null;
    }

    function getItemModalFallbackButton(isUsableModal, equipItemName = '') {
        const normalized = normalizeItemName(equipItemName);
        if (normalized === 'move tutor' || normalized === 'tm normal') {
            const skipTutorBtn = document.getElementById('btn-skip-tutor');
            if (skipTutorBtn && isEnabledActionControl(skipTutorBtn)) return skipTutorBtn;
        }

        const legacyIds = isUsableModal
            ? ['btn-cancel-use', 'btn-equip-cancel', 'btn-skip-tutor']
            : ['btn-equip-cancel', 'btn-equip-to-bag', 'btn-skip-tutor'];

        for (const id of legacyIds) {
            const btn = document.getElementById(id);
            if (btn && isEnabledActionControl(btn)) return btn;
        }

        return findItemModalExitControl(getActiveItemModal(), !isUsableModal);
    }

    function closeUnavailableItemModal(modal, itemName, reason, options = {}) {
        const normalized = normalizeItemName(itemName || lastChosenItemName || '');
        if (normalized) {
            markItemKeptInBag(normalized, {
                team: options.team || null,
                bossType: options.bossType || null,
                reason,
                blockAssignment: options.blockAssignment !== false
            });
        }
        recordRunEvent('item-skip', {
            item: normalized || itemName || 'unknown',
            reason,
            modal: modal?.id || 'item-modal'
        });

        const exit = findItemModalExitControl(modal, options.preferBag !== false) ||
                     getItemModalFallbackButton(options.preferBag === false, normalized || itemName || '');
        if (exit) {
            log('info', '🎒', `Skipping [${normalized || itemName || 'unknown'}] (${reason}). Closing item modal.`);
            triggerRealClick(exit);
            return true;
        }

        log('warn', '🎒', `No exit control found for unusable item [${normalized || itemName || 'unknown'}] (${reason}).`);
        return false;
    }

    function findItemChoiceExitControl() {
        const selectors = [
            '#btn-next-map',
            '#btn-skip-item',
            '#btn-item-skip',
            '#btn-skip-reward',
            '.choice-skip-btn',
            '.item-skip-btn',
            '[data-action*="skip"]',
            '[data-action*="continue"]'
        ];
        for (const selector of selectors) {
            const control = Array.from(document.querySelectorAll(selector)).find(item => isEnabledActionControl(item));
            if (control) return control;
        }

        return Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find(item => {
            if (!isEnabledActionControl(item)) return false;
            const text = foldText([
                item.innerText || item.textContent || '',
                item.getAttribute?.('aria-label') || '',
                item.getAttribute?.('title') || '',
                item.getAttribute?.('data-action') || ''
            ].join(' '));
            return text.match(/\b(skip|continue|next|saltar|continuar|siguiente)\b/);
        }) || null;
    }

    function parseLevelText(text) {
        return EasyPokelikeStrategyUtils.parseLevelFromText(text || '');
    }

    function getCachedPokemonInfo(name) {
        for (const key of getPokemonLookupKeys(name)) {
            if (pokemonRuntimeInfoCache[key]) return pokemonRuntimeInfoCache[key];
        }
        return null;
    }

    function getTypeListFromElements(elements) {
        const found = [];
        Array.from(elements || []).forEach(el => {
            [
                el.getAttribute('data-type'),
                el.getAttribute('data-poke-type'),
                el.getAttribute('data-move-type'),
                el.getAttribute('data-attack-type'),
                el.title,
                el.alt,
                el.innerText,
                el.getAttribute('class')
            ].forEach(value => detectTypesInText(value || '').forEach(type => found.push(type)));
        });
        return normalizeTypeList(found);
    }

    function getPokemonNameFromCard(card) {
        if (!card) return '';
        const nameEl = card.querySelector('.poke-name, .poke-card-name, .team-slot-name, .equip-poke-name');
        if (nameEl && nameEl.innerText) return foldText(nameEl.innerText);

        const sprite = card.querySelector('img.poke-sprite[alt], .poke-sprite-wrap img[alt]');
        if (sprite && sprite.alt && !foldText(sprite.alt).match(/caught|captur|item|shiny/)) {
            return foldText(sprite.alt);
        }

        return '';
    }

    function parseMoveInfoFromCard(card) {
        if (!card) return [];
        return Array.from(card.querySelectorAll('.poke-move, .move-row, [class*="poke-move"]'))
            .map((moveEl, index) => {
                const nameEl = moveEl.querySelector('.move-name, [class*="move-name"]');
                const name = nameEl ? (nameEl.getAttribute('title') || nameEl.innerText || '').trim() : '';
                let type = getTypeListFromElements(moveEl.querySelectorAll(
                    '.move-type-badge, .move-type, [data-move-type], [data-attack-type], .type-badge'
                ))[0] || null;
                if (!type) {
                    type = detectTypesInText(moveEl.innerText || moveEl.getAttribute('class') || '')[0] || null;
                }

                const categoryText = foldText([
                    moveEl.querySelector('.move-cat-icon')?.alt || '',
                    moveEl.querySelector('.move-cat-icon')?.title || '',
                    moveEl.querySelector('.move-cat-icon')?.src || '',
                    moveEl.innerText || ''
                ].join(' '));
                const category = categoryText.match(/physical|fisic/) ? 'physical' :
                                 categoryText.match(/special|especial/) ? 'special' : null;
                const powerText = moveEl.querySelector('.move-power-badge')?.innerText || moveEl.innerText || '';
                const powerMatch = powerText.match(/(\d+)\s*(?:pwr|power|poder)?/i);
                const power = powerMatch ? Number.parseInt(powerMatch[1], 10) : 0;

                return { index, name, type, category, power };
            })
            .filter(move => move.name || move.type);
    }

    function parseCardHp(card) {
        const hpText = card?.querySelector('.hp-text')?.innerText || '';
        return EasyPokelikeStrategyUtils.parseHpSnapshotFromText(hpText);
    }

    function parsePokemonInfoFromCard(card, source = 'poke-card') {
        const name = getPokemonNameFromCard(card);
        if (!name) return null;

        let types = getTypeListFromElements(card.querySelectorAll('.poke-types .type-badge, [data-poke-type]'));
        if (types.length === 0) {
            const manualTypes = getManualPokemonTypes(name);
            const pokedexEntry = getPokelikePokedexEntry(name);
            types = manualTypes.length > 0 ? manualTypes : normalizeTypeList(pokedexEntry?.types || []);
        }

        const moves = parseMoveInfoFromCard(card);
        const primaryMove = moves
            .filter(move => move.type)
            .sort((a, b) => ((b.power || 0) - (a.power || 0)) || (a.index - b.index))[0] || null;
        const attackTypes = normalizeTypeList(moves.map(move => move.type).filter(Boolean));
        const currentStats = parseCardStats(card);

        return {
            name,
            source,
            types,
            level: parseLevelText(card.querySelector('.poke-level, .team-slot-lv, [class*="level"]')?.innerText || card.innerText || ''),
            hp: parseCardHp(card),
            currentStats,
            moves,
            attackTypes,
            primaryAttackType: primaryMove ? primaryMove.type : null,
            updatedAt: Date.now()
        };
    }

    function mergePokemonRuntimeInfo(info) {
        if (!info || !info.name) return null;
        const keys = getPokemonLookupKeys(info.name);
        if (keys.length === 0) return null;

        const existing = keys.map(key => pokemonRuntimeInfoCache[key]).find(Boolean) || {};
        const merged = {
            ...existing,
            name: info.name || existing.name,
            updatedAt: info.updatedAt || Date.now(),
            source: info.source || existing.source || 'unknown'
        };

        if (info.types && info.types.length > 0) merged.types = normalizeTypeList(info.types);
        if (info.attackTypes && info.attackTypes.length > 0) merged.attackTypes = normalizeTypeList(info.attackTypes);
        if (info.primaryAttackType) merged.primaryAttackType = info.primaryAttackType;
        if (info.moves && info.moves.length > 0) merged.moves = info.moves;
        if (info.currentStats && Object.keys(info.currentStats).length > 0) merged.currentStats = info.currentStats;
        if (info.level) merged.level = info.level;
        if (info.hp) merged.hp = info.hp;

        keys.forEach(key => {
            pokemonRuntimeInfoCache[key] = merged;
        });

        return merged;
    }

    function learnPokemonInfoFromCard(card, source = 'poke-card') {
        return mergePokemonRuntimeInfo(parsePokemonInfoFromCard(card, source));
    }

    function refreshVisiblePokemonInfoCache() {
        const selectors = [
            '#team-hover-card .poke-card',
            '#catch-choices .poke-choice-wrap .poke-card',
            '#starter-choices .poke-card',
            '#swap-incoming .poke-card',
            '#swap-choices .poke-card',
            '#gameover-team .poke-card',
            '#elite-prep-player-side .poke-card',
            '#elite-prep-enemy-side .poke-card',
            '#battle-enemy-side .poke-card',
            '.screen.active .poke-card'
        ].join(', ');

        const seen = new Set();
        let learned = 0;
        document.querySelectorAll(selectors).forEach(card => {
            if (!card || seen.has(card)) return;
            seen.add(card);
            if (learnPokemonInfoFromCard(card, 'visible-card')) learned++;
        });

        if (learned > 0) {
            log('debug', '📚', `Learned/updated ${learned} Pokémon card(s) from visible DOM.`);
        }
        return learned;
    }

    function getAttackTypesFromElement(element, fallbackTypes = []) {
        const found = new Set();
        if (element) {
            const moveTypeSelectors = [
                '[data-move-type]', '[data-attack-type]',
                '.move-type', '.move-type-badge', '.attack-type',
                '.move-row [class*="type"]', '[class*="move"] [class*="type"]',
                '[class*="attack"] [class*="type"]'
            ].join(', ');

            element.querySelectorAll(moveTypeSelectors).forEach(el => {
                const attrs = [
                    el.getAttribute('data-move-type'),
                    el.getAttribute('data-attack-type'),
                    el.getAttribute('data-type'),
                    el.title,
                    el.alt,
                    el.innerText
                ];
                attrs.forEach(value => detectTypesInText(value || '').forEach(type => found.add(type)));
            });

            (element.innerText || '').split(/\n+/).forEach(line => {
                const folded = foldText(line);
                if (folded.match(/move|attack|ataque|movimiento|power|poder|base/)) {
                    detectTypesInText(line).forEach(type => found.add(type));
                }
            });
        }

        if (found.size === 0) {
            fallbackTypes.forEach(type => found.add(type));
        }

        return [...found].filter(type => TYPES.includes(type));
    }

    function parseModalRowUnit(row, index) {
        const nameEl = row.querySelector('.equip-poke-name, .team-slot-name, .poke-card-name, .pokemon-name, [class*="poke-name"], [class*="pokemon-name"]');
        const name = nameEl ? nameEl.innerText.toLowerCase().trim() : `slot ${index + 1}`;
        const levelEl = row.querySelector('.equip-poke-lv, .team-slot-lv, .poke-level, [class*="level"], [class*="lv"]');
        const hpText = (levelEl ? levelEl.innerText : row.innerText || '').replace(/\s+/g, ' ');
        const level = parseLevelText(hpText);
        const hpMatch = hpText.match(/(\d+)\s*\/\s*(\d+)\s*HP/i);
        const hpCurrent = hpMatch ? Number.parseInt(hpMatch[1], 10) : 100;
        const hpMax = hpMatch ? Number.parseInt(hpMatch[2], 10) : 100;
        const hp = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 100) : 100;
        const types = getKnownPokemonTypes(name);
        const cachedInfo = getCachedPokemonInfo(name);
        const baseStats = getPokemonBaseStats(name);

        return {
            index,
            name,
            level,
            hp,
            isFainted: hp === 0,
            types,
            attackTypes: getAttackTypesFromElement(row, cachedInfo?.attackTypes || types),
            moves: cachedInfo?.moves || [],
            baseStats,
            currentStats: cachedInfo?.currentStats || null,
            heldItem: null,
            element: row
        };
    }

    function getActiveScreen() {
        // Priority 1: Eevee choice overlay (highest z-index: 201)
        const eeveeOverlay = document.getElementById('eevee-choice-overlay');
        if (eeveeOverlay && isVisible(eeveeOverlay)) return 'EEVEE_CHOICE';

        // Priority 2: Evolution overlay (z-index: 200)
        const evoOverlay = document.getElementById('evo-overlay');
        if (evoOverlay && isVisible(evoOverlay)) return 'EVO_OVERLAY';

        // Priority 3: Item equip/use modal (floating)
        const equipModal = getActiveItemModal();
        if (equipModal && isVisible(equipModal)) return 'ITEM_EQUIP_MODAL';

        // Priority 4: Active screen by class. Challenge mode may use a variant id
        // for elite prep, but the FIGHT button must belong to the active screen.
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const activeFightBtn = activeScreen.querySelector('#btn-elite-prep-continue, .elite-prep-fight-btn');
            if (activeFightBtn && isVisible(activeFightBtn)) return 'elite-prep-screen';
            if (activeScreen.id !== 'item-screen' && isStartingItemScreenElement(activeScreen)) return 'starting-item-screen';
            return activeScreen.id;
        }

        // Fallback for transient DOM states with no active screen yet.
        const elitePrepFightBtn = document.getElementById('btn-elite-prep-continue') || document.querySelector('.elite-prep-fight-btn');
        const fightScreen = elitePrepFightBtn ? elitePrepFightBtn.closest('.screen') : null;
        if (elitePrepFightBtn && isVisible(elitePrepFightBtn) && (!fightScreen || isVisible(fightScreen))) {
            return 'elite-prep-screen';
        }

        return 'IDLE_TRANSITION';
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║          📋 TEAM STATUS PARSER & ITEM DETECTION              ║
    // ╚══════════════════════════════════════════════════════════════╝

    function getHeldItem(slotElement) {
        const img = slotElement.querySelector('img[src*="items/"]');
        if (!img) return null;

        // Try alt or title
        let name = img.alt || img.title;
        if (name) return normalizeItemName(name);

        // Fallback to URL parsing
        const src = img.src || '';
        const match = src.match(/\/items\/([^\/\.]+)/);
        if (match) {
            return normalizeItemName(match[1]);
        }

        return 'unknown item';
    }

    function parseTeamStatus() {
        let slots = document.querySelectorAll('.screen.active .screen-team-bar .team-slot');
        if (slots.length === 0) {
            slots = document.querySelectorAll('#team-bar .team-slot');
        }
        const units = [];
        slots.forEach((slot, index) => {
            const nameEl = slot.querySelector('.team-slot-name');
            const hpFill = slot.querySelector('.hp-bar-fill');
            if (nameEl) {
                const name = nameEl.innerText.toLowerCase().trim();
                const levelEl = slot.querySelector('.team-slot-lv, [class*="lv"]');
                const level = levelEl ? parseLevelText(levelEl.innerText) : 0;
                const hpPercent = hpFill ? (parseInt(hpFill.style.width) || 0) : 100;
                const types = getKnownPokemonTypes(name);
                const baseStats = getPokemonBaseStats(name);
                const cachedInfo = getCachedPokemonInfo(name);
                const isShiny = slot.classList.contains('shiny') ||
                                slot.querySelector('.shiny-icon') !== null ||
                                slot.querySelector('[class*="shiny"]') !== null;
                const alreadyOwnedShiny = isShiny && isAlreadyOwnedShinyCandidate(slot, name);
                const heldItem = getHeldItem(slot);
                units.push({
                    index, name, hp: hpPercent,
                    level,
                    isFainted: hpPercent === 0,
                    types,
                    attackTypes: getAttackTypesFromElement(slot, cachedInfo?.attackTypes || types),
                    moves: cachedInfo?.moves || [],
                    baseStats,
                    currentStats: cachedInfo?.currentStats || null,
                    isShiny, alreadyOwnedShiny, heldItem, element: slot
                });
            }
        });
        return units;
    }

    function getBagItems() {
        const badges = document.querySelectorAll(
            '#item-bar .item-badge, #item-bar span img, ' +
            '#elite-prep-items .item-badge, #elite-prep-items span img, #elite-prep-items img[src*="items/"]'
        );
        const items = [];
        const seenElements = new Set();
        badges.forEach(badge => {
            const img = badge.tagName === 'IMG' ? badge : badge.querySelector('img');
            if (!img) return;
            const element = badge.tagName === 'IMG' ? badge.parentElement : badge;
            if (!element || seenElements.has(element)) return;
            if (!isVisible(element) || !isEnabledActionControl(element)) return;
            seenElements.add(element);

            let name = img.alt || img.title;
            if (!name) {
                const src = img.src || '';
                const match = src.match(/\/items\/([^\/\.]+)/);
                if (match) {
                    name = match[1];
                }
            }

            if (name) {
                items.push({
                    name: normalizeItemName(name),
                    element
                });
            }
        });
        return items;
    }

    function isItemOnBagCooldown(itemName) {
        itemName = normalizeItemName(itemName);
        const retryAt = baggedItemCooldowns[itemName] || 0;
        if (retryAt <= Date.now()) return false;
        log('debug', '🎒', `Skipping recently bagged item [${itemName}] for ${Math.ceil((retryAt - Date.now()) / 1000)}s.`);
        return true;
    }

    function getItemAssignmentBlockKey(itemName, team = [], bossType = null) {
        itemName = normalizeItemName(itemName);
        if (!itemName) return '';
        const teamKey = (team || []).map(p => {
            const attacks = getUnitAttackTypes(p).join(',');
            const moveTier = getUnitKnownMoveTier(p);
            return [
                p.index,
                getPokemonIdentityKey(p.name),
                p.isFainted ? 'fainted' : 'alive',
                p.level || 0,
                normalizeItemName(p.heldItem || 'none'),
                moveTier,
                attacks
            ].join(':');
        }).join('|');
        return `${itemName}::${getOpponentProfileLabel(bossType) || '-'}::${teamKey}`;
    }

    function isItemAssignmentBlocked(itemName, team = [], bossType = null) {
        const key = getItemAssignmentBlockKey(itemName, team, bossType);
        if (!key || !blockedItemAssignmentKeys[key]) return false;
        log('debug', 'item', `Skipping blocked item assignment [${normalizeItemName(itemName)}] for unchanged team state (${blockedItemAssignmentKeys[key].reason}).`);
        return true;
    }

    function blockItemAssignmentForTeamState(itemName, team = [], bossType = null, reason = 'kept-in-bag') {
        const key = getItemAssignmentBlockKey(itemName, team, bossType);
        if (!key) return;
        blockedItemAssignmentKeys[key] = {
            reason,
            at: Date.now()
        };
    }

    function markItemKeptInBag(itemName, options = {}) {
        itemName = normalizeItemName(itemName);
        if (!itemName) return;
        baggedItemCooldowns[itemName] = Date.now() + CONFIG.ITEM_BAG_RETRY_COOLDOWN_MS;
        if (options.blockAssignment && options.team) {
            blockItemAssignmentForTeamState(itemName, options.team, options.bossType, options.reason);
        }
    }

    function shouldEquipBagItem(bagItemName, team, bossType = null) {
        bagItemName = normalizeItemName(bagItemName);
        if (isItemAssignmentBlocked(bagItemName, team, bossType)) return false;
        if (isItemOnBagCooldown(bagItemName)) return false;
        const alive = getAliveTeam(team || []);
        if (alive.length === 0) return false;
        const bagItemScore = scoreItemForTeam(bagItemName, team, bossType);
        if (bagItemName === 'sacred ash') {
            return (team || []).some(p => p.isFainted);
        }
        if (bagItemName === 'tm normal') {
            const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
            const challengeStrategy = getChallengeStrategyContext(team, bossType);
            const hasTutorTarget = alive.some((unit, position) => getMoveTutorTargetStatus({
                unit,
                teamIdx: Number.isFinite(unit.index) ? unit.index : position
            }, sinnohTraining, challengeStrategy).canTutor);
            if (!hasTutorTarget) return false;
            if (sinnohTraining.active && !sinnohTraining.needsTm) return true;
            return bagItemScore > 35 || challengeStrategy.active;
        }
        if (bagItemName === 'rare candy' || bagItemName === 'moon stone') {
            return bagItemScore > 35;
        }

        if (USABLE_ITEMS.has(bagItemName)) return true;
        if (isLowValueHeldItem(bagItemName)) return false;
        if (!isTypeBoostItemUsefulForTeam(bagItemName, team)) return false;

        // Try to fill empty slots of alive units first
        const hasUnequipped = team.some(p => !p.isFainted && !p.heldItem);
        if (hasUnequipped) return bagItemScore > 35;

        // Upgrade if bag item is better than what any alive unit currently holds
        const canUpgrade = team.some(p => {
            if (p.isFainted || !p.heldItem) return false;
            return scoreHeldItemForPokemon(p, bagItemName, bossType) > scoreHeldItemForPokemon(p, p.heldItem, bossType) + 12;
        });

        return canUpgrade;
    }

    function getTeamAverageHP(team) {
        return EasyPokelikeStrategyUtils.getTeamAverageHP(team);
    }

    function getAliveTeam(team) {
        return EasyPokelikeStrategyUtils.getAliveTeam(team);
    }

    function hasOpenTeamSlot(team) {
        return EasyPokelikeStrategyUtils.hasOpenTeamSlot(team, CONFIG.TEAM_TARGET_SIZE);
    }

    function getTeamAverageLevel(team) {
        return EasyPokelikeStrategyUtils.getTeamAverageLevel(team);
    }

    function getCenterNeedStatus(team, opponentProfile = null, prepStatus = null) {
        const primaryCarry = getPrimaryCarry(team || []);
        const prep = prepStatus || getBossPrepStatus(team || [], opponentProfile);
        const carryBossScore = opponentProfile && primaryCarry
            ? scoreLeadCandidate(primaryCarry, opponentProfile, { ignoreHeldItem: true })
            : 0;
        const carryPowerScore = primaryCarry ? getPokemonCarryScore(primaryCarry) : 0;

        return EasyPokelikeStrategyUtils.getCenterNeedStatus(team || [], {
            criticalHpThreshold: CONFIG.CRITICAL_HP_THRESHOLD,
            lowHpThreshold: CONFIG.LOW_HP_THRESHOLD,
            fullHpAvgThreshold: CONFIG.CENTER_AVOID_FULL_HP_AVG_THRESHOLD,
            almostFullHpAvgThreshold: CONFIG.CENTER_AVOID_ALMOST_FULL_HP_AVG_THRESHOLD,
            lowestHpThreshold: CONFIG.CENTER_AVOID_LOWEST_HP_THRESHOLD,
            carrySafeHpThreshold: CONFIG.CENTER_CARRY_SAFE_HP_THRESHOLD,
            carrySkipAvgHpThreshold: CONFIG.CENTER_CARRY_SKIP_AVG_HP_THRESHOLD,
            carrySkipLowestHpThreshold: CONFIG.CENTER_CARRY_SKIP_LOWEST_HP_THRESHOLD,
            strongCarryScoreThreshold: CONFIG.CENTER_STRONG_CARRY_SCORE_THRESHOLD,
            primaryCarry,
            prepStatus: prep,
            hasOpponentProfile: Boolean(opponentProfile),
            carryBossScore,
            carryPowerScore,
            isMainCarry: primaryCarry ? isMainCarryUnit(primaryCarry) : false
        });
    }

    function getLeadLevel(team) {
        return EasyPokelikeStrategyUtils.getLeadLevel(team);
    }

    function shouldBuildCoreTeam(team) {
        return EasyPokelikeStrategyUtils.shouldBuildCoreTeam(team, CONFIG.EARLY_CORE_TEAM_SIZE);
    }

    function getBossPrepTargets(opponentProfile = null) {
        const labelText = foldText((getProgressLabels() || []).join(' '));
        const opponentName = foldText(opponentProfile?.name || '');
        const rewardMatch = labelText.match(/\+(\d+)/);
        const reward = rewardMatch ? Number.parseInt(rewardMatch[1], 10) : 0;
        const isArceusCheckpoint = opponentName === 'arceus' || (!opponentName && labelText.includes('arceus'));
        const isFinalBoss = !isArceusCheckpoint && Boolean(
            labelText.match(/stage final boss|final boss|champion|campeon/) ||
            reward >= 400 ||
            ['steven', 'cynthia', 'red'].includes(opponentName)
        );
        const isBigBoss = isFinalBoss || isArceusCheckpoint || labelText.includes('big boss') || opponentName === 'brawly';
        const isMap2 = labelText.includes('map 2/2') || ['glacia', 'lorelei', 'pryce', 'phoebe'].includes(opponentName);
        const roundMatch = labelText.match(/\br\s*(\d+)/);
        const labelRound = roundMatch ? Number.parseInt(roundMatch[1], 10) : 1;
        const rewardRound = reward >= 300 ? 3 : reward >= 150 ? 2 : 1;
        const round = Math.max(labelRound || 1, rewardRound);
        const progress = getTowerProgressContext();
        const sinnohMapOrdinal = progress.mapOrdinal ||
            (round === 1 && isMap2 ? 2 : (round === 2 && !isMap2 ? 3 : null));

        if (!isStoryStrategyActive() && progress.isSinnoh && isArceusCheckpoint) {
            return {
                avgLevel: CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL,
                reason: `sinnoh-arceus-battle-${SINNOH_ARCEUS_BATTLE_INDEX}-checkpoint`
            };
        }

        if (CONFIG.SINNOH_TOWER_EARLY_TRAINING &&
            !isStoryStrategyActive() &&
            progress.isSinnoh &&
            sinnohMapOrdinal &&
            sinnohMapOrdinal <= CONFIG.SINNOH_TRAINING_MAP_COUNT &&
            !isFinalBoss) {
            if (sinnohMapOrdinal <= 1) {
                return {
                    avgLevel: CONFIG.SINNOH_MAP1_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.SINNOH_MAP1_MIN_LEAD_LEVEL,
                    reason: 'sinnoh-map-1-carry-training'
                };
            }
            if (sinnohMapOrdinal === 2) {
                return {
                    avgLevel: CONFIG.SINNOH_MAP2_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.SINNOH_MAP2_MIN_LEAD_LEVEL,
                    reason: 'sinnoh-map-2-carry-training'
                };
            }
            return {
                avgLevel: CONFIG.SINNOH_MAP3_MIN_AVG_LEVEL,
                leadLevel: CONFIG.SINNOH_MAP3_MIN_LEAD_LEVEL,
                reason: 'sinnoh-map-3-carry-training'
            };
        }

        const challengeTargets = getChallengeBossPrepTargets({
            progress,
            isFinalBoss,
            isBigBoss,
            isMap2,
            round,
            reward,
            opponentName
        });
        if (challengeTargets) return challengeTargets;

        const storyTargets = getStoryBossPrepTargets({
            progress,
            isFinalBoss,
            isBigBoss,
            isMap2,
            round,
            reward,
            opponentName
        });
        if (storyTargets) return storyTargets;

        if (round >= 3) {
            if (isFinalBoss) {
                return {
                    avgLevel: CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL,
                    reason: 'r3-final-boss'
                };
            }
            if (isBigBoss) {
                return {
                    avgLevel: CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL,
                    reason: 'r3-big-boss'
                };
            }
            if (isMap2) {
                return {
                    avgLevel: CONFIG.R3_MAP2_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R3_MAP2_MIN_LEAD_LEVEL,
                    reason: 'r3-map-2'
                };
            }
            return {
                avgLevel: CONFIG.R3_MAP1_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R3_MAP1_MIN_LEAD_LEVEL,
                reason: 'r3-map-1'
            };
        }

        if (round === 2) {
            if (isBigBoss || reward >= 250) {
                return {
                    avgLevel: CONFIG.R2_BIG_BOSS_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R2_BIG_BOSS_MIN_LEAD_LEVEL,
                    reason: 'r2-big-boss'
                };
            }
            if (isMap2 || reward >= 200) {
                return {
                    avgLevel: CONFIG.R2_MAP2_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R2_MAP2_MIN_LEAD_LEVEL,
                    reason: 'r2-map-2'
                };
            }
            return {
                avgLevel: CONFIG.R2_MAP1_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R2_MAP1_MIN_LEAD_LEVEL,
                reason: 'r2-map-1'
            };
        }

        if (isBigBoss) {
            return {
                avgLevel: CONFIG.EARLY_BIG_BOSS_MIN_AVG_LEVEL,
                leadLevel: CONFIG.EARLY_BIG_BOSS_MIN_LEAD_LEVEL,
                reason: 'big-boss'
            };
        }

        if (isMap2) {
            return {
                avgLevel: CONFIG.R1_MAP2_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R1_MAP2_MIN_LEAD_LEVEL,
                reason: 'r1-map-2'
            };
        }

        return {
            avgLevel: CONFIG.EARLY_BOSS_MIN_AVG_LEVEL,
            leadLevel: CONFIG.EARLY_BOSS_MIN_LEAD_LEVEL,
            reason: 'early'
        };
    }

    function shouldPrioritizeEarlyTraining(team, opponentProfile = null) {
        const targets = getBossPrepTargets(opponentProfile);
        return EasyPokelikeStrategyUtils.shouldPrioritizeEarlyTraining(team, targets, {
            coreTeamSize: CONFIG.EARLY_CORE_TEAM_SIZE,
            optionalTeamSize: CONFIG.EARLY_OPTIONAL_TEAM_SIZE
        });
    }

    function getBossPrepStatus(team, opponentProfile = null) {
        const targets = getBossPrepTargets(opponentProfile);
        const avgLevel = getTeamAverageLevel(team);
        const leadLevel = getLeadLevel(team);
        const avgDeficit = Math.max(0, targets.avgLevel - avgLevel);
        const leadDeficit = Math.max(0, targets.leadLevel - leadLevel);

        return {
            targets,
            avgLevel: Number(avgLevel.toFixed(1)),
            leadLevel,
            avgDeficit: Number(avgDeficit.toFixed(1)),
            leadDeficit: Number(leadDeficit.toFixed(1)),
            ready: avgDeficit <= 0 && leadDeficit <= 0
        };
    }

    function getProjectedAverageLevelAfterCatch(team, candidateLevel) {
        return EasyPokelikeStrategyUtils.getProjectedAverageLevelAfterCatch(team, candidateLevel);
    }

    function shouldStopEarlyExpansion(team, opponentProfile = null) {
        if (getAliveTeam(team).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE) return false;

        const labelText = foldText((getProgressLabels() || []).join(' '));
        const opponentName = foldText(opponentProfile?.name || '');
        return labelText.includes('r1') ||
               ['gardenia', 'glacia', 'brawly'].includes(opponentName);
    }

    function getEarlyCatchAllowance(team, score = 0, isShiny = false) {
        return EasyPokelikeStrategyUtils.getEarlyCatchAllowance(team, score, isShiny, {
            coreTeamSize: CONFIG.EARLY_CORE_TEAM_SIZE,
            optionalTeamSize: CONFIG.EARLY_OPTIONAL_TEAM_SIZE,
            exceptionalScore: CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE,
            minAcceptScore: CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE
        });
    }

    function isEarlyShinyRerollWindow(team = []) {
        const progress = getTowerProgressContext();
        if (progress.mapOrdinal !== null) {
            return progress.mapOrdinal <= CONFIG.EARLY_SHINY_REROLL_MAP_COUNT;
        }
        if (progress.reward > 0) {
            return progress.reward < CONFIG.EARLY_SHINY_REROLL_MAP_COUNT * 100;
        }
        return getAliveTeam(team || []).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
    }

    function isSettledCatchDecisionWindow(team = []) {
        const progress = getTowerProgressContext();
        if (progress.mapOrdinal !== null) {
            return progress.mapOrdinal > CONFIG.EARLY_SHINY_REROLL_MAP_COUNT;
        }
        if (progress.reward > 0) {
            return progress.reward >= CONFIG.EARLY_SHINY_REROLL_MAP_COUNT * 100;
        }
        return getAliveTeam(team || []).length >= CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
    }

    function getTeamTypes(team) {
        const typeSet = new Set();
        team.forEach(p => p.types.forEach(t => typeSet.add(t)));
        return [...typeSet];
    }

    function getTeamTraitCounts(team) {
        const counts = {};
        team.forEach(p => {
            const multiplier = p.isShiny ? 2 : 1;
            p.types.forEach(t => {
                counts[t] = (counts[t] || 0) + multiplier;
            });
        });
        return counts;
    }

    function isTopTraitType(type) {
        const trait = TRAIT_DATA[type];
        return Boolean(trait && ['S', 'A'].includes(trait.tier));
    }

    function getShinyDraftScore(candidateTypes, team, isShiny = false) {
        if (!isShiny) return 0;
        const aliveCount = getAliveTeam(team || []).length;
        const types = normalizeTypeList(candidateTypes || []);
        let score = aliveCount < CONFIG.EARLY_OPTIONAL_TEAM_SIZE
            ? CONFIG.EARLY_SHINY_CATCH_BONUS
            : CONFIG.SHINY_CATCH_BONUS;

        if (!(team || []).some(p => p.isShiny)) score += 12;
        types.forEach(type => {
            if (isTopTraitType(type)) score += CONFIG.SHINY_TOP_TYPE_BONUS;
            if (['Fairy', 'Water', 'Fire', 'Dragon', 'Dark'].includes(type)) score += 10;
        });

        return score;
    }

    function getShinyReplacementKeepScore(unit, team) {
        if (!unit?.isShiny) return 0;
        const aliveCount = getAliveTeam(team || []).length;
        const types = normalizeTypeList(unit.types || []);
        let score = CONFIG.SHINY_REPLACEMENT_KEEP_BONUS;
        if (aliveCount <= CONFIG.EARLY_OPTIONAL_TEAM_SIZE) score += 34;
        types.forEach(type => {
            if (isTopTraitType(type)) score += CONFIG.SHINY_TOP_TYPE_BONUS;
            if (['Fairy', 'Water', 'Fire', 'Dragon', 'Dark'].includes(type)) score += 8;
        });
        return score;
    }

    function getTowerProgressContext(labels = getProgressLabels()) {
        const labelText = foldText([
            ...(labels || []),
            currentMapKey || '',
            activeAutoRunMode || ''
        ].join(' '));
        const rewardMatch = labelText.match(/\+(\d+)/);
        const reward = rewardMatch ? Number.parseInt(rewardMatch[1], 10) : 0;
        const roundMatch = labelText.match(/\b(?:r|round|ronda)\s*\.?\s*(\d+)/);
        const round = roundMatch ? Number.parseInt(roundMatch[1], 10) : 1;
        const mapMatch = labelText.match(/\b(?:map|mapa)\s*\.?\s*(\d+)\s*\/\s*(\d+)/);
        const mapNumber = mapMatch ? Number.parseInt(mapMatch[1], 10) : null;
        const mapTotal = mapMatch ? Number.parseInt(mapMatch[2], 10) : null;
        let mapOrdinal = null;

        if (mapNumber && mapTotal) {
            mapOrdinal = Math.max(1, ((round || 1) - 1) * mapTotal + mapNumber);
        } else if (reward > 0) {
            mapOrdinal = reward >= 200 ? 3 : reward >= 100 ? 2 : 1;
        }

        const nonSinnohRegionSignal = Boolean(labelText.match(/\b(?:kanto|johto|hoenn|unova|kalos|alola|galar|paldea)\b/));
        const nonSinnohStageSignal = Boolean(labelText.match(/\b(?:stage|region|tower|torre)\s*[123]\b|\b[123]\s*(?:stage|region|tower|torre)\b|\b(?:primera|segunda|tercera)\b/));
        const towerSignal = activeAutoRunMode === 'battle-tower' || Boolean(labelText.match(/\b(?:battle tower|tower|torre)\b/));
        const sinnohBossSignal = Boolean(labelText.match(/\b(?:roark|gardenia|maylene|crasher wake|fantina|byron|candice|volkner|aaron|bertha|flint|lucian|cynthia|arceus)\b/));
        const assumedTowerSinnoh = Boolean(
            CONFIG.SINNOH_ASSUME_TOWER_WHEN_STAGE_UNKNOWN &&
            towerSignal &&
            !nonSinnohRegionSignal &&
            !nonSinnohStageSignal
        );

        return {
            labelText,
            isSinnoh: Boolean(
                labelText.match(/\b(?:sinnoh|shinnoh)\b/) ||
                labelText.match(/\b(?:stage|region|tower|torre)\s*4\b|\b4\s*(?:stage|region|tower|torre)\b|\bcuarta\b/) ||
                sinnohBossSignal ||
                assumedTowerSinnoh
            ),
            assumedTowerSinnoh,
            reward,
            round: round || 1,
            mapNumber,
            mapTotal,
            mapOrdinal
        };
    }

    function normalizeMoveNameKey(name) {
        return foldText(name || '').replace(/[^a-z0-9]+/g, '');
    }

    function getMovePoolTierForMove(move) {
        if (!move) return -1;
        const moveKey = normalizeMoveNameKey(move.name);
        const movePower = Number.parseInt(move.power || 0, 10) || 0;
        const moveTypes = normalizeTypeList(move.type ? [move.type] : []);
        const poolEntries = moveTypes.length > 0
            ? moveTypes.map(type => [type, POKELIKE_MOVE_POOL[type]]).filter(([, pool]) => pool)
            : Object.entries(POKELIKE_MOVE_POOL);
        const preferredCategories = [...new Set([move.category, 'physical', 'special'].filter(category => category === 'physical' || category === 'special'))];
        let bestTier = -1;

        poolEntries.forEach(([, pool]) => {
            preferredCategories.forEach(category => {
                (pool[category] || []).forEach(([poolName, poolPower], tier) => {
                    const nameMatches = moveKey && moveKey === normalizeMoveNameKey(poolName);
                    const powerMatches = !moveKey && movePower > 0 && movePower === (poolPower || 0);
                    if (nameMatches || powerMatches) bestTier = Math.max(bestTier, tier);
                });
            });
        });

        return bestTier;
    }

    function getUnitKnownMoveTier(unit) {
        if (!unit) return -1;
        const cachedInfo = getCachedPokemonInfo(unit.name);
        const moves = Array.isArray(unit.moves) && unit.moves.length > 0
            ? unit.moves
            : (Array.isArray(cachedInfo?.moves) ? cachedInfo.moves : []);
        if (moves.length === 0) return -1;
        return Math.max(...moves.map(move => getMovePoolTierForMove(move)));
    }

    function getUnitOffenseSpeedSnapshot(unit) {
        if (!unit) return { offense: 0, speed: 0, statsKnown: false, currentStatsKnown: false };
        const currentStats = unit.currentStats || getCachedPokemonInfo(unit.name)?.currentStats || null;
        const hasCurrentStats = Boolean(currentStats && Object.keys(currentStats).length > 0);
        const stats = hasCurrentStats ? currentStats : getPokemonBaseStats(unit);
        const offense = Math.max(
            getPokemonStat(stats, 'atk', 'attack'),
            getPokemonStat(stats, 'special', 'spa', 'spatk')
        );
        const speed = getPokemonStat(stats, 'speed', 'spe');
        return {
            offense,
            speed,
            statsKnown: Boolean(stats),
            currentStatsKnown: hasCurrentStats
        };
    }

    function getSinnohTowerTrainingContext(team = [], opponentProfile = null) {
        const progress = getTowerProgressContext();
        const earlyByMap = progress.mapOrdinal !== null
            ? progress.mapOrdinal <= CONFIG.SINNOH_TRAINING_MAP_COUNT
            : (progress.reward > 0 ? progress.reward < CONFIG.SINNOH_TRAINING_MAX_REWARD : progress.round <= 2);
        const active = Boolean(CONFIG.SINNOH_TOWER_EARLY_TRAINING && !isStoryStrategyActive() && progress.isSinnoh && earlyByMap);
        const carry = getPrimaryCarry(team || []);
        const carryKey = carry ? getPokemonIdentityKey(carry.name) : '';
        const observedMoveTier = getUnitKnownMoveTier(carry);
        const rememberedMoveTier = carryKey && Number.isFinite(sinnohCarryKnownTmTiers[carryKey])
            ? sinnohCarryKnownTmTiers[carryKey]
            : -1;
        const moveTier = Math.max(observedMoveTier, rememberedMoveTier);
        const stats = getUnitOffenseSpeedSnapshot(carry);

        return {
            active,
            progress,
            carry,
            carryKey,
            carryMoveTier: moveTier,
            observedCarryMoveTier: observedMoveTier,
            rememberedCarryMoveTier: rememberedMoveTier,
            needsTm: Boolean(active && carry && moveTier < CONFIG.SINNOH_TM_MAX_MOVE_TIER),
            needsOffense: Boolean(active && carry && (!stats.statsKnown || stats.offense < CONFIG.SINNOH_OFFENSE_TARGET || moveTier < CONFIG.SINNOH_TM_MAX_MOVE_TIER)),
            needsSpeed: Boolean(active && carry && (!stats.statsKnown || stats.speed < CONFIG.SINNOH_SPEED_TARGET)),
            stats,
            opponent: opponentProfile || null
        };
    }

    function getNextTraitThreshold(count) {
        if ((count || 0) < 2) return 2;
        if ((count || 0) < 4) return 4;
        if ((count || 0) < 6) return 6;
        return 0;
    }

    function isSinnohTowerRunContext() {
        return Boolean(CONFIG.SINNOH_TOWER_EARLY_TRAINING && !isStoryStrategyActive() && getTowerProgressContext().isSinnoh);
    }

    function getSinnohBossKeyFromProfile(opponentProfile = null) {
        const profileText = foldText([
            opponentProfile?.name || '',
            ...(opponentProfile?.team || []).map(mon => mon.name || ''),
            ...(opponentProfile?.types || []),
            ...(opponentProfile?.teamTypes || []),
            ...(getProgressLabels() || [])
        ].join(' '));

        const bossKeys = Object.keys(SINNOH_BOSS_RUN_PLAN).sort((a, b) => b.length - a.length);
        for (const key of bossKeys) {
            const dbName = BOSS_TEAM_DB[key]?.name || '';
            if (profileText.includes(foldText(key)) || (dbName && profileText.includes(foldText(dbName)))) {
                return key;
            }
        }

        if (profileText.includes('arceus')) return 'arceus';
        return '';
    }

    function getSinnohBossRunPlan(opponentProfile = null) {
        const key = getSinnohBossKeyFromProfile(opponentProfile);
        if (!key || !SINNOH_BOSS_RUN_PLAN[key]) return null;
        return {
            key,
            battleIndex: SINNOH_BOSS_ORDER.indexOf(key) >= 0 ? SINNOH_BOSS_ORDER.indexOf(key) + 1 : null,
            ...SINNOH_BOSS_RUN_PLAN[key],
            bossProfile: BOSS_TEAM_DB[key] || null
        };
    }

    function scoreSinnohBossRunPlanFit(passiveTypes = [], attackTypes = [], team = [], opponentProfile = null, options = {}) {
        if (!isSinnohTowerRunContext()) return 0;
        const types = normalizeTypeList(passiveTypes);
        const rawAttacks = Array.isArray(attackTypes) ? attackTypes : [];
        const attacks = normalizeTypeList(rawAttacks.length > 0 ? rawAttacks : passiveTypes);
        const bossPlan = getSinnohBossRunPlan(opponentProfile);
        const bossKey = bossPlan?.key || '';
        const arceusPlan = SINNOH_BOSS_RUN_PLAN.arceus;
        const postArceusPlan = SINNOH_BOSS_RUN_PLAN[SINNOH_POST_ARCEUS_BOSS_KEY];
        let score = 0;

        const scorePlan = (plan, weight) => {
            if (!plan || weight <= 0) return;
            const wantedAttacks = normalizeTypeList(plan.attackTypes || []);
            const wantedPassives = normalizeTypeList(plan.passiveTypes || []);

            wantedAttacks.forEach(type => {
                if (attacks.includes(type)) score += 13 * weight;
                else if (types.includes(type)) score += 6 * weight;
            });
            wantedPassives.forEach(type => {
                if (types.includes(type)) score += 8 * weight;
            });
        };

        const scoreBossProfileCoverage = (profile, weight) => {
            if (!profile || weight <= 0) return;
            const bossTypes = getOpponentTeamTypes(profile);
            if (bossTypes.length === 0) return;
            score += getAttackCoverageScore(attacks, bossTypes) * 6 * weight;
            score += getDefensiveMatchupScore(types, bossTypes) * 3 * weight;
        };

        scorePlan(bossPlan, options.bossWeight ?? 1);
        if (bossKey !== 'arceus') {
            const arceusWeight = options.arceusWeight ?? 0.65;
            scorePlan(arceusPlan, arceusWeight);
            scoreBossProfileCoverage(BOSS_TEAM_DB.arceus, arceusWeight * 0.75);
        }
        if (bossKey !== SINNOH_POST_ARCEUS_BOSS_KEY) {
            scorePlan(postArceusPlan, options.postArceusWeight ?? 0.55);
            scoreBossProfileCoverage(BOSS_TEAM_DB[SINNOH_POST_ARCEUS_BOSS_KEY], (options.postArceusWeight ?? 0.55) * 0.75);
        }

        if (bossPlan?.bossProfile) {
            scoreBossProfileCoverage(bossPlan.bossProfile, options.bossWeight ?? 1);
        }

        const counts = getTeamTraitCounts(team || []);
        types.forEach(type => {
            const current = counts[type] || 0;
            if (current === 1 || current === 3 || current === 5) score += 6;
        });

        return score;
    }

    function scoreSinnohPassivePlanForTypes(types, team, options = {}) {
        const passiveTypes = normalizeTypeList(types || []);
        if (!isSinnohTowerRunContext() || passiveTypes.length === 0) return 0;

        const targets = CONFIG.SINNOH_PASSIVE_TARGETS || {};
        const counts = getTeamTraitCounts(team || []);
        const addCount = options.isShiny ? 2 : 1;
        let score = 0;

        passiveTypes.forEach(type => {
            const plan = targets[type];
            if (!plan) return;

            const current = counts[type] || 0;
            const target = current < plan.target ? plan.target : (current < plan.stretch ? plan.stretch : 0);
            const nextThreshold = getNextTraitThreshold(current);
            const completesThreshold = nextThreshold > 0 && current < nextThreshold && current + addCount >= nextThreshold;

            if (target > 0) {
                const missingBefore = Math.max(0, target - current);
                const missingAfter = Math.max(0, target - current - addCount);
                const progress = missingBefore - missingAfter;
                score += plan.priority * (progress > 0 ? 0.32 * progress : 0.12);
                if (completesThreshold) score += plan.priority * 0.45;
                if (type === 'Rock' && target >= 4) score += 16;
                if (type === 'Dragon' && current < plan.target) score += 14;
            } else {
                score += Math.min(10, plan.priority * 0.08);
            }
        });

        score += scoreSinnohBossRunPlanFit(passiveTypes, passiveTypes, team, options.opponentProfile || null, {
            bossWeight: 0.55,
            arceusWeight: 0.85,
            postArceusWeight: 0.75
        });

        return score;
    }

    function scoreSinnohPowerCatchCandidate(candidateName, candidateTypes, team, options = {}) {
        if (!isSinnohTowerRunContext() || !candidateName) return 0;

        const types = normalizeTypeList(candidateTypes || getKnownPokemonTypes(candidateName));
        const attackTypes = normalizeTypeList(options.attackTypes || types);
        const stats = getPokemonBaseStats(candidateName);
        const bst = getPokemonBaseStatTotal(stats);
        const offense = Math.max(getPokemonStat(stats, 'atk', 'attack'), getPokemonStat(stats, 'special', 'spa', 'spatk'));
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        const currentAvgLevel = getTeamAverageLevel(team || []);
        const candidateLevel = options.level || 0;
        let score = 0;

        score += Math.max(0, bst - 460) / 7;
        score += offense / 8;
        score += speed / 12;
        score += bulk / 55;
        if (candidateLevel && currentAvgLevel && candidateLevel >= currentAvgLevel - 3) score += 14;
        if (candidateLevel && currentAvgLevel && candidateLevel < currentAvgLevel - 8) score -= 12;
        if (isLegendaryPokemonName(candidateName)) score += 38;
        if (options.isShiny) score += 10;
        if (isMainCarryName(candidateName)) score += 34;

        if (attackTypes.includes('Fighting')) score += 18; // Arceus checkpoint is normally typed here.
        if (types.includes('Fire') || types.includes('Dragon') || types.includes('Dark') || types.includes('Ghost') || types.includes('Fairy')) score += 12;
        if (types.includes('Rock') || types.includes('Steel') || types.includes('Water') || types.includes('Grass')) score += 9;
        if (types.includes('Poison') && bst < 520) score -= 12;
        score += scoreSinnohBossRunPlanFit(types, attackTypes, team, options.opponentProfile || null, {
            bossWeight: 1.25,
            arceusWeight: 0.8,
            postArceusWeight: 0.7
        });

        return score;
    }

    function scoreSinnohPassiveCardPurpose({ passiveTypes, text, team, isShinyPassive, isSpeed, isSurvival, isDamage }) {
        const signals = {
            ...EasyPokelikeStrategyUtils.detectPassiveTextSignals(text),
            isSpeed,
            isSurvival,
            isDamage
        };
        return EasyPokelikeStrategyUtils.scoreSinnohPassiveCardPurpose({
            active: isSinnohTowerRunContext(),
            passiveTypes,
            signals,
            typeScore: scoreSinnohPassivePlanForTypes(passiveTypes, team, { isShiny: isShinyPassive })
        }).score;
    }

    function isChallengeStrategyActive(mode = activeAutoRunMode) {
        const contextKind = activeChallengeContext?.kind || '';
        return isChallengeAutoRunMode(mode) ||
               ['weekly-subchallenge', 'challenge-mode', 'resume-challenge'].includes(contextKind);
    }

    function getChallengeMapOrdinal(progress = getTowerProgressContext()) {
        return EasyPokelikeStrategyUtils.getChallengeMapOrdinal(progress);
    }

    function getChallengeBossPrepTargets(context = {}) {
        return EasyPokelikeStrategyUtils.getChallengeBossPrepTargets({
            active: isChallengeStrategyActive(),
            progress: context.progress || getTowerProgressContext(),
            isFinalBoss: context.isFinalBoss,
            isBigBoss: context.isBigBoss,
            isMap2: context.isMap2,
            reward: context.reward,
            round: context.round,
            opponentName: context.opponentName,
            targets: CONFIG.CHALLENGE_BOSS_PREP_TARGETS || {}
        });
    }

    function getChallengePriorityTypeScore(types = []) {
        return EasyPokelikeStrategyUtils.scorePriorityTypes({
            types,
            priorityTypes: CONFIG.CHALLENGE_PRIORITY_TYPES || [],
            minRank: 4,
            weight: 3
        }).score;
    }

    function getChallengeStrategyContext(team = [], opponentProfile = null) {
        const active = isChallengeStrategyActive();
        if (!active) {
            return { active: false, hasShiny: false, earlyShinyHunt: false, carry: null, bossTypes: [] };
        }

        const alive = getAliveTeam(team || []);
        const progress = getTowerProgressContext();
        const mapOrdinal = getChallengeMapOrdinal(progress);
        const carry = getPrimaryCarry(team || []);
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
        const prepStatus = getBossPrepStatus(team || [], opponentProfile);
        const prepPressure = Math.max(0, (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0));
        const carryHeldScore = carry?.heldItem
            ? scoreHeldItemForPokemon(carry, carry.heldItem, opponentProfile || bossTypes)
            : 0;
        const stats = getUnitOffenseSpeedSnapshot(carry);
        const moveTier = getUnitKnownMoveTier(carry);
        const hasShiny = alive.some(p => p.isShiny);
        const carryNeedsItem = Boolean(
            carry &&
            !carry.isFainted &&
            (!carry.heldItem || carryHeldScore < CONFIG.CHALLENGE_CARRY_MIN_ITEM_SCORE)
        );
        const needsCarryBuff = Boolean(
            carry &&
            !carry.isFainted &&
            (
                !stats.statsKnown ||
                stats.offense < CONFIG.CHALLENGE_CARRY_OFFENSE_TARGET ||
                stats.speed < CONFIG.CHALLENGE_CARRY_SPEED_TARGET ||
                moveTier < CONFIG.CHALLENGE_CARRY_MOVE_TIER_TARGET ||
                prepPressure > 0
            )
        );

        return {
            active,
            alive,
            progress,
            mapOrdinal,
            carry,
            bossTypes,
            prepStatus,
            prepPressure,
            hasShiny,
            earlyShinyHunt: !hasShiny && mapOrdinal <= CONFIG.CHALLENGE_SHINY_SCOUT_MAP_COUNT,
            carryHeldScore,
            carryNeedsItem,
            needsCarryBuff,
            underleveled: prepPressure > 0 || shouldPrioritizeEarlyTraining(team || [], opponentProfile),
            stats,
            moveTier,
            opponentProfile
        };
    }

    function getChallengeStrategyNodeBonus(type, context = {}) {
        const strategy = context.challengeStrategy || getChallengeStrategyContext(context.team || [], context.opponentProfile || null);
        const centerNeed = context.centerNeed || getCenterNeedStatus(context.team || []);
        return EasyPokelikeStrategyUtils.scoreChallengeRouteBonus({
            active: strategy.active,
            nodeType: type,
            earlyShinyHunt: strategy.earlyShinyHunt,
            prepPressure: strategy.prepPressure,
            prepReady: strategy.prepStatus?.ready ?? true,
            centerCanSkip: centerNeed.canSkipCenter,
            carryNeedsItem: strategy.carryNeedsItem,
            needsCarryBuff: strategy.needsCarryBuff,
            underleveled: strategy.underleveled,
            config: {
                shinyScoutPressureLimit: CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT,
                challengeFirstShinyNodeBonus: CONFIG.CHALLENGE_FIRST_SHINY_NODE_BONUS,
                challengeCarryItemNodeBonus: CONFIG.CHALLENGE_CARRY_ITEM_NODE_BONUS,
                challengeCarryBuffNodeBonus: CONFIG.CHALLENGE_CARRY_BUFF_NODE_BONUS,
                challengeTrainerLevelNodeBonus: CONFIG.CHALLENGE_TRAINER_LEVEL_NODE_BONUS
            }
        }).score;
    }

    function scoreChallengeCatchScoreBonus(candidate, team, bossTypes, opponentProfile = null) {
        const strategy = getChallengeStrategyContext(team || [], opponentProfile);
        if (!strategy.active || !candidate) return 0;

        const name = candidate.name || candidate.candidateName || '';
        const types = normalizeTypeList(candidate.types || []);
        const attacks = normalizeTypeList(candidate.attackTypes?.length ? candidate.attackTypes : types);
        const level = candidate.level || 0;
        const stats = getPokemonBaseStats(name);
        const bst = getPokemonBaseStatTotal(stats);
        const offense = Math.max(getPokemonStat(stats, 'atk', 'attack'), getPokemonStat(stats, 'special', 'spa', 'spatk'));
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const targetTypes = normalizeTypeList(bossTypes || strategy.bossTypes);
        return EasyPokelikeStrategyUtils.scoreChallengeCatchBonus({
            active: strategy.active,
            name,
            types,
            attackTypes: attacks,
            isShiny: candidate.isShiny,
            alreadyOwnedShiny: candidate.alreadyOwnedShiny,
            isLegendary: candidate.isLegendary,
            isMainCarry: isMainCarryName(name),
            hasShiny: strategy.hasShiny,
            earlyShinyHunt: strategy.earlyShinyHunt,
            targetTypes,
            bossCounterScore: scoreCatchBossCounter(types, attacks, targetTypes),
            priorityTypeScore: getChallengePriorityTypeScore(types),
            level,
            prepAvgLevel: strategy.prepStatus?.avgLevel || 0,
            stats: { bst, offense, speed },
            config: {
                challengeShinyCatchBonus: CONFIG.CHALLENGE_SHINY_CATCH_BONUS,
                challengeNonShinyEarlyPenalty: CONFIG.CHALLENGE_NON_SHINY_EARLY_PENALTY,
                earlyExpansionCounterScore: CONFIG.EARLY_EXPANSION_COUNTER_SCORE,
                legendaryCatchMinBst: CONFIG.LEGENDARY_CATCH_MIN_BST
            }
        }).score;
    }

    function scoreChallengeItemForTeam(itemName, team, bossType = null) {
        itemName = normalizeItemName(itemName);
        const strategy = getChallengeStrategyContext(team || [], bossType);
        const carry = strategy.carry;
        const boostType = getItemBoostType(itemName);
        const isUsable = USABLE_ITEMS.has(itemName);
        const carryNewScore = carry && !isUsable ? scoreHeldItemForPokemon(carry, itemName, bossType) : 0;
        const carryOldScore = carry && carry.heldItem && !isUsable ? scoreHeldItemForPokemon(carry, carry.heldItem, bossType) : 0;

        return EasyPokelikeStrategyUtils.scoreChallengeItemBonus({
            active: strategy.active,
            itemName,
            isLowValue: isLowValueHeldItem(itemName),
            isUsable,
            faintedCount: (team || []).filter(p => p.isFainted).length,
            prepPressure: strategy.prepPressure,
            hasCarry: Boolean(carry),
            carryLevel: carry?.level || 0,
            carryHeldItem: carry?.heldItem || '',
            carryNeedsItem: strategy.carryNeedsItem,
            needsCarryBuff: strategy.needsCarryBuff,
            underleveled: strategy.underleveled,
            moveTier: strategy.moveTier,
            carryNewScore,
            carryOldScore,
            isMainCarryPreferredItem: isMainCarryPreferredHeldItem(itemName),
            isSustainItem: MAIN_CARRY_SUSTAIN_ITEMS.has(itemName),
            isOffenseItem: MAIN_CARRY_OFFENSE_ITEMS.has(itemName),
            isUtilityItem: ['lucky egg', 'expert belt', 'loaded dice', 'power bracer'].includes(itemName),
            boostType,
            carryMatchesBoost: Boolean(boostType && hasMatchingAttackForItem(carry, itemName)),
            config: {
                challengeCarryMoveTierTarget: CONFIG.CHALLENGE_CARRY_MOVE_TIER_TARGET
            }
        }).score;
    }

    function scoreChallengePassiveCardPurpose({
        passiveTypes,
        text,
        team,
        opponentProfile = null,
        isShinyPassive,
        isSpeed,
        isSurvival,
        isDamage,
        isSustain,
        isScaling,
        isMultiHit
    }) {
        const strategy = getChallengeStrategyContext(team || [], opponentProfile);
        const signals = {
            ...EasyPokelikeStrategyUtils.detectPassiveTextSignals(text),
            isSpeed,
            isSurvival,
            isDamage,
            isSustain,
            isScaling,
            isMultiHit
        };

        return EasyPokelikeStrategyUtils.scoreChallengePassiveCardPurpose({
            active: strategy.active,
            passiveTypes,
            signals,
            isShinyPassive,
            hasShiny: strategy.hasShiny,
            underleveled: strategy.underleveled,
            carryNeedsItem: strategy.carryNeedsItem,
            carryTypes: [
                ...(strategy.carry?.types || []),
                ...getUnitAttackTypes(strategy.carry)
            ],
            traitCounts: getTeamTraitCounts(team || []),
            bossTypes: strategy.bossTypes,
            priorityTypeScore: getChallengePriorityTypeScore(passiveTypes || []),
            config: {
                challengeCarryBuffNodeBonus: CONFIG.CHALLENGE_CARRY_BUFF_NODE_BONUS
            }
        }).score;
    }

    function scoreChallengeStarterFit(name, types, isShiny = false) {
        if (!isChallengeStrategyActive()) return 0;
        const normalizedTypes = normalizeTypeList(types || []);
        const attackTypes = name ? getLikelyAttackTypes({ name, types: normalizedTypes, level: 0 }) : normalizedTypes;
        const bossTypes = detectBossTypes();
        const allowedTypes = normalizeTypeList(activeChallengeContext?.allowedTypes || []);
        const stats = getPokemonBaseStats(name);
        const bst = getPokemonBaseStatTotal(stats);

        return EasyPokelikeStrategyUtils.scoreChallengeStarterFit({
            active: true,
            name,
            types: normalizedTypes,
            attackTypes,
            bossTypes,
            allowedTypes,
            isShiny,
            isMainCarry: Boolean(name && isMainCarryName(name)),
            isLegendary: Boolean(name && isLegendaryPokemonName(name)),
            bst,
            priorityTypeScore: getChallengePriorityTypeScore(normalizedTypes),
            config: {
                challengeShinyCatchBonus: CONFIG.CHALLENGE_SHINY_CATCH_BONUS
            }
        }).score;
    }

    function scoreStartingItemChoice(choice, team, opponentProfile = null) {
        const itemName = getItemNameFromElement(choice);
        if (itemName) return scoreItemForTeam(itemName, team, opponentProfile);

        const text = getChoiceSearchText(choice);
        let score = 20;
        if (text.match(/leftovers|restos|shell bell|concha/)) score += 170;
        if (text.match(/choice band|choice specs|cinta eleccion|gafas eleccion|life orb|vidaesfera/)) score += 150;
        if (text.match(/rare candy|caramelo|tm normal|mt normal|lucky egg|huevo suerte/)) score += 120;
        if (text.match(/eviolite|mineral|king|corona|lagging tail|cola/)) score -= 160;
        if (isChallengeStrategyActive()) score += 40;
        return score;
    }

    function isStoryStrategyActive(mode = activeAutoRunMode) {
        const contextKind = activeChallengeContext?.kind || '';
        return mode === 'story' ||
               contextKind === 'story-mode' ||
               getBotControlRunMode() === 'story';
    }

    function getStoryRegionKey(labels = getProgressLabels()) {
        return EasyPokelikeStrategyUtils.getStoryRegionKeyFromLabels({
            labels,
            currentMapKey,
            activeChallengeTarget: activeChallengeContext?.target || '',
            mapPreference: getBotControlMapPreference() || ''
        });
    }

    function getStoryLeagueBossKeys(region = getStoryRegionKey()) {
        return EasyPokelikeStrategyUtils.getStoryLeagueBossKeys(region, STORY_LEAGUE_FINALS);
    }

    function getBossProfileByKey(key) {
        const normalizedKey = foldText(key || '');
        const dbEntry = BOSS_TEAM_DB[normalizedKey];
        if (dbEntry) {
            return makeOpponentProfile({
                name: dbEntry.name,
                types: dbEntry.types || [],
                team: dbEntry.team || [],
                sourceConfidence: 'boss-team-db'
            });
        }
        const type = BOSS_TYPE_MAP[normalizedKey];
        if (type) {
            return makeOpponentProfile({
                name: normalizedKey,
                types: [type],
                sourceConfidence: 'boss-type-map'
            });
        }
        return null;
    }

    function getStoryLeagueProfiles(region = getStoryRegionKey()) {
        return getStoryLeagueBossKeys(region)
            .map(key => getBossProfileByKey(key))
            .filter(Boolean);
    }

    function getStoryBossPrepTargets(context = {}) {
        return EasyPokelikeStrategyUtils.getStoryBossPrepTargets({
            active: isStoryStrategyActive(),
            progress: context.progress || getTowerProgressContext(),
            labels: getProgressLabels() || [],
            currentMapKey,
            activeChallengeTarget: activeChallengeContext?.target || '',
            mapPreference: getBotControlMapPreference() || '',
            isFinalBoss: context.isFinalBoss,
            isBigBoss: context.isBigBoss,
            isMap2: context.isMap2,
            reward: context.reward,
            round: context.round,
            opponentName: context.opponentName,
            targets: CONFIG.STORY_BOSS_PREP_TARGETS || {},
            leagueFinals: STORY_LEAGUE_FINALS
        });
    }

    function getStoryPriorityTypeScore(types = []) {
        return EasyPokelikeStrategyUtils.scorePriorityTypes({
            types,
            priorityTypes: CONFIG.STORY_PRIORITY_TYPES || [],
            minRank: 4,
            weight: 2.6
        }).score;
    }

    function getStoryStrategyContext(team = [], opponentProfile = null) {
        const active = isStoryStrategyActive();
        if (!active) {
            return { active: false, region: '', leagueProfiles: [], leagueTypes: [], needsTeam: false };
        }

        const alive = getAliveTeam(team || []);
        const region = getStoryRegionKey();
        const leagueProfiles = getStoryLeagueProfiles(region);
        const leagueTypes = normalizeTypeList(leagueProfiles.flatMap(profile => getOpponentTeamTypes(profile)));
        const currentBossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
        const teamAttackTypes = normalizeTypeList(alive.flatMap(p => getUnitAttackTypes(p)));
        const teamTypes = getTeamTypes(alive);
        const uncoveredLeagueTypes = leagueTypes.filter(type => getAttackCoverageScore(teamAttackTypes, [type]) <= 0);
        const weakMembers = alive.filter(p => {
            const bst = getPokemonBaseStatTotal(getPokemonBaseStats(p.name));
            return !isLegendaryPokemonName(p.name) && (!bst || bst < CONFIG.STORY_MIN_BST_TARGET);
        });
        const prepStatus = getBossPrepStatus(team || [], opponentProfile);

        return {
            active,
            region,
            alive,
            leagueProfiles,
            leagueTypes,
            currentBossTypes,
            teamAttackTypes,
            teamTypes,
            uncoveredLeagueTypes,
            needsTeam: alive.length < CONFIG.STORY_TARGET_TEAM_SIZE,
            needsCoverage: uncoveredLeagueTypes.length > 0 || teamAttackTypes.length < CONFIG.STORY_BALANCED_COVERAGE_TARGET,
            weakMembers,
            prepStatus,
            prepPressure: Math.max(0, (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0)),
            carry: getPrimaryCarry(team || [])
        };
    }

    function scoreStoryLeagueCoverage(attacks = [], types = [], strategy = null) {
        const story = strategy || getStoryStrategyContext();
        return EasyPokelikeStrategyUtils.scoreStoryLeagueCoverage({
            active: story.active,
            attackTypes: attacks.length ? attacks : types,
            types,
            leagueTypes: story.leagueTypes || [],
            uncoveredLeagueTypes: story.uncoveredLeagueTypes || [],
            config: {
                storyLeagueCoverageBonus: CONFIG.STORY_LEAGUE_COVERAGE_BONUS
            }
        }).score;
    }

    function scoreStoryCatchScoreBonus(candidate, team, bossTypes, opponentProfile = null) {
        const story = getStoryStrategyContext(team || [], opponentProfile);
        if (!story.active || !candidate) return 0;

        const name = candidate.name || '';
        const types = normalizeTypeList(candidate.types || []);
        const attacks = normalizeTypeList(candidate.attackTypes?.length ? candidate.attackTypes : types);
        const stats = getPokemonBaseStats(name);
        const bst = getPokemonBaseStatTotal(stats);
        const offense = Math.max(getPokemonStat(stats, 'atk', 'attack'), getPokemonStat(stats, 'special', 'spa', 'spatk'));
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        const currentBossTypes = normalizeTypeList(bossTypes || story.currentBossTypes);

        const key = getPokemonIdentityKey(name);
        const duplicateCount = (team || []).filter(p => getPokemonIdentityKey(p.name) === key).length;
        return EasyPokelikeStrategyUtils.scoreStoryCatchBonus({
            active: story.active,
            name,
            types,
            attackTypes: attacks,
            isShiny: candidate.isShiny,
            isLegendary: candidate.isLegendary,
            isLegendaryName: isLegendaryPokemonName(name),
            isMainCarry: isMainCarryName(name),
            needsTeam: story.needsTeam,
            needsCoverage: story.needsCoverage,
            currentBossTypes,
            leagueTypes: story.leagueTypes || [],
            uncoveredLeagueTypes: story.uncoveredLeagueTypes || [],
            priorityTypeScore: getStoryPriorityTypeScore(types),
            duplicateCount,
            stats: { bst, offense, speed, bulk },
            config: {
                storyMinBstTarget: CONFIG.STORY_MIN_BST_TARGET,
                storyWeakStatPenalty: CONFIG.STORY_WEAK_STAT_PENALTY,
                storyCurrentBossCoverageBonus: CONFIG.STORY_CURRENT_BOSS_COVERAGE_BONUS,
                storyLeagueCoverageBonus: CONFIG.STORY_LEAGUE_COVERAGE_BONUS,
                legendaryCatchMinBst: CONFIG.LEGENDARY_CATCH_MIN_BST
            }
        }).score;
    }

    function scoreStoryItemForTeam(itemName, team, bossType = null) {
        itemName = normalizeItemName(itemName);
        const story = getStoryStrategyContext(team || [], bossType);
        const carry = story.carry;
        const isUsable = USABLE_ITEMS.has(itemName);
        const boostType = getItemBoostType(itemName);
        const carryOldScore = carry && carry.heldItem && !isUsable ? scoreHeldItemForPokemon(carry, carry.heldItem, bossType) : 0;
        const carryNewScore = carry && !isUsable ? scoreHeldItemForPokemon(carry, itemName, bossType) : 0;

        return EasyPokelikeStrategyUtils.scoreStoryItemBonus({
            active: story.active,
            itemName,
            isLowValue: isLowValueHeldItem(itemName),
            isUsable,
            hasFainted: (team || []).some(p => p.isFainted),
            prepPressure: story.prepPressure,
            hasCarry: Boolean(carry),
            carryNewScore,
            carryOldScore,
            boostType,
            carryMatchesBoost: Boolean(boostType && hasMatchingAttackForItem(carry, itemName))
        }).score;
    }

    function getStoryStrategyNodeBonus(type, context = {}) {
        const story = context.storyStrategy || getStoryStrategyContext(context.team || [], context.opponentProfile || null);
        const centerNeed = context.centerNeed || getCenterNeedStatus(context.team || []);
        return EasyPokelikeStrategyUtils.scoreStoryRouteBonus({
            active: story.active,
            nodeType: type,
            needsTeam: story.needsTeam,
            needsCoverage: story.needsCoverage,
            prepPressure: story.prepPressure,
            prepReady: story.prepStatus?.ready ?? true,
            weakMemberCount: story.weakMembers?.length || 0,
            centerCanSkip: centerNeed.canSkipCenter,
            config: {
                storyRouteTeamBuildBonus: CONFIG.STORY_ROUTE_TEAM_BUILD_BONUS,
                storyRouteCoverageBonus: CONFIG.STORY_ROUTE_COVERAGE_BONUS,
                storyRouteTrainingBonus: CONFIG.STORY_ROUTE_TRAINING_BONUS
            }
        }).score;
    }

    function scoreStoryStarterFit(name, types, isShiny = false) {
        if (!isStoryStrategyActive()) return 0;
        const normalizedTypes = normalizeTypeList(types || []);
        const attacks = name ? getLikelyAttackTypes({ name, types: normalizedTypes, level: 0 }) : normalizedTypes;
        const story = getStoryStrategyContext([], detectNextOpponentProfile());
        const stats = getPokemonBaseStats(name);
        const bst = getPokemonBaseStatTotal(stats);
        return EasyPokelikeStrategyUtils.scoreStoryStarterFit({
            active: true,
            name,
            isShiny,
            isLegendary: Boolean(name && isLegendaryPokemonName(name)),
            isMainCarry: Boolean(name && isMainCarryName(name)),
            bst,
            leagueCoverageScore: scoreStoryLeagueCoverage(attacks, normalizedTypes, story),
            priorityTypeScore: getStoryPriorityTypeScore(normalizedTypes)
        }).score;
    }

    function getTierScore(itemName) {
        const tier = ITEM_TIERS[normalizeItemName(itemName)] || 'D';
        return TIER_SCORE[tier] || 10;
    }

    function getItemBoostType(itemName) {
        return EasyPokelikeStrategyUtils.getItemBoostType(normalizeItemName(itemName), ITEM_TYPE_MATCH);
    }

    function getPrimaryAttackTypeFromPokedexEntry(entry) {
        if (!entry) return null;
        const rawCandidates = [
            entry.primaryAttackType,
            entry.mainAttackType,
            entry.attackType,
            entry.moveType,
            entry.primaryMove?.type,
            entry.mainMove?.type,
            entry.move?.type,
            Array.isArray(entry.moves) ? entry.moves[0]?.type : null,
            Array.isArray(entry.attacks) ? entry.attacks[0]?.type : null,
        ];

        for (const value of rawCandidates) {
            if (!value) continue;
            if (TYPES.includes(value)) return value;
            const detectedTypes = detectTypesInText(String(value));
            if (detectedTypes.length > 0) return detectedTypes[0];
        }

        return null;
    }

    function getUnitPrimaryAttackType(unit) {
        if (!unit) return null;
        const name = typeof unit === 'string' ? unit : unit.name;

        const cachedInfo = getCachedPokemonInfo(name);
        if (cachedInfo?.primaryAttackType) return cachedInfo.primaryAttackType;
        if (cachedInfo?.attackTypes && cachedInfo.attackTypes.length > 0) return cachedInfo.attackTypes[0];

        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES[key]) {
                return POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES[key];
            }
        }

        const pokedexPrimary = getPrimaryAttackTypeFromPokedexEntry(getPokelikePokedexEntry(name));
        if (pokedexPrimary) return pokedexPrimary;

        const explicitAttackTypes = normalizeTypeList(typeof unit === 'object' ? (unit.attackTypes || []) : []);
        if (explicitAttackTypes.length > 0) return explicitAttackTypes[0];

        const knownTypes = normalizeTypeList((typeof unit === 'object' && unit.types && unit.types.length > 0) ? unit.types : getKnownPokemonTypes(name));
        if (knownTypes.length > 0) return knownTypes[0];

        const likelyTypes = getLikelyAttackTypes(typeof unit === 'object' ? unit : { name });
        return likelyTypes.length > 0 ? likelyTypes[0] : null;
    }

    function getUnitPrimaryAttackTypes(unit) {
        const primaryType = getUnitPrimaryAttackType(unit);
        return primaryType ? [primaryType] : [];
    }

    function getConfirmedUnitAttackTypes(unit) {
        if (!unit) return [];
        const name = typeof unit === 'string' ? unit : unit.name;
        const confirmed = new Set();
        const addTypes = values => normalizeTypeList(values || []).forEach(type => confirmed.add(type));
        const addMoveTypes = moves => {
            if (!Array.isArray(moves)) return;
            addTypes(moves.map(move => move?.type).filter(Boolean));
        };

        if (typeof unit === 'object') {
            addMoveTypes(unit.moves);
            addTypes(getAttackTypesFromElement(unit.element, []));
        }

        const cachedInfo = getCachedPokemonInfo(name);
        addMoveTypes(cachedInfo?.moves);
        addTypes([cachedInfo?.primaryAttackType].filter(Boolean));

        const explicitAttackTypes = normalizeTypeList(typeof unit === 'object' ? (unit.attackTypes || []) : []);
        const unitTypes = normalizeTypeList(typeof unit === 'object' ? (unit.types || []) : getKnownPokemonTypes(name));
        const explicitLooksLikeTypeFallback = explicitAttackTypes.length > 0 &&
            explicitAttackTypes.length === unitTypes.length &&
            explicitAttackTypes.every(type => unitTypes.includes(type));
        if (!explicitLooksLikeTypeFallback) addTypes(explicitAttackTypes);

        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES[key]) {
                addTypes([POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES[key]]);
            }
        }

        const pokedexPrimary = getPrimaryAttackTypeFromPokedexEntry(getPokelikePokedexEntry(name));
        if (pokedexPrimary) addTypes([pokedexPrimary]);

        return [...confirmed];
    }

    function hasMatchingAttackForItem(unit, itemName) {
        return EasyPokelikeStrategyUtils.hasMatchingAttackForItem(unit, normalizeItemName(itemName), {
            itemTypeMatch: ITEM_TYPE_MATCH,
            getAttackTypes: getConfirmedUnitAttackTypes
        });
    }

    function isTypeBoostItemUsefulForTeam(itemName, team) {
        return EasyPokelikeStrategyUtils.isTypeBoostItemUsefulForTeam(normalizeItemName(itemName), getAliveTeam(team), {
            itemTypeMatch: ITEM_TYPE_MATCH,
            getAttackTypes: getConfirmedUnitAttackTypes
        });
    }

    function getConfiguredMainCarryKeys() {
        const configuredKeys = (CONFIG.MAIN_CARRY_NAMES || []).flatMap(name => getPokemonLookupKeys(name));
        return [...new Set([...configuredKeys, getBotControlSelectedMainKey()].filter(Boolean))];
    }

    function isMainCarryName(name) {
        if (!name) return false;
        const carryKeys = getConfiguredMainCarryKeys();
        const lookupKeys = getPokemonLookupKeys(name);
        return lookupKeys.some(key => carryKeys.some(carryKey => key === carryKey || key.startsWith(`${carryKey}-`)));
    }

    function isMainCarryUnit(unit) {
        return Boolean(unit && isMainCarryName(unit.name));
    }

    function getMainCarry(team) {
        return getAliveTeam(team || []).find(p => isMainCarryUnit(p)) || null;
    }

    function getPrimaryCarry(team) {
        const alive = getAliveTeam(team || []);
        return alive.find(p => p.index === 0 && isMainCarryUnit(p)) ||
               getMainCarry(alive) ||
               alive[0] ||
               null;
    }

    function getPokemonIdentityKey(name) {
        return getPokemonLookupKeys(name)[0] || foldText(name || '');
    }

    function getSameNameTeamGroup(team, name) {
        const key = getPokemonIdentityKey(name);
        const units = (team || []).filter(p => p && getPokemonIdentityKey(p.name) === key);
        return {
            key,
            name: units[0]?.name || name || '',
            units,
            alive: units.filter(p => !p.isFainted),
            fainted: units.filter(p => p.isFainted)
        };
    }

    function getDuplicateGroups(team) {
        const groups = new Map();
        (team || []).forEach(unit => {
            if (!unit?.name) return;
            const key = getPokemonIdentityKey(unit.name);
            if (!key) return;
            if (!groups.has(key)) {
                groups.set(key, { key, name: unit.name, units: [], alive: [], fainted: [] });
            }
            const group = groups.get(key);
            group.units.push(unit);
            if (unit.isFainted) group.fainted.push(unit);
            else group.alive.push(unit);
        });

        return [...groups.values()].filter(group => group.units.length >= 2);
    }

    function getDuplicatePairCount(team) {
        return getDuplicateGroups(team).length;
    }

    function hasDuplicatePair(team) {
        return getDuplicatePairCount(team) > 0;
    }

    function getExpectedCatchCopiesFromOpenSlots(team) {
        const freeSlots = Math.max(0, CONFIG.TEAM_TARGET_SIZE - (team || []).length);
        if (!getBotControlDuplicateCatchesEnabled()) return freeSlots > 0 ? 1 : 0;
        return Math.min(2, freeSlots);
    }

    function getDuplicatePairCatchScore(candidateName, candidateTypes, team, attackTypes = null, bossTypes = null, options = {}) {
        if (!getBotControlDuplicateCatchesEnabled()) return 0;
        if (!candidateName) return 0;

        const expectedCopies = Number.isFinite(options.expectedCatchCopies)
            ? Math.max(0, options.expectedCatchCopies)
            : 0;
        const group = getSameNameTeamGroup(team, candidateName);
        const existingCount = group.units.length;
        const alreadyHasThisPair = existingCount >= 2;
        const teamAlreadyHasPair = hasDuplicatePair(team);
        const duplicateOpeningMode = isDuplicatePriorityMode() && !teamAlreadyHasPair;
        const createsPair = expectedCopies >= 2 ||
                             (existingCount > 0 && existingCount + expectedCopies >= 2) ||
                             (duplicateOpeningMode && existingCount > 0);
        if (!createsPair && !alreadyHasThisPair) return 0;

        if (isDuplicatePriorityMode() && (teamAlreadyHasPair || alreadyHasThisPair)) {
            return 0;
        }

        const types = normalizeTypeList(candidateTypes);
        const targetTypes = normalizeTypeList(bossTypes);
        const teamTypes = getTeamTypes(team);
        const addsNewType = types.some(type => !teamTypes.includes(type));
        const bossCounterScore = targetTypes.length > 0
            ? scoreCatchBossCounter(types, attackTypes || types, targetTypes)
            : 0;

        let score = 0;
        if (createsPair && !alreadyHasThisPair) {
            score += teamAlreadyHasPair
                ? CONFIG.DUPLICATE_EXTRA_PAIR_CATCH_BONUS
                : CONFIG.DUPLICATE_FIRST_PAIR_CATCH_BONUS;
            if (existingCount === 1) score += Math.round(CONFIG.DUPLICATE_PAIR_CREATE_SWAP_BONUS * 0.5);
            if (expectedCopies >= 2) score += 6;
            if (isDuplicatePriorityMode()) {
                score += CONFIG.DUPLICATE_PRIORITY_CATCH_BONUS;
                if (existingCount === 1) score += Math.round(CONFIG.DUPLICATE_PRIORITY_CATCH_BONUS * 0.35);
                if (expectedCopies >= 2) score += Math.round(CONFIG.DUPLICATE_PRIORITY_CATCH_BONUS * 0.2);
            }
        } else {
            score += CONFIG.DUPLICATE_EXISTING_PAIR_CATCH_BONUS;
            if (isDuplicatePriorityMode()) {
                score += Math.round(CONFIG.DUPLICATE_PRIORITY_CATCH_BONUS * 0.7);
            }
        }

        if (addsNewType) score += 8;
        if (bossCounterScore > 0) score += Math.min(20, bossCounterScore);

        const bst = getPokemonBaseStatTotal(getPokemonBaseStats(candidateName));
        if (bst >= CONFIG.LEGENDARY_CATCH_MIN_BST) score += 10;
        else if (bst >= 480) score += 5;

        if (!addsNewType && bossCounterScore <= 0 && teamTypes.length < CONFIG.DUPLICATE_MIN_COVERAGE_TYPES_BEFORE_EXTRA_PAIR) {
            score -= CONFIG.DUPLICATE_LOW_COVERAGE_PENALTY;
        }
        if (teamAlreadyHasPair && !addsNewType && bossCounterScore <= 0 && !isLegendaryPokemonName(candidateName)) {
            score -= Math.round(CONFIG.DUPLICATE_LOW_COVERAGE_PENALTY * 0.7);
        }

        return Math.max(0, score);
    }

    function getDuplicatePairRouteScore(team) {
        if (!getBotControlDuplicateCatchesEnabled()) return 0;
        if (isDuplicatePriorityMode()) {
            return shouldPrioritizeOpeningDuplicatePair(team)
                ? CONFIG.DUPLICATE_PRIORITY_ROUTE_BONUS
                : 0;
        }
        if (getExpectedCatchCopiesFromOpenSlots(team) < 2) return 0;
        return hasDuplicatePair(team)
            ? Math.round(CONFIG.DUPLICATE_PAIR_ROUTE_BONUS * 0.3)
            : CONFIG.DUPLICATE_PAIR_ROUTE_BONUS;
    }

    function getDuplicateIncomingSwapScore(candidateName, team) {
        if (!getBotControlDuplicateCatchesEnabled()) return 0;
        const group = getSameNameTeamGroup(team, candidateName);
        if (isDuplicatePriorityMode()) {
            if (!hasDuplicatePair(team) && group.units.length === 1) {
                return CONFIG.DUPLICATE_PRIORITY_INCOMING_SWAP_BONUS;
            }
            return 0;
        }
        if (group.units.length === 1) return CONFIG.DUPLICATE_PAIR_CREATE_SWAP_BONUS;
        if (group.units.length >= 2) return Math.round(CONFIG.DUPLICATE_EXTRA_PAIR_CATCH_BONUS * 0.8);
        return 0;
    }

    function getDuplicatePairReplacementProtectionScore(unit, team, incomingName = '') {
        if (!getBotControlDuplicateCatchesEnabled()) return 0;
        if (!unit?.name) return 0;

        const group = getSameNameTeamGroup(team, unit.name);
        const incomingKeepsSingleton = group.units.length === 1 &&
            incomingName &&
            getPokemonIdentityKey(incomingName) === group.key;
        if (incomingKeepsSingleton) {
            if (isDuplicatePriorityMode() && !hasDuplicatePair(team)) {
                return CONFIG.DUPLICATE_PRIORITY_KEEP_BONUS;
            }
            return CONFIG.DUPLICATE_PAIR_CREATE_SWAP_BONUS + 10;
        }
        if (group.units.length < 2) return 0;

        if (isDuplicatePriorityMode()) {
            let priorityScore = CONFIG.DUPLICATE_PRIORITY_KEEP_BONUS;
            if (group.units.length === 2) priorityScore += 1500;
            if (group.alive.length > 0 && group.fainted.length > 0) priorityScore += 700;
            if (group.alive.length >= 2) priorityScore += 450;
            if (isMainCarryUnit(unit)) priorityScore += 350;
            return priorityScore;
        }

        let score = CONFIG.DUPLICATE_PAIR_KEEP_BONUS;
        if (group.units.length === 2) score += 12;
        else if (group.units.length >= 3) score -= 12;
        if (group.alive.length > 0 && group.fainted.length > 0) score += CONFIG.DUPLICATE_PAIR_REVIVE_BONUS;
        if (group.alive.length >= 2) score += 8;
        if (isMainCarryUnit(unit)) score += 18;
        if (isLegendaryPokemonName(unit.name)) score += 12;

        const extraPairPenalty = Math.max(0, getDuplicatePairCount(team) - 1) * 8;
        if (extraPairPenalty && !isMainCarryUnit(unit) && !isLegendaryPokemonName(unit.name)) {
            score -= Math.min(18, extraPairPenalty);
        }

        return Math.max(8, score);
    }

    function isHealingItem(itemName) {
        return EasyPokelikeStrategyUtils.isHealingItem(normalizeItemName(itemName), MAIN_CARRY_SUSTAIN_ITEMS);
    }

    function isLowValueHeldItem(itemName) {
        return EasyPokelikeStrategyUtils.isLowValueHeldItem(normalizeItemName(itemName), LOW_VALUE_HELD_ITEMS);
    }

    function isMainCarryPreferredHeldItem(itemName) {
        itemName = normalizeItemName(itemName);
        return MAIN_CARRY_SUSTAIN_ITEMS.has(itemName) || MAIN_CARRY_OFFENSE_ITEMS.has(itemName);
    }

    function isMainCarryOffenseItem(itemName) {
        return MAIN_CARRY_OFFENSE_ITEMS.has(normalizeItemName(itemName));
    }

    function isPokemonElementShiny(element) {
        if (!element) return false;
        const text = element.innerText || '';
        return Boolean(
            element.classList?.contains('shiny') ||
            element.classList?.contains('shiny-card') ||
            element.classList?.contains('pc-dex-card--shiny') ||
            element.querySelector?.('.shiny, .shiny-icon, .shiny-star, .pc-shiny-star, [class*="shiny"], [data-shiny="true"]') ||
            text.includes('★')
        );
    }

    function getOwnedShinyDomNames() {
        const ownedNames = new Set();
        const selectors = [
            '.pc-dex-card--caught',
            '.pc-dex-card.caught',
            '.pc-dex-card.owned',
            '.dex-card.caught',
            '.dex-card.owned',
            '.poke-card.caught',
            '.poke-card.owned',
            '[data-caught="true"]',
            '[data-owned="true"]'
        ].join(', ');

        Array.from(document.querySelectorAll(selectors)).forEach(entry => {
            const text = getChoiceSearchText(entry);
            if (!isPokemonElementShiny(entry) && !text.match(/shiny|variocolor|brillante/)) return;
            const name = getPokemonNameFromCard(entry);
            const key = getPokemonIdentityKey(name);
            if (key) ownedNames.add(key);
        });

        return ownedNames;
    }

    function isAlreadyOwnedShinyName(name) {
        const nameKey = getPokemonIdentityKey(name);
        if (!nameKey) return false;
        if (getOwnedShinyDomNames().has(nameKey)) return true;

        const entry = getPokelikePokedexEntry(name);
        if (!entry || typeof entry !== 'object') return false;

        const explicitFields = [
            entry.shinyCaught,
            entry.caughtShiny,
            entry.shinyOwned,
            entry.ownedShiny,
            entry.shinyRegistered,
            entry.registeredShiny,
            entry.shinyObtained,
            entry.obtainedShiny,
            entry.hasCaughtShiny,
            entry.hasOwnedShiny
        ];
        if (explicitFields.some(Boolean)) return true;

        const shinyData = entry.shiny || entry.shinyDex || entry.variants?.shiny || entry.forms?.shiny;
        if (shinyData && typeof shinyData === 'object') {
            return Boolean(
                shinyData.caught ||
                shinyData.owned ||
                shinyData.registered ||
                shinyData.obtained ||
                shinyData.captured
            );
        }

        return false;
    }

    function isAlreadyOwnedShinyCandidate(element, fallbackName = '') {
        if (!element) return false;
        const text = getChoiceSearchText(element);
        const isShiny = isPokemonElementShiny(element) || Boolean(text.match(/shiny|variocolor|brillante/));
        if (!isShiny) return false;

        const explicitlyUnowned = Boolean(text.match(/unowned|not owned|not captured|sin capturar|no capturad/));
        const ownershipMarker = Boolean(text.match(/\bcaught\b|\bcaptured\b|capturad|ya captur|\bowned\b|\bobtained\b|obtenid|\bregistered\b|registrad|starter|initial|inicial|dex-owned|dex-caught/));
        if (!explicitlyUnowned && ownershipMarker) {
            return true;
        }

        const nameKey = getPokemonIdentityKey(fallbackName || getPokemonNameFromCard(element));
        return Boolean(nameKey && isAlreadyOwnedShinyName(fallbackName || getPokemonNameFromCard(element)));
    }

    function getOffenseRole(unit) {
        return isSpecialAttacker(unit) ? 'special' : 'physical';
    }

    function isConfiguredLegendaryName(name) {
        if (!name) return false;
        const legendaryKeys = (CONFIG.LEGENDARY_POKEMON_NAMES || []).flatMap(legendary => getPokemonLookupKeys(legendary));
        const lookupKeys = getPokemonLookupKeys(name);
        return lookupKeys.some(key => legendaryKeys.includes(key));
    }

    function isLegendaryPokemonName(name) {
        if (isConfiguredLegendaryName(name)) return true;
        const bst = getPokemonBaseStatTotal(getPokemonBaseStats(name));
        return bst >= CONFIG.LEGENDARY_CATCH_MIN_BST;
    }

    function getGrassSupportCatchScore(candidateTypes, team) {
        if (!getMainCarry(team) || !normalizeTypeList(candidateTypes).includes('Grass')) return 0;
        const grassCount = getTeamTraitCounts(team).Grass || 0;
        let score = CONFIG.GRASS_SUPPORT_CATCH_BONUS;
        if (grassCount === 1 || grassCount === 3 || grassCount === 5) {
            score += CONFIG.GRASS_SUPPORT_THRESHOLD_BONUS;
        } else if (grassCount === 0) {
            score += 8;
        }
        return score;
    }

    function getPokemonCarryScore(p) {
        if (!p) return 0;
        const traitScore = (p.types || []).reduce((sum, type) => {
            const trait = TRAIT_DATA[type];
            return sum + (trait ? (TRAIT_TIER_VALUE[trait.tier] || 1) : 0);
        }, 0);
        const sweeperBonus = (p.types || []).some(t => SWEEPER_TYPES.includes(t)) ? 14 : 0;
        const tankBonus = (p.types || []).some(t => TANK_TYPES.includes(t)) ? 8 : 0;
        const stats = getPokemonBaseStats(p);
        const atk = getPokemonStat(stats, 'atk', 'attack');
        const spa = getPokemonStat(stats, 'special', 'spa', 'spatk');
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        const statScore = stats ? Math.max(atk, spa) * 0.18 + speed * 0.08 + bulk * 0.04 : 0;
        const mainCarryBonus = isMainCarryUnit(p) ? 90 + (p.index === 0 ? 25 : 0) : 0;
        const sustainBonus = p.heldItem && isHealingItem(p.heldItem) ? 14 : 0;
        return (p.hp || 0) / 3 + (p.level || 0) / 2 + traitScore * 2 + sweeperBonus + tankBonus + statScore + mainCarryBonus + sustainBonus;
    }

    function getTraitCompletionScore(candidateTypes, team) {
        const counts = getTeamTraitCounts(team);
        const teamTypes = getTeamTypes(team);
        let score = 0;

        candidateTypes.forEach(type => {
            const traitInfo = TRAIT_DATA[type];
            if (!traitInfo) return;
            const current = counts[type] || 0;
            const tierValue = TRAIT_TIER_VALUE[traitInfo.tier] || 1;
            const nextThreshold = current < 2 ? 2 : current < 4 ? 4 : current < 6 ? 6 : 0;

            if (nextThreshold) {
                const missing = nextThreshold - current;
                if (missing === 1) score += tierValue * 3.2;
                else score += tierValue * 0.7;
            } else {
                score += tierValue * 0.4;
            }

            if (!teamTypes.includes(type)) {
                score += 5 + tierValue * 0.35;
            }
        });

        return score;
    }

    function scoreHeldItemForPokemon(p, itemName, bossType = null) {
        itemName = normalizeItemName(itemName);
        if (!p || !itemName || USABLE_ITEMS.has(itemName)) return 0;
        const targetTypes = getOpponentTeamTypes(bossType);

        let score = getTierScore(itemName) / 4;
        score += (p.hp || 0) / 25;
        score += getPokemonCarryScore(p) / 14;
        if (isLowValueHeldItem(itemName)) score -= 120;

        const matchingType = getItemBoostType(itemName);
        if (matchingType) {
            score += hasMatchingAttackForItem(p, itemName) ? 95 : -90;
        }

        if (itemName === 'metronome' && p.types.length > 1) score += 45;
        if (itemName === 'expert belt' && targetTypes.length > 0 && getAttackCoverageScore(getUnitAttackTypes(p), targetTypes) > 0) score += 80;
        if (itemName === 'red card' && bossType) score += 30;
        if (itemName === 'loaded dice' && p.types.some(t => ['Fire','Dragon','Dark','Electric'].includes(t))) score += 18;
        if (itemName === 'power bracer') score += 24;

        const isSweeper = p.types.some(t => SWEEPER_TYPES.includes(t));
        const isTank = p.types.some(t => TANK_TYPES.includes(t));
        const specialAttacker = isSpecialAttacker(p);
        const isMainCarry = isMainCarryUnit(p);
        const stats = getPokemonBaseStats(p);
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const offense = Math.max(getPokemonStat(stats, 'atk', 'attack'), getPokemonStat(stats, 'special', 'spa', 'spatk'));
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        if (['choice band', 'atk band'].includes(itemName)) score += specialAttacker ? -70 : 64;
        if (['choice specs', 'spa specs'].includes(itemName)) score += specialAttacker ? 64 : -70;
        if (itemName === 'life orb') score += 26 + (isSweeper ? 12 : 0);
        if (itemName === 'lagging tail') {
            if (stats) {
                if (speed <= 60) score += 40;
                else if (speed <= 80) score += 18;
                else if (speed >= 100) score -= 48;
                else if (speed >= 90) score -= 28;
                if (bulk >= 260) score += 18;
                if (offense >= 95) score += 16;
                if (speed >= 90 && offense >= 100) score -= 24;
            } else {
                score += isTank ? 18 : -12;
            }
            if (isSweeper && speed >= 90) score -= 24;
            score -= 150;
        }
        if (['choice scarf', 'quick claw'].includes(itemName) && isSweeper) score += 22;
        if (['scope lens', 'razor claw'].includes(itemName) && p.types.some(t => ['Dark','Ghost','Flying','Electric'].includes(t))) score += 26;
        if (itemName === 'shell bell' && isSweeper) score += 24;
        if (['leftovers', 'assault vest', 'rocky helmet', 'red card'].includes(itemName) && isTank) score += 24;
        if (itemName === 'eviolite') score -= 80;
        if (itemName === 'lucky egg') score += (p.index === 0 ? 34 : 16) + Math.max(0, 55 - (p.level || 55)) / 2;
        if (isMainCarry) {
            if (itemName === 'leftovers') {
                score += CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS + 125 + (p.index === 0 ? 55 : 0);
            } else if (itemName === 'shell bell') {
                score += CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS + 35 + (p.index === 0 ? 45 : 0);
            }
            if (isMainCarryOffenseItem(itemName) || ['power bracer', 'loaded dice', 'expert belt'].includes(itemName)) {
                score += CONFIG.MAIN_CARRY_OFFENSE_ITEM_BONUS;
            }
            if (itemName === 'lucky egg') {
                score += Math.max(0, 70 - (p.level || 70)) / 2;
            }
        }

        return score;
    }

    function scoreConsumableTarget(p, itemName) {
        itemName = normalizeItemName(itemName);
        if (!p) return 0;
        const carry = getPokemonCarryScore(p);
        const mainCarryBonus = isMainCarryUnit(p) ? CONFIG.MAIN_CARRY_CONSUMABLE_BONUS + (p.index === 0 ? 30 : 0) : 0;
        if (itemName === 'rare candy') {
            return carry + mainCarryBonus + (p.index === 0 ? 35 : 0) + Math.max(0, 80 - (p.level || 80)) / 4;
        }
        if (itemName === 'moon stone') {
            return carry / 2 + mainCarryBonus * 0.35 + 55 + (p.index === 0 ? 10 : 0);
        }
        if (itemName === 'tm normal') {
            return carry / 2 + mainCarryBonus * 0.7 + 45 + (p.index === 0 ? 25 : 0);
        }
        if (itemName === 'sacred ash') {
            return (p.isFainted ? 220 : 100 - (p.hp || 100)) + carry / 4 + mainCarryBonus * 0.6;
        }
        return carry / 3;
    }

    function getMoveTutorTargetStatus(candidate, sinnohTraining = null, challengeStrategy = null) {
        const unit = candidate?.unit;
        if (!unit) {
            return {
                canTutor: false,
                needsTutor: false,
                confirmedMax: false,
                isPreferredCarry: false,
                tier: -1,
                targetTier: CONFIG.SINNOH_TM_MAX_MOVE_TIER,
                reason: 'no-unit'
            };
        }

        const unitKey = getPokemonIdentityKey(unit.name);
        const isSinnohCarryTarget = Boolean(
            sinnohTraining?.active &&
            sinnohTraining.carry &&
            (
                candidate.teamIdx === sinnohTraining.carry.index ||
                unitKey === sinnohTraining.carryKey
            )
        );
        const isChallengeCarryTarget = Boolean(
            challengeStrategy?.active &&
            challengeStrategy.carry &&
            (
                candidate.teamIdx === challengeStrategy.carry.index ||
                unitKey === getPokemonIdentityKey(challengeStrategy.carry.name)
            )
        );
        const observedTier = getUnitKnownMoveTier(unit);
        const rememberedTier = isSinnohCarryTarget ? (sinnohTraining.carryMoveTier ?? -1) : -1;
        const tier = Math.max(observedTier, rememberedTier);
        const targetTier = isChallengeCarryTarget
            ? CONFIG.CHALLENGE_CARRY_MOVE_TIER_TARGET
            : CONFIG.SINNOH_TM_MAX_MOVE_TIER;
        const baseStatus = {
            canTutor: true,
            needsTutor: false,
            confirmedMax: false,
            isPreferredCarry: Boolean(isSinnohCarryTarget || isChallengeCarryTarget),
            tier,
            targetTier,
            reason: 'unknown-fallback'
        };

        if (tier >= targetTier) {
            return {
                ...baseStatus,
                canTutor: false,
                confirmedMax: true,
                reason: 'already-max-tier'
            };
        }

        if (tier >= 0 && tier < targetTier) {
            return {
                ...baseStatus,
                needsTutor: true,
                reason: 'known-low-tier'
            };
        }
        if (isSinnohCarryTarget && sinnohTraining.needsTm) {
            return {
                ...baseStatus,
                needsTutor: true,
                reason: 'sinnoh-carry-needs-tm'
            };
        }
        if (isChallengeCarryTarget && challengeStrategy.moveTier < CONFIG.CHALLENGE_CARRY_MOVE_TIER_TARGET) {
            return {
                ...baseStatus,
                needsTutor: true,
                reason: 'challenge-carry-needs-tm'
            };
        }

        return baseStatus;
    }

    let pokelikePokedexCacheSource = null;
    let pokelikePokedexCacheIndex = null;

    function getPokemonLookupKeys(name) {
        const folded = foldText(name || '')
            .replace(/\u2640/g, '-f')
            .replace(/\u2642/g, '-m')
            .replace(/[']/g, '');
        const safe = folded.replace(/[^a-z0-9. -]/g, ' ').replace(/\s+/g, ' ').trim();
        const noDot = safe.replace(/\./g, '');
        const hyphen = noDot.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const spaced = noDot.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        return [...new Set([
            folded,
            safe,
            noDot,
            hyphen,
            spaced,
            spaced === 'mr mime' ? 'mr. mime' : '',
            spaced === 'mime jr' ? 'mime-jr' : '',
        ].filter(Boolean))];
    }

    function getPokelikePokedex() {
        if (typeof window === 'undefined') return null;
        const pokedex = window.__POKEDEX__ || window.__POKEDEX_;
        return pokedex && typeof pokedex === 'object' ? pokedex : null;
    }

    function getPokelikePokedexIndex() {
        const pokedex = getPokelikePokedex();
        if (!pokedex) return null;
        if (pokedex === pokelikePokedexCacheSource && pokelikePokedexCacheIndex) {
            return pokelikePokedexCacheIndex;
        }

        const index = new Map();
        Object.values(pokedex).forEach(entry => {
            if (!entry || !entry.name) return;
            getPokemonLookupKeys(entry.name).forEach(key => index.set(key, entry));
        });

        pokelikePokedexCacheSource = pokedex;
        pokelikePokedexCacheIndex = index;
        return index;
    }

    function getPokelikePokedexEntry(name) {
        const index = getPokelikePokedexIndex();
        if (!index) return null;
        for (const key of getPokemonLookupKeys(name)) {
            if (index.has(key)) return index.get(key);
        }
        return null;
    }

    function getManualPokemonTypes(name) {
        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_DB[key]) return POKEMON_DB[key];
        }
        return [];
    }

    function getKnownPokemonTypes(name) {
        const cachedInfo = getCachedPokemonInfo(name);
        if (cachedInfo?.types && cachedInfo.types.length > 0) return cachedInfo.types;

        const manualTypes = getManualPokemonTypes(name);
        if (manualTypes.length > 0) return manualTypes;
        const pokedexEntry = getPokelikePokedexEntry(name);
        return pokedexEntry ? normalizeTypeList(pokedexEntry.types || []) : [];
    }

    function getPokemonBaseStats(pokemon) {
        if (!pokemon) return null;
        if (pokemon.baseStats) return pokemon.baseStats;

        const name = typeof pokemon === 'string' ? pokemon : pokemon.name;
        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_STAT_OVERRIDES[key]) return POKEMON_STAT_OVERRIDES[key];
        }

        const pokedexEntry = getPokelikePokedexEntry(name);
        if (pokedexEntry?.baseStats) return pokedexEntry.baseStats;

        const cachedInfo = getCachedPokemonInfo(name);
        return cachedInfo?.currentStats || null;
    }

    function getPokemonStat(stats, ...keys) {
        return EasyPokelikeStrategyUtils.getStatValue(stats, ...keys);
    }

    function isSpecialAttacker(pokemon) {
        const stats = getPokemonBaseStats(pokemon);
        if (!stats) {
            return (pokemon?.types || []).some(type => SPECIAL_TYPES.includes(type));
        }
        const atk = getPokemonStat(stats, 'atk', 'attack');
        const spa = getPokemonStat(stats, 'special', 'spa', 'spatk');
        return spa >= atk;
    }

    function getLikelyMoveTier(pokemon) {
        if (Number.isFinite(pokemon?.moveTier)) {
            return Math.max(0, Math.min(2, pokemon.moveTier));
        }
        const level = pokemon?.level || 0;
        if (level >= 42) return 2;
        if (level > 0 && level < 16) return 0;
        return 1;
    }

    function getLikelyMoveForType(pokemon, type) {
        const pool = POKELIKE_MOVE_POOL[type];
        if (!pool) return null;
        const category = isSpecialAttacker(pokemon) ? 'special' : 'physical';
        const tier = getLikelyMoveTier(pokemon);
        const move = (pool[category] && pool[category][tier]) ||
                     (pool[category] && pool[category][0]) ||
                     (pool.physical && pool.physical[0]) ||
                     (pool.special && pool.special[0]);
        return move ? { type, category, name: move[0], power: move[1] || 0 } : null;
    }

    function getLikelyAttackTypes(pokemon) {
        const types = normalizeTypeList((pokemon?.types && pokemon.types.length > 0) ? pokemon.types : getKnownPokemonTypes(pokemon?.name));
        return types
            .map(type => getLikelyMoveForType(pokemon, type) || { type, power: 0 })
            .sort((a, b) => b.power - a.power)
            .map(move => move.type);
    }

    function getAllKnownPokemonEntries() {
        const merged = new Map();
        Object.entries(POKEMON_DB).forEach(([name, types]) => {
            merged.set(getPokemonLookupKeys(name)[0] || name, { name, types });
        });

        const pokedex = getPokelikePokedex();
        if (pokedex) {
            Object.values(pokedex).forEach(entry => {
                if (!entry || !entry.name) return;
                const key = getPokemonLookupKeys(entry.name)[0] || entry.name;
                merged.set(key, { name: key, types: normalizeTypeList(entry.types || []) });
            });
        }

        return [...merged.values()];
    }

    function makeOpponentProfile({ name = '', types = [], team = [], sourceConfidence = 'fallback' } = {}) {
        const normalizedTeam = (team || []).map(mon => {
            const monName = foldText(mon.name || '');
            const monTypes = normalizeTypeList((mon.types && mon.types.length > 0) ? mon.types : getKnownPokemonTypes(monName));
            return { name: monName || 'unknown', types: monTypes };
        }).filter(mon => mon.types.length > 0);

        const leadTypes = normalizedTeam.length > 0 ? normalizedTeam[0].types : normalizeTypeList(types);
        const teamTypes = normalizeTypeList([
            ...normalizeTypeList(types),
            ...normalizedTeam.flatMap(mon => mon.types),
            ...leadTypes
        ]);

        return {
            name: name || (normalizedTeam[0] ? normalizedTeam[0].name : ''),
            types: normalizeTypeList(types.length > 0 ? types : teamTypes),
            leadTypes,
            teamTypes,
            team: normalizedTeam,
            sourceConfidence
        };
    }

    function getOpponentLeadTypes(opponent) {
        if (!opponent) return [];
        if (Array.isArray(opponent) || typeof opponent === 'string') return normalizeTypeList(opponent);
        return normalizeTypeList(opponent.leadTypes || opponent.types || opponent.teamTypes);
    }

    function getOpponentTeamTypes(opponent) {
        if (!opponent) return [];
        if (Array.isArray(opponent) || typeof opponent === 'string') return normalizeTypeList(opponent);
        return normalizeTypeList(opponent.teamTypes || opponent.types || opponent.leadTypes);
    }

    function getOpponentProfileLabel(opponent) {
        if (!opponent) return 'unknown';
        if (Array.isArray(opponent)) return opponent.join('/');
        if (typeof opponent === 'string') return opponent;
        const lead = getOpponentLeadTypes(opponent).join('/');
        const team = getOpponentTeamTypes(opponent).join('/');
        return `${opponent.name || 'opponent'} lead=${lead || '-'} team=${team || '-'}`;
    }

    function isNodeSpecificOpponentProfile(profile) {
        return Boolean(profile && ['visible-enemy-team', 'trainer-estimation'].includes(profile.sourceConfidence));
    }

    function isBossOpponentProfile(profile) {
        return Boolean(profile && ['boss-team-db', 'boss-type-map', 'detected-types', 'elite-prep-types'].includes(profile.sourceConfidence));
    }

    function isFinalBossOpponentProfile(profile = null) {
        const labelText = foldText((getProgressLabels() || []).join(' '));
        const opponentName = foldText(profile?.name || '');
        if (opponentName === 'arceus' || (!opponentName && labelText.includes('arceus'))) return false;
        return Boolean(
            labelText.match(/stage final boss|final boss|champion|campeon/) ||
            labelText.match(/\+400\b/) ||
            ['steven', 'steven stone', 'cynthia', 'red'].includes(opponentName)
        );
    }

    function getLeadAttackCoverageScore(unit, opponent) {
        return getAttackCoverageScore(getUnitAttackTypes(unit), getOpponentLeadTypes(opponent));
    }

    function isMetagrossLeadProfile(opponent) {
        if (!opponent) return false;
        const first = opponent.team && opponent.team[0];
        const leadTypes = getOpponentLeadTypes(opponent);
        const opponentName = foldText(opponent.name || '');
        return Boolean(
            (first && foldText(first.name || '').includes('metagross')) ||
            opponentName.includes('steven') ||
            (leadTypes.includes('Steel') && leadTypes.includes('Psychic'))
        );
    }

    function isUnsafeMainCarryLead(unit, opponent) {
        if (!unit || !isMainCarryUnit(unit) || !opponent) return false;
        const leadTypes = getOpponentLeadTypes(opponent);
        if (leadTypes.length === 0) return false;

        const attackCoverage = getLeadAttackCoverageScore(unit, opponent);
        const defensiveScore = getDefensiveMatchupScore(unit.types || [], leadTypes);
        const isFinalBoss = isFinalBossOpponentProfile(opponent);
        const metagrossLead = isMetagrossLeadProfile(opponent);

        return (isFinalBoss && attackCoverage <= 0 && defensiveScore <= 0) ||
               (metagrossLead && attackCoverage < 3);
    }

    function getMainCarryLeadProtectionMargin(unit, opponent, baseMargin) {
        if (!isMainCarryUnit(unit)) return baseMargin;
        if (isUnsafeMainCarryLead(unit, opponent)) return -40;
        return baseMargin;
    }

    function getMapNodeImageElement(node) {
        if (!node) return null;
        return node.querySelector('image.map-node-sprite, img.map-node-sprite, image, img');
    }

    function getNodeImageSrc(node) {
        const img = getMapNodeImageElement(node);
        return img ? (img.getAttribute('href') || img.getAttribute('xlink:href') || img.src || '').toLowerCase() : '';
    }

    function getMapNodeSpriteKey(node) {
        const src = getNodeImageSrc(node);
        if (!src) return '';
        const cleanSrc = src.split(/[?#]/)[0].replace(/\\/g, '/');
        return (cleanSrc.split('/').pop() || '')
            .replace(/\.[a-z0-9]+$/i, '')
            .replace(/_/g, '-');
    }

    function classifyMapNodeBySprite(node) {
        const key = getMapNodeSpriteKey(node);
        if (!key) return '';

        if (key.match(/master.?ball|ball.?master|legendary|legendario|legendaria|mythical/)) return 'legendary';
        if (key.match(/poke.?center|pokecenter|pokemon.?center|center/)) return 'center';
        if (key.match(/mistery.?trainer|mystery.?trainer|final.?trainer|boss/)) return 'boss';
        if (key.match(/pokeball|poke.?ball|catch/)) return 'catch';
        if (key.match(/grass|wild/)) return 'grass';
        if (key.match(/item|backpack|bag/)) return 'item';
        if (key.match(/question.?mark|random|unknown|mystery/)) return 'unknown';
        if (key.match(/scientist|professor|passive|buff/)) return 'buff';
        if (key.match(/trainer|team.?rocket|old.?guy|gentleman|hiker|fisher|fisherman|swimmer|black.?belt|psychic|bird|sailor|camper|picnic|juggler|burglar|channeler|engineer|rocker|tamer|beauty|cue.?ball|lass|youngster|cooltrainer|ace|super.?nerd|nerd|biker|gambler/)) return 'trainer';

        return '';
    }

    function getNodeDescriptorParts(node) {
        if (!node) return [];

        const parts = [
            getNodeImageSrc(node),
            node.id || '',
            node.innerText || '',
            node.textContent || '',
            node.getAttribute('aria-label') || '',
            node.getAttribute('title') || '',
            node.getAttribute('class') || '',
            node.getAttribute('role') || ''
        ];

        Array.from(node.attributes || []).forEach(attr => {
            if (
                attr.name.startsWith('data-') ||
                ['id', 'class', 'title', 'aria-label', 'role', 'href', 'xlink:href'].includes(attr.name)
            ) {
                parts.push(`${attr.name} ${attr.value}`);
            }
        });

        Array.from(node.querySelectorAll('image, img, use, svg, [class], [title], [aria-label]')).slice(0, 12).forEach(child => {
            parts.push(
                child.id || '',
                child.getAttribute('class') || '',
                child.getAttribute('title') || '',
                child.getAttribute('aria-label') || '',
                child.getAttribute('alt') || '',
                child.getAttribute('href') || '',
                child.getAttribute('xlink:href') || '',
                child.getAttribute('src') || ''
            );
            Array.from(child.attributes || []).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    parts.push(`${attr.name} ${attr.value}`);
                }
            });
        });

        return parts.filter(Boolean);
    }

    function getNodeClassificationText(node) {
        return foldText(getNodeDescriptorParts(node).join(' '));
    }

    function getMapNodeDebugInfo(node) {
        if (!node) return null;
        const descriptor = getNodeDescriptorParts(node).join(' ').replace(/\s+/g, ' ').trim();
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        return {
            src: getNodeImageSrc(node).slice(-180),
            className: String(node.getAttribute('class') || '').slice(0, 180),
            ariaLabel: String(node.getAttribute('aria-label') || '').slice(0, 120),
            title: String(node.getAttribute('title') || '').slice(0, 120),
            text: text.slice(0, 140),
            descriptor: descriptor.slice(0, 260)
        };
    }

    function summarizeMapNodeTypes(nodes) {
        const counts = {};
        (nodes || []).forEach(node => {
            counts[node.type] = (counts[node.type] || 0) + 1;
        });
        return counts;
    }

    function findBossTeamProfileInText(text) {
        const folded = foldText(text || '');
        if (!folded) return null;

        for (const [key, data] of Object.entries(BOSS_TEAM_DB)) {
            if (folded.includes(foldText(key)) || folded.includes(foldText(data.name))) {
                return makeOpponentProfile({
                    name: data.name,
                    types: data.types || [],
                    team: data.team || [],
                    sourceConfidence: 'boss-team-db'
                });
            }
        }

        for (const [boss, type] of Object.entries(BOSS_TYPE_MAP)) {
            if (folded.includes(foldText(boss))) {
                return makeOpponentProfile({
                    name: boss,
                    types: [type],
                    sourceConfidence: 'boss-type-map'
                });
            }
        }

        return null;
    }

    function parseEnemyTeamFromScope(scope) {
        if (!scope) return [];
        const cards = Array.from(scope.querySelectorAll(
            '.battle-poke, .poke-card, .enemy-poke, [class*="battle-poke"], [class*="enemy-poke"]'
        ));
        const seen = new Set();
        const team = [];

        cards.forEach(card => {
            const nameEl = card.querySelector('.poke-card-name, .poke-name, [class*="name"]');
            const name = nameEl ? foldText(nameEl.innerText || '') : '';
            if (!name || seen.has(name)) return;

            const types = getKnownPokemonTypes(name);
            if (types.length === 0) return;

            seen.add(name);
            team.push({ name, types });
        });

        return team;
    }

    function detectNextOpponentProfile(node = null) {
        const scopes = [
            document.getElementById('elite-prep-enemy-side'),
            document.getElementById('battle-enemy-side'),
            document.getElementById('enemy-side')
        ].filter(Boolean);

        for (const scope of scopes) {
            const visibleTeam = parseEnemyTeamFromScope(scope);
            if (visibleTeam.length > 0) {
                const nameEl = document.getElementById('elite-prep-enemy-name');
                return makeOpponentProfile({
                    name: nameEl ? foldText(nameEl.innerText || '') : 'visible enemy',
                    team: visibleTeam,
                    sourceConfidence: 'visible-enemy-team'
                });
            }
        }

        if (node) {
            const nodeText = foldText([
                node.innerText || '',
                node.getAttribute('aria-label') || '',
                node.getAttribute('title') || '',
                node.getAttribute('class') || '',
                getNodeImageSrc(node)
            ].join(' '));

            const nodeBossProfile = findBossTeamProfileInText(nodeText);
            if (nodeBossProfile) return nodeBossProfile;

            for (const [key, types] of Object.entries(TRAINER_TYPE_ESTIMATION)) {
                if (nodeText.includes(key)) {
                    return makeOpponentProfile({
                        name: key,
                        types,
                        sourceConfidence: 'trainer-estimation'
                    });
                }
            }
        }

        const textParts = [
            document.getElementById('elite-prep-enemy-name')?.innerText || '',
            document.getElementById('map-info')?.innerText || '',
            node ? (node.innerText || '') : '',
            node ? (node.getAttribute('aria-label') || '') : '',
            node ? (node.getAttribute('title') || '') : '',
            node ? (node.getAttribute('class') || '') : '',
            node ? getNodeImageSrc(node) : ''
        ];

        const bossProfile = findBossTeamProfileInText(textParts.join(' '));
        if (bossProfile) return bossProfile;

        const detectedTypes = detectBossTypes();
        if (detectedTypes.length > 0) {
            return makeOpponentProfile({
                name: 'detected boss',
                types: detectedTypes,
                sourceConfidence: 'detected-types'
            });
        }

        return null;
    }

    function scoreLeadCandidate(p, bossType = null, options = {}) {
        if (!p || p.isFainted) return -999;
        let score = getPokemonCarryScore(p);
        const leadTypes = getOpponentLeadTypes(bossType);
        const teamTypes = getOpponentTeamTypes(bossType);
        if (isMainCarryUnit(p)) {
            score += CONFIG.MAIN_CARRY_LEAD_STICKINESS;
            if (p.heldItem && isHealingItem(p.heldItem)) {
                score += Math.round(CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS * 0.5);
            }
        }
        if (leadTypes.length > 0) {
            score += getAttackCoverageScore(getUnitAttackTypes(p), leadTypes) * CONFIG.BOSS_LEAD_WEIGHT;
            score += getDefensiveMatchupScore(p.types, leadTypes) * Math.round(CONFIG.BOSS_LEAD_WEIGHT * 0.65);
        }
        if (teamTypes.length > 0) {
            score += getAttackCoverageScore(getUnitAttackTypes(p), teamTypes) * CONFIG.BOSS_TEAM_WEIGHT;
            score += getDefensiveMatchupScore(p.types, teamTypes) * Math.round(CONFIG.BOSS_TEAM_WEIGHT * 0.65);
        }
        if (!options.ignoreHeldItem) {
            if (p.heldItem) {
                const heldScore = scoreHeldItemForPokemon(p, p.heldItem, bossType);
                score += heldScore > 0 ? 30 + heldScore / 2 : heldScore / 2;
            }
            else score -= 18;
        }
        return score;
    }

    function scoreBattleOrderCandidate(p, bossType = null, slotIndex = 0, teamMaxLevel = 0) {
        if (!p || p.isFainted) return -999;
        let score = getPokemonCarryScore(p);
        const leadTypes = getOpponentLeadTypes(bossType);
        const teamTypes = getOpponentTeamTypes(bossType);
        const attacks = getUnitAttackTypes(p);
        const isMainCarry = isMainCarryUnit(p);

        if (slotIndex === 0 && isMainCarry) {
            score += CONFIG.MAIN_CARRY_LEAD_STICKINESS;
            if (p.heldItem && isHealingItem(p.heldItem)) {
                score += Math.round(CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS * 0.55);
            }
            if (isUnsafeMainCarryLead(p, bossType)) {
                score -= CONFIG.MAIN_CARRY_LEAD_STICKINESS + 90;
            }
        }

        if (slotIndex === 0 && leadTypes.length > 0) {
            const leadAttackScore = getAttackCoverageScore(attacks, leadTypes);
            const leadDefenseScore = getDefensiveMatchupScore(p.types, leadTypes);
            score += leadAttackScore * Math.round(CONFIG.BOSS_LEAD_WEIGHT * 1.15);
            score += leadDefenseScore * Math.round(CONFIG.BOSS_LEAD_WEIGHT * 0.8);
            if (isFinalBossOpponentProfile(bossType) && leadAttackScore >= 5) {
                score += 90;
            }
            if (isMetagrossLeadProfile(bossType) && leadAttackScore >= 5) {
                score += 120;
            }
        }

        if (teamTypes.length > 0) {
            const teamWeight = slotIndex === 0 ? CONFIG.BOSS_TEAM_WEIGHT : Math.round(CONFIG.BOSS_TEAM_WEIGHT * 1.6);
            score += getAttackCoverageScore(attacks, teamTypes) * teamWeight;
            score += getDefensiveMatchupScore(p.types, teamTypes) * Math.round(teamWeight * 0.7);
        }

        if (p.heldItem) {
            const heldScore = scoreHeldItemForPokemon(p, p.heldItem, bossType);
            score += heldScore > 0 ? 30 + heldScore / 2 : heldScore / 2;
        }
        else score -= slotIndex === 0 ? 24 : 10;

        if ((p.hp || 100) < CONFIG.CRITICAL_HP_THRESHOLD) score -= slotIndex === 0 ? 80 : 35;
        else if ((p.hp || 100) < CONFIG.LOW_HP_THRESHOLD) score -= slotIndex === 0 ? 35 : 12;

        if (teamMaxLevel > 0 && (p.level || 0) < teamMaxLevel - 3) {
            score -= slotIndex === 0 ? 120 : 35;
        }

        return score;
    }

    function ensureLeadHasHeldItem(team, bossType = null) {
        const lead = team[0];
        if (!lead || lead.isFainted || lead.heldItem) return false;
        if (!bossType) return false;
        if (isMainCarryUnit(lead) && (lead.hp || 100) >= CONFIG.CRITICAL_HP_THRESHOLD) {
            log('debug', '🎯', `Keeping itemless main carry [${lead.name}] in lead; waiting for a useful item instead of moving it out.`);
            recordRunEvent('carry-lead-kept-itemless', {
                name: lead.name,
                opponent: compactOpponentProfile(bossType),
                hp: lead.hp || 0
            });
            return false;
        }

        const itemHolders = team.filter(p => !p.isFainted && p.heldItem);
        if (itemHolders.length === 0) return false;

        const currentScore = scoreLeadCandidate(lead, bossType);
        const currentMatchupScore = scoreLeadCandidate(lead, bossType, { ignoreHeldItem: true });
        let best = null;
        let bestScore = -999;
        let bestMatchupScore = -999;
        itemHolders.forEach(p => {
            const score = scoreLeadCandidate(p, bossType);
            const matchupScore = scoreLeadCandidate(p, bossType, { ignoreHeldItem: true });
            if (score > bestScore) {
                best = p;
                bestScore = score;
                bestMatchupScore = matchupScore;
            }
        });

        const isBossPrep = isBossOpponentProfile(bossType);
        const moveThreshold = isBossPrep ? -10 : 8;
        const keepItemlessMatchupMargin = isBossPrep ? 28 : 14;

        if (best && best.index !== 0 && bestScore > currentScore + moveThreshold) {
            if (bossType && currentMatchupScore > bestMatchupScore + keepItemlessMatchupMargin) {
                log('debug', '🎯', `Keeping itemless lead [${lead.name}] because matchup beats item holder [${best.name}].`);
                return false;
            }
            log('info', '🎯', `Lead has no item. Moving item holder [${best.name}] to first slot.`);
            return tryTeamReorder(best.element, team[0].element, best, team[0], 'lead-item-holder');
        }

        return false;
    }

    function ensureLeadMeetsBattleLevel(team, prepStatus = null, opponentProfile = null) {
        const lead = team[0];
        const alive = getAliveTeam(team);
        if (!lead || lead.isFainted || alive.length <= 1) return false;

        const targetLeadLevel = prepStatus?.targets?.leadLevel || 0;
        if (!targetLeadLevel || (lead.level || 0) >= targetLeadLevel) return false;

        const reason = prepStatus?.targets?.reason || '';
        const seriousBattle = reason.includes('r2') ||
                              reason.includes('r3') ||
                              reason.includes('big-boss') ||
                              reason.includes('final') ||
                              isBossOpponentProfile(opponentProfile) ||
                              isFinalBossOpponentProfile(opponentProfile);
        const leadDeficit = targetLeadLevel - (lead.level || 0);
        if (!seriousBattle && leadDeficit < 8) return false;

        const teamMaxLevel = Math.max(0, ...alive.map(p => p.level || 0));
        const candidates = alive
            .filter(p => p.index !== lead.index && (p.level || 0) >= (lead.level || 0) + 6)
            .filter(p => (p.level || 0) >= targetLeadLevel - 3 || (p.level || 0) >= teamMaxLevel - 3)
            .map(p => ({
                unit: p,
                score: (p.level || 0) * 45 +
                       getPokemonCarryScore(p) +
                       (p.heldItem ? 80 : 0) +
                       (opponentProfile ? scoreLeadCandidate(p, opponentProfile) / 4 : 0)
            }))
            .sort((a, b) => b.score - a.score);

        const best = candidates[0];
        if (!best) return false;

        log('info', '🎯', `Lead under target (${lead.name} Lv${lead.level || 0}/${targetLeadLevel}). Moving [${best.unit.name}] Lv${best.unit.level || 0} to lead for ${reason || 'battle prep'}.`);
        recordRunEvent('lead-level-correction', {
            from: { name: lead.name, level: lead.level || 0 },
            to: { name: best.unit.name, level: best.unit.level || 0 },
            targetLeadLevel,
            reason,
            opponent: compactOpponentProfile(opponentProfile)
        });
        return tryTeamReorder(best.unit.element, lead.element, best.unit, lead, 'lead-level-correction');
    }

    function scoreItemForTeam(itemName, team, bossType = null) {
        itemName = normalizeItemName(itemName);
        const alive = team.filter(p => !p.isFainted);
        const targetTypes = getOpponentTeamTypes(bossType);
        const challengeItemBonus = scoreChallengeItemForTeam(itemName, team, bossType);
        const storyItemBonus = scoreStoryItemForTeam(itemName, team, bossType);
        if (alive.length === 0) return getTierScore(itemName);

        if (!USABLE_ITEMS.has(itemName) && isLowValueHeldItem(itemName)) {
            return -140 + getTierScore(itemName) + challengeItemBonus + storyItemBonus;
        }

        if (itemName === 'sacred ash') {
            const faintedCount = team.filter(p => p.isFainted).length;
            return (faintedCount > 0 ? 140 + faintedCount * 45 : 35) + challengeItemBonus + storyItemBonus;
        }
        if (itemName === 'rare candy') {
            const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
            return 260 +
                Math.max(...alive.map(p => scoreConsumableTarget(p, itemName))) / 3 +
                (sinnohTraining.active ? CONFIG.SINNOH_TM_ITEM_BONUS + 220 : 0) +
                challengeItemBonus +
                storyItemBonus;
        }
        if (itemName === 'moon stone') {
            return 185 +
                Math.max(...alive.map(p => scoreConsumableTarget(p, itemName))) / 3 +
                challengeItemBonus +
                storyItemBonus;
        }
        if (itemName === 'tm normal') {
            const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
            if (sinnohTraining.active && !sinnohTraining.needsTm) return 18 + challengeItemBonus + storyItemBonus;
            return 72 +
                Math.max(...alive.map(p => scoreConsumableTarget(p, itemName))) / 5 +
                (sinnohTraining.active && sinnohTraining.needsTm ? CONFIG.SINNOH_TM_ITEM_BONUS : 0) +
                challengeItemBonus +
                storyItemBonus;
        }

        let score = getTierScore(itemName) + challengeItemBonus + storyItemBonus;
        const bestTargetScore = Math.max(...alive.map(p => scoreHeldItemForPokemon(p, itemName, bossType)));
        score += bestTargetScore;

        const matchingType = getItemBoostType(itemName);
        if (matchingType) {
            if (alive.some(p => hasMatchingAttackForItem(p, itemName))) {
                score += 35;
            } else {
                score -= 180;
            }
        }

        if (itemName === 'expert belt' && targetTypes.length > 0 && alive.some(p => getAttackCoverageScore(getUnitAttackTypes(p), targetTypes) > 0)) {
            score += 45;
        }
        if (itemName === 'lucky egg' && alive.some(p => p.index === 0 && p.hp > 40)) {
            score += 25;
        }

        return score;
    }

    function pickBestBagItemForTeam(items, team, bossType = null) {
        let best = null;
        let bestScore = -999;
        items.forEach(item => {
            if (!shouldEquipBagItem(item.name, team, bossType)) return;
            const score = scoreItemForTeam(item.name, team, bossType);
            if (score > bestScore) {
                best = item;
                bestScore = score;
            }
        });
        return best;
    }

    function getMapDecisionFingerprint(team, nodes, bossType = null) {
        const teamSnapshot = team.map(p => {
            const attacks = getUnitAttackTypes(p).join(',');
            return `${p.name}:${p.hp}:${p.level || 0}:${p.heldItem || '-'}:${p.types.join(',')}:${attacks}`;
        }).join('|');
        const nodeSnapshot = Array.from(nodes).map(node => {
            const img = node.querySelector('image');
            const src = img ? (img.getAttribute('href') || img.getAttribute('xlink:href') || '') : '';
            return `${node.getAttribute('transform') || ''}:${src}:${node.getAttribute('class') || ''}`;
        }).join('|');
        const opponentSnapshot = getOpponentProfileLabel(bossType);
        return `${opponentSnapshot || '-'}::${teamSnapshot}::${nodeSnapshot}`;
    }

    function detectTypesInText(text) {
        const folded = foldText(text);
        const found = new Set();
        Object.entries(PASSIVE_TYPE_TERMS).forEach(([term, type]) => {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`);
            if (pattern.test(folded)) found.add(type);
        });
        return [...found];
    }

    function safeJsonParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (e) {
            log('warn', '📊', `Run history JSON parse failed: ${e.message}`);
            return fallback;
        }
    }

    function getRunHistory() {
        try {
            const stored = localStorage.getItem(CONFIG.RUN_HISTORY_STORAGE_KEY);
            if (stored) return safeJsonParse(stored, []);

            const legacyStored = localStorage.getItem(CONFIG.RUN_HISTORY_LEGACY_STORAGE_KEY);
            const legacyHistory = safeJsonParse(legacyStored, []);
            if (legacyHistory.length > 0) {
                saveRunHistory(legacyHistory);
            }
            return legacyHistory;
        } catch (e) {
            log('warn', '📊', `Cannot read run history: ${e.message}`);
            return [];
        }
    }

    function saveRunHistory(history) {
        try {
            const capped = history.slice(-CONFIG.RUN_HISTORY_MAX_ENTRIES);
            localStorage.setItem(CONFIG.RUN_HISTORY_STORAGE_KEY, JSON.stringify(capped));
            return capped;
        } catch (e) {
            log('warn', '📊', `Cannot save run history: ${e.message}`);
            return history;
        }
    }

    function getRunStatsDelta(record) {
        const start = record?.startStats || {};
        return {
            loops: Math.max(0, (engineStats.loops || 0) - (start.loops || 0)),
            catches: Math.max(0, (engineStats.catches || 0) - (start.catches || 0)),
            items: Math.max(0, (engineStats.items || 0) - (start.items || 0)),
            swaps: Math.max(0, (engineStats.swaps || 0) - (start.swaps || 0)),
            rerolls: Math.max(0, (engineStats.rerolls || 0) - (start.rerolls || 0)),
        };
    }

    function getProgressLabels() {
        const labels = [
            document.getElementById('stage-title')?.innerText || '',
            document.getElementById('map-title')?.innerText || '',
            document.getElementById('region-title')?.innerText || '',
            document.getElementById('map-info')?.innerText || '',
            document.querySelector('.stage-title, .map-title, .region-title')?.innerText || '',
            document.getElementById('gameover-stats')?.innerText || '',
        ].map(text => (text || '').replace(/\s+/g, ' ').trim()).filter(Boolean);

        return [...new Set(labels)];
    }

    function parseTeamFromCardScope(scope) {
        if (!scope) return [];
        return Array.from(scope.querySelectorAll('.poke-card')).map((card, index) => {
            const info = learnPokemonInfoFromCard(card, 'telemetry-card') || parsePokemonInfoFromCard(card, 'telemetry-card');
            if (!info || !info.name) return null;
            return {
                index,
                name: info.name,
                level: info.level || 0,
                hp: info.hp ? info.hp.percent : 100,
                isFainted: info.hp ? info.hp.percent === 0 : false,
                types: info.types || getKnownPokemonTypes(info.name),
                attackTypes: info.attackTypes || [],
                baseStats: getPokemonBaseStats(info.name),
                currentStats: info.currentStats || null,
                heldItem: getHeldItem(card),
                isShiny: card.classList.contains('shiny') || card.querySelector('[class*="shiny"]') !== null,
            };
        }).filter(Boolean);
    }

    function getTelemetryTeamUnits() {
        const team = parseTeamStatus();
        if (team.length > 0) return team;

        const gameOverTeam = parseTeamFromCardScope(document.getElementById('gameover-team'));
        if (gameOverTeam.length > 0) return gameOverTeam;

        const activeCards = parseTeamFromCardScope(document.querySelector('.screen.active'));
        return activeCards;
    }

    function compactOpponentProfile(profile) {
        if (!profile) return null;
        return {
            name: profile.name || 'unknown',
            leadTypes: getOpponentLeadTypes(profile),
            teamTypes: getOpponentTeamTypes(profile),
            sourceConfidence: profile.sourceConfidence || 'unknown',
            team: (profile.team || []).slice(0, 6).map(mon => ({
                name: mon.name || 'unknown',
                types: normalizeTypeList(mon.types || [])
            }))
        };
    }

    function compactTeamSnapshot(team = getTelemetryTeamUnits(), opponent = null) {
        return (team || []).map((p, slot) => {
            const heldItem = p.heldItem || null;
            const itemBoostType = heldItem ? getItemBoostType(heldItem) : null;
            return {
                slot,
                name: p.name,
                level: p.level || 0,
                hp: p.hp || 0,
                fainted: Boolean(p.isFainted),
                types: normalizeTypeList(p.types || []),
                attacks: getUnitAttackTypes(p),
                primaryAttack: getUnitPrimaryAttackType(p),
                isMainCarry: isMainCarryUnit(p),
                offenseRole: getOffenseRole(p),
                item: heldItem,
                itemBoostType,
                itemMatchesPrimary: itemBoostType ? hasMatchingAttackForItem(p, heldItem) : null,
                healingItem: heldItem ? isHealingItem(heldItem) : false,
                carry: Number(getPokemonCarryScore(p).toFixed(1)),
                heldScore: heldItem ? Number(scoreHeldItemForPokemon(p, heldItem, opponent).toFixed(1)) : null,
            };
        });
    }

    function getRunProgressSnapshot(reason = 'snapshot') {
        const teamUnits = getTelemetryTeamUnits();
        const opponentProfile = detectNextOpponentProfile();
        const alive = teamUnits.filter(p => !p.isFainted);
        const avgHP = alive.length > 0 ? alive.reduce((sum, p) => sum + (p.hp || 0), 0) / alive.length : 0;
        const avgLevel = getTeamAverageLevel(teamUnits);
        const bossPrep = getBossPrepStatus(teamUnits, opponentProfile);
        const itemHolders = teamUnits.filter(p => !p.isFainted && p.heldItem);
        const primaryCarry = getPrimaryCarry(teamUnits);
        const traitCounts = getTeamTraitCounts(teamUnits);

        return {
            at: new Date().toISOString(),
            reason,
            screen: getActiveScreen(),
            labels: getProgressLabels(),
            mapKey: currentMapKey || getCurrentMapKey(),
            capturesThisMap,
            teamSize: teamUnits.length,
            aliveCount: alive.length,
            avgHP: Number(avgHP.toFixed(1)),
            avgLevel: Number(avgLevel.toFixed(1)),
            leadLevel: getLeadLevel(teamUnits),
            opponent: compactOpponentProfile(opponentProfile),
            bossPrep,
            itemSummary: {
                heldCount: itemHolders.length,
                leadHasItem: Boolean(teamUnits[0]?.heldItem),
                holders: itemHolders.map(p => ({
                    slot: p.index,
                    name: p.name,
                    item: p.heldItem
                }))
            },
            carrySummary: primaryCarry ? {
                slot: primaryCarry.index,
                name: primaryCarry.name,
                isLead: primaryCarry.index === 0,
                level: primaryCarry.level || 0,
                hp: primaryCarry.hp || 0,
                item: primaryCarry.heldItem || null,
                hasHealingItem: primaryCarry.heldItem ? isHealingItem(primaryCarry.heldItem) : false,
                offenseRole: getOffenseRole(primaryCarry),
                grassCount: traitCounts.Grass || 0
            } : null,
            stats: getRunStatsDelta(currentRunTelemetry),
            team: compactTeamSnapshot(teamUnits, opponentProfile),
        };
    }

    function makeRunTelemetry(reason = 'auto') {
        const now = new Date();
        const entropy =
            globalThis.crypto?.randomUUID?.() ||
            `${now.getTime()}-${globalThis.performance?.now?.().toFixed(3) || '0'}`;
        return {
            id: `run-${now.toISOString()}-${entropy}`,
            startedAt: now.toISOString(),
            startReason: reason,
            startStats: { ...engineStats },
            events: [],
            screens: {},
            best: {
                mapSteps: 0,
                battles: 0,
                teamSize: 0,
                avgLevel: 0,
                leadLevel: 0,
                catches: 0,
                items: 0,
            },
            lastSnapshot: null,
            final: null
        };
    }

    function ensureRunTelemetry(reason = 'auto') {
        if (!currentRunTelemetry || currentRunTelemetry.final) {
            duplicatePriorityCatchNodesTaken = 0;
            currentRunTelemetry = makeRunTelemetry(reason);
            recordRunEvent('run-start', { reason });
        }
        return currentRunTelemetry;
    }

    function recordRunEvent(type, details = {}) {
        if (!currentRunTelemetry || currentRunTelemetry.final) return null;
        const event = {
            at: new Date().toISOString(),
            loop: engineStats.loops,
            screen: getActiveScreen(),
            type,
            details
        };

        currentRunTelemetry.events.push(event);
        if (currentRunTelemetry.events.length > CONFIG.RUN_EVENT_LOG_MAX_ENTRIES) {
            currentRunTelemetry.events = currentRunTelemetry.events.slice(-CONFIG.RUN_EVENT_LOG_MAX_ENTRIES);
        }

        return event;
    }

    function getRunBattleCount(record = currentRunTelemetry) {
        const events = record?.events || [];
        const explicitBattles = events.filter(event => event.type === 'fight-start' || event.type === 'battle-auto').length;
        const battleScreens = events.filter(event => event.type === 'screen-enter' && event.details?.screen === 'battle-screen').length;
        return Math.max(explicitBattles, battleScreens);
    }

    function updateRunProgress(reason = 'loop') {
        const record = ensureRunTelemetry(reason);
        const snapshot = getRunProgressSnapshot(reason);
        record.lastSnapshot = snapshot;
        record.screens[snapshot.screen] = (record.screens[snapshot.screen] || 0) + 1;

        const stats = snapshot.stats || {};
        record.best.mapSteps = Math.max(record.best.mapSteps, record.events.filter(event => event.type === 'map-choice').length);
        record.best.battles = Math.max(record.best.battles, getRunBattleCount(record));
        record.best.teamSize = Math.max(record.best.teamSize, snapshot.teamSize || 0);
        record.best.avgLevel = Math.max(record.best.avgLevel, snapshot.avgLevel || 0);
        record.best.leadLevel = Math.max(record.best.leadLevel, snapshot.leadLevel || 0);
        record.best.catches = Math.max(record.best.catches, stats.catches || 0);
        record.best.items = Math.max(record.best.items, stats.items || 0);
        return snapshot;
    }

    function inferLossCause(snapshot, result = 'gameover') {
        const team = snapshot?.team || [];
        const alive = team.filter(p => !p.fainted);
        const lead = team[0] || null;
        const tags = [];
        const labelText = foldText((snapshot?.labels || []).join(' '));
        const rewardMatch = labelText.match(/\+(\d+)/);
        const reward = rewardMatch ? Number.parseInt(rewardMatch[1], 10) : 0;
        const isFinalBoss = Boolean(labelText.match(/stage final boss|final boss|champion|campeon/) || reward >= 400);
        const isBigBoss = isFinalBoss || labelText.includes('big boss');
        const opponentConfidence = snapshot?.opponent?.sourceConfidence || '';
        const isBossLike = isFinalBoss ||
                           isBigBoss ||
                           ['boss-team-db', 'boss-type-map', 'detected-types', 'elite-prep-types'].includes(opponentConfidence) ||
                           Boolean(labelText.match(/boss|map 2\/2/));
        const bossTeamTarget = isFinalBoss ? CONFIG.TEAM_TARGET_SIZE : (isBigBoss ? 4 : (isBossLike ? 3 : CONFIG.EARLY_CORE_TEAM_SIZE));
        const snapshotTargets = snapshot?.bossPrep?.targets || null;
        const bossAvgLevelTarget = snapshotTargets?.avgLevel ||
                                    (isFinalBoss ? CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL :
                                    (isBigBoss ? CONFIG.EARLY_BIG_BOSS_MIN_AVG_LEVEL :
                                    (labelText.includes('map 2/2') ? CONFIG.EARLY_MAP2_MIN_AVG_LEVEL : 0)));
        const bossLeadLevelTarget = snapshotTargets?.leadLevel ||
                                     (isFinalBoss ? CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL :
                                     (isBigBoss ? CONFIG.EARLY_BIG_BOSS_MIN_LEAD_LEVEL :
                                     (labelText.includes('map 2/2') ? CONFIG.EARLY_MAP2_MIN_LEAD_LEVEL : 0)));

        if (result === 'gameover') tags.push('gameover');
        if (team.length === 0) tags.push('no-team-snapshot');
        if (team.length > 0 && alive.length === 0) tags.push('team-wipe');
        if (team.length > 0 && team.length < CONFIG.EARLY_CORE_TEAM_SIZE) tags.push('too-few-pokemon');
        if (isBossLike && team.length > 0 && team.length < bossTeamTarget) tags.push(isFinalBoss ? 'thin-team-for-final-boss' : (isBigBoss ? 'thin-team-for-big-boss' : 'thin-team-for-boss'));
        if ((snapshot?.avgLevel || 0) > 0 && snapshot.avgLevel < CONFIG.EARLY_BOSS_MIN_AVG_LEVEL) tags.push('underleveled-team');
        if ((snapshot?.leadLevel || 0) > 0 && snapshot.leadLevel < CONFIG.EARLY_BOSS_MIN_LEAD_LEVEL) tags.push('underleveled-lead');
        if (isBossLike && bossAvgLevelTarget && (snapshot?.avgLevel || 0) > 0 && snapshot.avgLevel < bossAvgLevelTarget) tags.push('boss-underleveled-team');
        if (isBossLike && bossLeadLevelTarget && (snapshot?.leadLevel || 0) > 0 && snapshot.leadLevel < bossLeadLevelTarget) tags.push('boss-underleveled-lead');
        if (lead && !lead.item) tags.push('lead-no-item');
        if (team.some(p => p.itemBoostType && p.itemMatchesPrimary === false)) tags.push('item-mismatch');
        if ((snapshot?.avgHP || 0) > 0 && snapshot.avgHP < CONFIG.LOW_HP_THRESHOLD) tags.push('low-hp-before-loss');

        let matchupScore = null;
        if (snapshot?.opponent && lead) {
            const pseudoLead = {
                name: lead.name,
                types: lead.types,
                attackTypes: lead.attacks,
                hp: Math.max(lead.hp || 0, 1),
                level: lead.level,
                isFainted: false,
                heldItem: lead.item || null
            };
            matchupScore = scoreLeadCandidate(pseudoLead, snapshot.opponent, { ignoreHeldItem: true });
            if (matchupScore < 0) tags.push('bad-lead-matchup');
        }

        let summary = 'unknown';
        if (tags.includes('team-wipe')) summary = 'team wiped';
        if (tags.includes('thin-team-for-final-boss')) summary = summary === 'unknown' ? 'thin team for final boss' : `${summary}; thin team`;
        if (tags.includes('thin-team-for-big-boss')) summary = summary === 'unknown' ? 'thin team for big boss' : `${summary}; thin team`;
        if (tags.includes('thin-team-for-boss')) summary = summary === 'unknown' ? 'thin team for boss' : `${summary}; thin team`;
        if (tags.includes('boss-underleveled-team')) summary = summary === 'unknown' ? 'underleveled for boss' : `${summary}; boss underleveled`;
        if (tags.includes('underleveled-team')) summary = summary === 'unknown' ? 'underleveled team' : `${summary}; underleveled`;
        if (tags.includes('bad-lead-matchup')) summary = summary === 'unknown' ? 'bad lead matchup' : `${summary}; bad matchup`;
        if (tags.includes('lead-no-item')) summary = summary === 'unknown' ? 'lead had no item' : `${summary}; lead no item`;
        if (tags.includes('item-mismatch')) summary = summary === 'unknown' ? 'item mismatch' : `${summary}; item mismatch`;
        if (tags.includes('too-few-pokemon')) summary = summary === 'unknown' ? 'too few pokemon' : `${summary}; too few pokemon`;
        if (summary === 'unknown' && result === 'gameover') summary = 'lost battle';

        return {
            summary,
            tags,
            matchupScore: matchupScore === null ? null : Number(matchupScore.toFixed(1)),
            opponent: snapshot?.opponent || null,
            targets: isBossLike ? {
                teamSize: bossTeamTarget,
                avgLevel: bossAvgLevelTarget || null,
                leadLevel: bossLeadLevelTarget || null
            } : null
        };
    }

    function finalizeRunTelemetry(result = 'gameover', details = {}) {
        const now = Date.now();
        if (!currentRunTelemetry && now - lastRunFinalizedAt < 10000) return null;
        if (currentRunTelemetry?.final && now - lastRunFinalizedAt < 2500) return currentRunTelemetry;

        const record = ensureRunTelemetry(`finalize-${result}`);
        const snapshot = getRunProgressSnapshot(result);
        if (!snapshot.opponent) {
            const lastOpponentEvent = [...record.events]
                .reverse()
                .find(event => event.details?.opponent || event.details?.nextOpponent);
            snapshot.opponent = lastOpponentEvent?.details?.opponent || lastOpponentEvent?.details?.nextOpponent || null;
        }
        const finalStats = getRunStatsDelta(record);
        record.best.battles = Math.max(record.best.battles, getRunBattleCount(record));
        const loss = result === 'gameover' ? inferLossCause(snapshot, result) : null;

        record.endedAt = new Date().toISOString();
        record.durationMs = new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime();
        record.lastSnapshot = snapshot;
        record.final = {
            result,
            reason: loss ? loss.summary : result,
            loss,
            stats: finalStats,
            best: record.best,
            details
        };
        record.events.push({
            at: record.endedAt,
            loop: engineStats.loops,
            screen: getActiveScreen(),
            type: 'run-final',
            details: record.final
        });

        const history = getRunHistory();
        saveRunHistory([...history, record]);
        lastRunFinalizedAt = now;

        log('info', '📊', `Run recorded: ${record.final.reason} | mapSteps=${record.best.mapSteps} battles=${record.best.battles} avgLv=${record.best.avgLevel.toFixed(1)} catches=${finalStats.catches} items=${finalStats.items}`);
        currentRunTelemetry = null;
        return record;
    }

    function exposeRunHistoryHelpers() {
        if (typeof window === 'undefined') return;
        window.EngineRunHistory = {
            current: () => currentRunTelemetry,
            all: () => getRunHistory(),
            latest: () => getRunHistory().slice(-1)[0] || null,
            summary: () => getRunHistory().map(run => ({
                id: run.id,
                startedAt: run.startedAt,
                result: run.final?.result || 'open',
                reason: run.final?.reason || '',
                mapSteps: run.best?.mapSteps || 0,
                battles: run.best?.battles || 0,
                avgLevel: run.best?.avgLevel || 0,
                leadLevel: run.best?.leadLevel || 0,
                finalTeamSize: run.lastSnapshot?.teamSize || 0,
                finalAvgLevel: run.lastSnapshot?.avgLevel || 0,
                finalLeadLevel: run.lastSnapshot?.leadLevel || 0,
                finalAvgHP: run.lastSnapshot?.avgHP || 0,
                bossPrepReady: run.lastSnapshot?.bossPrep?.ready ?? null,
                bossPrepReason: run.lastSnapshot?.bossPrep?.targets?.reason || '',
                bossAvgDeficit: run.lastSnapshot?.bossPrep?.avgDeficit ?? null,
                bossLeadDeficit: run.lastSnapshot?.bossPrep?.leadDeficit ?? null,
                heldItemCount: run.lastSnapshot?.itemSummary?.heldCount ?? null,
                leadHasItem: run.lastSnapshot?.itemSummary?.leadHasItem ?? null,
                leadName: run.lastSnapshot?.team?.[0]?.name || '',
                carryName: run.lastSnapshot?.carrySummary?.name || '',
                carryIsLead: run.lastSnapshot?.carrySummary?.isLead ?? null,
                carryHasHealingItem: run.lastSnapshot?.carrySummary?.hasHealingItem ?? null,
                grassCount: run.lastSnapshot?.carrySummary?.grassCount ?? null,
                legendaryNodes: (run.events || []).filter(event => event.type === 'map-choice' && event.details?.nodeType === 'legendary').length,
                legendaryCatches: (run.events || []).filter(event => event.type === 'catch-decision' && event.details?.isLegendary).length,
                unknownNodes: (run.events || []).filter(event => event.type === 'map-choice' && event.details?.nodeType === 'unknown').length,
                catches: run.final?.stats?.catches || 0,
                items: run.final?.stats?.items || 0,
                labels: run.lastSnapshot?.labels || [],
                opponent: run.final?.loss?.opponent?.name || run.lastSnapshot?.opponent?.name || '',
            })),
            clear: () => {
                localStorage.removeItem(CONFIG.RUN_HISTORY_STORAGE_KEY);
                localStorage.removeItem(CONFIG.RUN_HISTORY_LEGACY_STORAGE_KEY);
                return [];
            },
            exportText: () => JSON.stringify(getRunHistory(), null, 2),
        };
    }

    function isShinyPassiveCard(card, text = '') {
        const className = typeof card.className === 'string' ? card.className : (card.getAttribute('class') || '');
        const classText = foldText(className);
        return Boolean(
            classText.match(/shiny|variocolor|brillante/) ||
            text.match(/shiny|variocolor|brillante|sparkle|destell/) ||
            card.querySelector('.shiny, .shiny-star, [class*="shiny"], [data-shiny="true"]')
        );
    }

    function getPassiveTeamProfile(team, opponentProfile = null) {
        const alive = getAliveTeam(team || []);
        const primary = getPrimaryCarry(team);
        const bestBst = Math.max(0, ...alive.map(p => getPokemonBaseStatTotal(getPokemonBaseStats(p.name))));
        const primaryBst = primary ? getPokemonBaseStatTotal(getPokemonBaseStats(primary.name)) : 0;
        const hasLegendary = alive.some(p => isLegendaryPokemonName(p.name));
        const hasMainCarry = alive.some(p => isMainCarryUnit(p));
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
        const teamAttackTypes = normalizeTypeList(alive.flatMap(p => getUnitAttackTypes(p)));
        const prepStatus = getBossPrepStatus(team, opponentProfile);
        const profile = EasyPokelikeStrategyUtils.buildPassiveTeamProfileSnapshot({
            alive,
            primary: primary ? {
                types: primary.types || [],
                attackTypes: getUnitAttackTypes(primary)
            } : null,
            bestBst,
            primaryBst,
            hasLegendary,
            hasMainCarry,
            bossTypes,
            teamAttackTypes,
            trainingPriority: shouldPrioritizeEarlyTraining(team, opponentProfile),
            prepDeficit: (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0),
            weakCoreBstThreshold: CONFIG.PASSIVE_WEAK_CORE_BST_THRESHOLD,
            strongCarryBstThreshold: CONFIG.LEGENDARY_CATCH_MIN_BST
        });

        return {
            ...profile,
            alive,
            primary,
            teamAttackTypes,
            prepStatus
        };
    }

    function scorePassiveCard(card, team, opponentProfile = null) {
        const nameEl = card.querySelector('.item-name, .passive-name, [class*="name"]');
        const descEl = card.querySelector('.item-desc, .passive-desc, [class*="desc"]');
        const text = foldText(`${nameEl ? nameEl.innerText : ''} ${descEl ? descEl.innerText : ''} ${card.innerText || ''}`);
        const traitCounts = getTeamTraitCounts(team);
        const avgHP = getTeamAverageHP(team);
        const carry = getPrimaryCarry(team);
        const profile = getPassiveTeamProfile(team, opponentProfile);
        const passiveTypes = detectTypesInText(text);
        const isShinyPassive = isShinyPassiveCard(card, text);
        const signals = EasyPokelikeStrategyUtils.detectPassiveTextSignals(text);

        if (isStoryStrategyActive()) {
            return EasyPokelikeStrategyUtils.scoreStoryPassiveCardPurpose({
                active: true,
                passiveTypes,
                signals,
                priorityTypeScore: getStoryPriorityTypeScore(passiveTypes)
            }).score;
        }

        const sinnohScore = scoreSinnohPassiveCardPurpose({
            passiveTypes,
            text,
            team,
            isShinyPassive,
            isSpeed: signals.isSpeed,
            isSurvival: signals.isSurvival,
            isDamage: signals.isDamage
        });
        const challengeScore = scoreChallengePassiveCardPurpose({
            passiveTypes,
            text,
            team,
            opponentProfile,
            isShinyPassive,
            isSpeed: signals.isSpeed,
            isSurvival: signals.isSurvival,
            isDamage: signals.isDamage,
            isSustain: signals.isSustain,
            isScaling: signals.isScaling,
            isMultiHit: signals.isMultiHit
        });
        const teamUserTypes = normalizeTypeList((profile.alive || []).flatMap(p => [
            ...(p.types || []),
            ...getUnitAttackTypes(p)
        ]));

        return EasyPokelikeStrategyUtils.scoreGeneralPassiveCardFit({
            passiveTypes,
            signals,
            isShinyPassive,
            avgHP,
            hasCarry: Boolean(carry),
            teamTypeCount: getTeamTypes(team).length,
            traitCounts,
            traitTierValues: TRAIT_TIER_VALUE,
            traitData: TRAIT_DATA,
            profile,
            teamUserTypes,
            config: {
                passiveShinyCardBonus: CONFIG.PASSIVE_SHINY_CARD_BONUS,
                passiveWeakCoreScalingBonus: CONFIG.PASSIVE_WEAK_CORE_SCALING_BONUS,
                passiveWeakCoreSurvivalBonus: CONFIG.PASSIVE_WEAK_CORE_SURVIVAL_BONUS,
                passiveShinyTypeBonus: CONFIG.PASSIVE_SHINY_TYPE_BONUS,
                passiveStrongCarryTypeBonus: CONFIG.PASSIVE_STRONG_CARRY_TYPE_BONUS,
                passiveBossCounterBonus: CONFIG.PASSIVE_BOSS_COUNTER_BONUS,
                passiveUncoveredBossTypeBonus: CONFIG.PASSIVE_UNCOVERED_BOSS_TYPE_BONUS,
                passiveOffTeamTypePenalty: CONFIG.PASSIVE_OFF_TEAM_TYPE_PENALTY
            }
        }).score + sinnohScore + challengeScore;
    }

    function parseCardStats(card) {
        const tooltips = Array.from(card.querySelectorAll('.stat-row[data-tooltip], [data-tooltip]'))
            .map(row => row.dataset?.tooltip || '');
        return EasyPokelikeStrategyUtils.parseStatsFromTooltips(tooltips);
    }

    function scorePokemonStatsFromCard(card) {
        return scorePokemonStats(parseCardStats(card));
    }

    function scorePokemonStats(stats) {
        return EasyPokelikeStrategyUtils.scorePokemonStats(stats);
    }

    function scoreTraitPreviewFromCard(card) {
        const rows = Array.from(card.querySelectorAll('.trait-preview-row, [class*="trait-preview"], [class*="trait"]'))
            .map(row => {
                const text = foldText(row.innerText || '');
                return {
                    text,
                    className: row.className.toString(),
                    types: detectTypesInText(text)
                };
            });
        return EasyPokelikeStrategyUtils.scoreTraitPreviewRows({
            rows,
            traitData: TRAIT_DATA,
            traitTierValues: TRAIT_TIER_VALUE
        });
    }

    // ╔══════════════════════════════════════════════════════════════╗
