    // ║          🧠 AI: TYPE ADVANTAGE SCORING                      ║
    // ╚══════════════════════════════════════════════════════════════╝

    // Shared scoring primitives for matchups, team order and map routing.
    function normalizeTypeList(types) {
        return EasyPokelikeStrategyUtils.normalizeTypeList(types);
    }

    function getUnitAttackTypes(unit) {
        if (!unit) return [];
        const visibleAttackTypes = normalizeTypeList(unit.attackTypes || []);
        if (visibleAttackTypes.length > 0) return visibleAttackTypes;
        const cachedInfo = getCachedPokemonInfo(unit.name);
        if (cachedInfo?.attackTypes && cachedInfo.attackTypes.length > 0) return cachedInfo.attackTypes;
        const likelyTypes = getLikelyAttackTypes(unit);
        return likelyTypes.length > 0 ? likelyTypes : normalizeTypeList(unit.types || []);
    }

    function getAttackTypeScoreAgainstDefenders(attackType, defenderTypes) {
        return EasyPokelikeStrategyUtils.getAttackTypeScoreAgainstDefenders(attackType, defenderTypes);
    }

    function getAttackCoverageScore(attackerTypes, defenderTypes) {
        return EasyPokelikeStrategyUtils.getAttackCoverageScore(attackerTypes, defenderTypes);
    }

    function getDefensiveScoreAgainstAttack(defenderTypes, attackType) {
        return EasyPokelikeStrategyUtils.getDefensiveScoreAgainstAttack(defenderTypes, attackType);
    }

    function getDefensiveMatchupScore(defenderTypes, attackerTypes) {
        const attacks = normalizeTypeList(attackerTypes);
        if (attacks.length === 0) return 0;
        return Math.min(...attacks.map(attackType => getDefensiveScoreAgainstAttack(defenderTypes, attackType)));
    }

    function getTypeAdvantageScore(attackerTypes, defenderType) {
        return getAttackCoverageScore(attackerTypes, defenderType);
    }

    function getDefensiveScore(pokemonTypes, attackerType) {
        return getDefensiveScoreAgainstAttack(pokemonTypes, attackerType);
    }

    function getTrainerMatchupScore(trainerSrc, team) {
        const srcLower = trainerSrc.toLowerCase();
        let estimatedTypes = [];

        // Buscar correspondencia en TRAINER_TYPE_ESTIMATION
        for (const [key, types] of Object.entries(TRAINER_TYPE_ESTIMATION)) {
            if (srcLower.includes(key)) {
                estimatedTypes = types;
                break;
            }
        }

        if (estimatedTypes.length === 0) return 0; // No se pudo estimar el tipo

        const lead = team.find(p => !p.isFainted);
        if (!lead) return 0;

        // Best available attack type into the estimated enemy type(s).
        const offScore = getAttackCoverageScore(getUnitAttackTypes(lead), estimatedTypes);
        // Worst likely incoming attack type against our dual defensive typing.
        const defScore = getDefensiveMatchupScore(lead.types, estimatedTypes);
        const matchupBonus = (offScore * 40) + (defScore * 30);

        log('debug', '⚔️', `Trainer matchup vs [${estimatedTypes.join('/')}] calculated. Leader: [${lead.name}] | Bonus: ${matchupBonus}`);
        return matchupBonus;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║      🎯 AI: COUNTER-PICK OPTIMIZER (Team Reorder)           ║
    // ╚══════════════════════════════════════════════════════════════╝

    function detectBossTypes() {
        const detected = new Set();
        const mapInfo = document.getElementById('map-info');
        if (mapInfo) {
            const text = mapInfo.innerText.toLowerCase();

            for (const [boss, data] of Object.entries(BOSS_TEAM_DB)) {
                if (text.includes(boss) || text.includes((data.name || '').toLowerCase())) {
                    (data.types || []).forEach(type => detected.add(type));
                    (data.team || []).forEach(mon => (mon.types || []).forEach(type => detected.add(type)));
                }
            }

            for (const [boss, type] of Object.entries(BOSS_TYPE_MAP)) {
                if (text.includes(boss)) {
                    detected.add(type);
                }
            }
        }

        const eliteEnemy = document.getElementById('elite-prep-enemy-name');
        if (eliteEnemy) {
            const enemyText = eliteEnemy.innerText.toLowerCase();
            for (const [boss, data] of Object.entries(BOSS_TEAM_DB)) {
                if (enemyText.includes(boss) || enemyText.includes((data.name || '').toLowerCase())) {
                    (data.types || []).forEach(type => detected.add(type));
                    (data.team || []).forEach(mon => (mon.types || []).forEach(type => detected.add(type)));
                }
            }
            for (const [boss, type] of Object.entries(BOSS_TYPE_MAP)) {
                if (enemyText.includes(boss)) detected.add(type);
            }
        }

        const enemyTraits = document.getElementById('elite-prep-enemy-traits');
        if (enemyTraits) {
            enemyTraits.querySelectorAll('.trait-badge, [class*="trait"], .type-badge, [class*="type"]').forEach(badge => {
                detectTypesInText(badge.innerText || badge.title || '').forEach(type => detected.add(type));
            });
        }

        return [...detected];
    }

    function detectBossType() {
        const bossTypes = detectBossTypes();
        if (bossTypes.length > 0) {
            log('info', '🏟️', `Boss/type target detected: ${bossTypes.join('/')}`);
            return bossTypes[0];
        }

        return null;
    }

    function optimizeTeamOrder(teamUnits, bossType, prepStatus = null) {
        if (teamUnits.length <= 1 || !bossType) return false;

        const aliveUnits = teamUnits.filter(p => p && !p.isFainted);
        const teamMaxLevel = Math.max(0, ...teamUnits.map(p => p.level || 0));
        const currentLead = aliveUnits.find(p => p.index === 0) || aliveUnits[0] || null;
        const targetLeadLevel = prepStatus?.targets?.leadLevel || 0;
        const leadLevelReason = prepStatus?.targets?.reason || '';
        const seriousBattle = leadLevelReason.includes('r2') ||
                              leadLevelReason.includes('r3') ||
                              leadLevelReason.includes('big-boss') ||
                              leadLevelReason.includes('final') ||
                              isBossOpponentProfile(bossType) ||
                              isFinalBossOpponentProfile(bossType);
        const leadDeficit = targetLeadLevel - (currentLead?.level || 0);
        const hasLeadLevelPressure = targetLeadLevel > 0 && leadDeficit > 0 && (seriousBattle || leadDeficit >= 8);
        const hasTargetReadyLead = aliveUnits.some(p => (p.level || 0) >= targetLeadLevel);
        const leadLevelFloor = hasLeadLevelPressure
            ? (hasTargetReadyLead ? targetLeadLevel : Math.max(0, teamMaxLevel - 3))
            : 0;
        const scoreOrderCandidate = (p, slotIndex) => {
            let score = scoreBattleOrderCandidate(p, bossType, slotIndex, teamMaxLevel);
            if (slotIndex === 0 && leadLevelFloor > 0 && (p.level || 0) < leadLevelFloor) {
                const levelGap = leadLevelFloor - (p.level || 0);
                score -= 500 + levelGap * 80;
            }
            return score;
        };
        const compareOrderEntries = (a, b) => {
            const diff = b.score - a.score;
            if (Math.abs(diff) > CONFIG.TEAM_REORDER_SCORE_TIE_EPSILON) return diff;
            return a.unit.index - b.unit.index;
        };
        const duplicateOrderGroup = isDuplicatePriorityMode()
            ? getDuplicateGroups(teamUnits)
                .filter(group => group.alive.length > 0)
                .map(group => ({
                    group,
                    score: Math.max(...group.alive.map(unit => scoreOrderCandidate(unit, 0)))
                }))
                .sort((a, b) => b.score - a.score)[0]?.group || null
            : null;
        const duplicateOrderKey = duplicateOrderGroup?.key || '';

        let leadChoice = aliveUnits
            .map(p => ({
                unit: p,
                score: scoreOrderCandidate(p, 0)
            }))
            .sort(compareOrderEntries)[0];

        const preferredCarry = getMainCarry(teamUnits);
        if (preferredCarry && leadChoice && leadChoice.unit.index !== preferredCarry.index) {
            const carryLeadScore = scoreOrderCandidate(preferredCarry, 0);
            const carryHp = preferredCarry.hp || 100;
            const sustainMargin = preferredCarry.heldItem && isHealingItem(preferredCarry.heldItem) ? 35 : 0;
            const lowHpReduction = carryHp < CONFIG.CRITICAL_HP_THRESHOLD ? CONFIG.MAIN_CARRY_REORDER_MARGIN : (carryHp < CONFIG.LOW_HP_THRESHOLD ? 45 : 0);
            const baseCarryMargin = Math.max(0, CONFIG.MAIN_CARRY_REORDER_MARGIN + sustainMargin - lowHpReduction);
            const carryMargin = getMainCarryLeadProtectionMargin(preferredCarry, bossType, baseCarryMargin);

            if (carryLeadScore + carryMargin >= leadChoice.score) {
                log('debug', '🎯', `Protecting main carry lead [${preferredCarry.name}] vs [${leadChoice.unit.name}] (${carryLeadScore.toFixed(1)} + margin ${carryMargin} >= ${leadChoice.score.toFixed(1)}).`);
                recordRunEvent('carry-lead-protected', {
                    carry: preferredCarry.name,
                    contender: leadChoice.unit.name,
                    carryScore: Number(carryLeadScore.toFixed(1)),
                    contenderScore: Number(leadChoice.score.toFixed(1)),
                    margin: carryMargin,
                    opponent: compactOpponentProfile(bossType)
                });
                leadChoice = { unit: preferredCarry, score: carryLeadScore };
            }
        }

        if (duplicateOrderGroup && leadChoice) {
            const duplicateLead = duplicateOrderGroup.alive
                .map(unit => ({
                    unit,
                    score: scoreOrderCandidate(unit, 0) + CONFIG.DUPLICATE_PRIORITY_PAIR_LEAD_BONUS
                }))
                .sort(compareOrderEntries)[0];
            if (duplicateLead && getPokemonIdentityKey(leadChoice.unit.name) !== duplicateOrderKey) {
                log('debug', 'team-order', `Duplicate tactic lead: preferring [${duplicateLead.unit.name}] over [${leadChoice.unit.name}] to anchor the pair.`);
                leadChoice = duplicateLead;
            }
        }

        const backupUnits = aliveUnits
            .filter(p => !leadChoice || p.index !== leadChoice.unit.index)
            .map(p => ({
                unit: p,
                score: scoreOrderCandidate(p, 1)
            }))
            .sort(compareOrderEntries);

        const faintedUnits = teamUnits
            .filter(p => p && p.isFainted)
            .map(p => ({ unit: p, score: -999 }))
            .sort((a, b) => a.unit.index - b.unit.index);

        let desiredOrder = [...(leadChoice ? [leadChoice] : []), ...backupUnits, ...faintedUnits];
        if (duplicateOrderKey &&
            desiredOrder.length > 2 &&
            getPokemonIdentityKey(desiredOrder[0]?.unit?.name) === duplicateOrderKey &&
            getPokemonIdentityKey(desiredOrder[1]?.unit?.name) === duplicateOrderKey) {
            const spacerIndex = desiredOrder.findIndex((entry, index) =>
                index > 1 &&
                getPokemonIdentityKey(entry?.unit?.name) !== duplicateOrderKey
            );
            if (spacerIndex > 1) {
                const partner = desiredOrder[1];
                desiredOrder[1] = {
                    ...desiredOrder[spacerIndex],
                    score: desiredOrder[spacerIndex].score + CONFIG.DUPLICATE_PRIORITY_PAIR_SPACING_BONUS
                };
                desiredOrder[spacerIndex] = partner;
                log('debug', 'team-order', `Duplicate tactic spacing: keeping pair [${desiredOrder[0].unit.name}] / [${partner.unit.name}] apart.`);
            }
        }
        if (desiredOrder.length <= 1) return false;

        for (let targetIndex = 0; targetIndex < desiredOrder.length; targetIndex++) {
            const desired = desiredOrder[targetIndex];
            const current = teamUnits[targetIndex];
            if (!desired || !current || desired.unit.index === current.index) continue;

            const currentScore = current.isFainted ? -999 : scoreOrderCandidate(current, targetIndex);
            const improvement = desired.score - currentScore;
            let threshold = targetIndex === 0 ? 10 : 6;
            const duplicateSlotSwap = getPokemonIdentityKey(current.name) === getPokemonIdentityKey(desired.unit.name);
            if (duplicateSlotSwap && !current.isFainted && !desired.unit.isFainted) {
                threshold += CONFIG.TEAM_REORDER_DUPLICATE_EXTRA_MARGIN;
            }
            if (targetIndex === 0 && isMainCarryUnit(current) && !isMainCarryUnit(desired.unit)) {
                const currentHp = current.hp || 100;
                const baseCarryMargin = currentHp < CONFIG.CRITICAL_HP_THRESHOLD ? 0 :
                                        currentHp < CONFIG.LOW_HP_THRESHOLD ? Math.round(CONFIG.MAIN_CARRY_REORDER_MARGIN * 0.45) :
                                        CONFIG.MAIN_CARRY_REORDER_MARGIN;
                const carryMargin = getMainCarryLeadProtectionMargin(current, bossType, baseCarryMargin);
                threshold += carryMargin;
            } else if (targetIndex === 0 && !isMainCarryUnit(current) && isMainCarryUnit(desired.unit)) {
                const desiredHp = desired.unit.hp || 100;
                const baseCarryMargin = desiredHp < CONFIG.CRITICAL_HP_THRESHOLD ? 0 :
                                        desiredHp < CONFIG.LOW_HP_THRESHOLD ? Math.round(CONFIG.MAIN_CARRY_REORDER_MARGIN * 0.45) :
                                        CONFIG.MAIN_CARRY_REORDER_MARGIN;
                const carryMargin = getMainCarryLeadProtectionMargin(desired.unit, bossType, baseCarryMargin);
                threshold = -carryMargin;
            }

            if (current.isFainted || improvement > threshold) {
                const targetLabel = targetIndex === 0 ? 'lead' : `slot ${targetIndex + 1}`;
                log('info', '🎯', `Team order: [${desired.unit.name}] to ${targetLabel} vs [${getOpponentProfileLabel(bossType)}] (score: ${desired.score.toFixed(1)} > ${currentScore.toFixed(1)})`);
                return tryTeamReorder(desired.unit.element, current.element, desired.unit, current, 'battle-order');
            }
        }

        return false;
    }

    function getMapNodeElements() {
        const rawNodes = Array.from(document.querySelectorAll('g.map-node, .map-node--clickable'));
        const seen = new Set();
        return rawNodes.filter(node => {
            if (!node || seen.has(node)) return false;
            seen.add(node);
            const className = String(node.getAttribute('class') || '');
            if (className.includes('map-node-sprite')) return false;
            return node.classList.contains('map-node') ||
                   node.classList.contains('map-node--clickable');
        });
    }

    function getCurrentMapKey() {
        const mapInfo = foldText(document.getElementById('map-info')?.innerText || '');
        const stageInfo = foldText([
            document.getElementById('stage-title')?.innerText || '',
            document.getElementById('map-title')?.innerText || '',
            document.getElementById('region-title')?.innerText || '',
            document.querySelector('.stage-title, .map-title, .region-title')?.innerText || ''
        ].join(' '));

        if (mapInfo || stageInfo) {
            return `${stageInfo || 'stage'}::${mapInfo || 'map'}`;
        }

        const nodes = getMapNodeElements().map(node => {
            return `${node.getAttribute('transform') || ''}:${getNodeImageSrc(node)}`;
        }).join('|');

        return nodes ? `nodes::${nodes.slice(0, 1200)}` : currentMapKey;
    }

    function syncMapCaptureState() {
        const key = getCurrentMapKey();
        if (key && key !== currentMapKey) {
            currentMapKey = key;
            capturesThisMap = 0;
            lastMapClickSignature = '';
            repeatedMapClickCount = 0;
            log('debug', '🗺️', `New map detected. Capture counter reset. key=${key.slice(0, 80)}`);
        }
        return currentMapKey;
    }

    function resetMapCaptureState(reason = 'reset') {
        currentMapKey = '';
        capturesThisMap = 0;
        lastMapDecisionFingerprint = '';
        lastMapClickSignature = '';
        lastStuckProgressSignature = '';
        lastMapBagClickSignature = '';
        lastMapBagClickAt = 0;
        repeatedMapClickCount = 0;
        lastCatchRerollSignature = '';
        lastCatchRerollAt = 0;
        lastTeamReorderSignature = '';
        lastTeamReorderAt = 0;
        teamReorderAttemptsBySignature = {};
        catchRerollAttemptsBySignature = {};
        resetCatchScreenSession();
        log('debug', '🗺️', `Map capture state reset: ${reason}`);
    }

    function resetCatchScreenSession() {
        catchScreenSessionActive = false;
        catchRerollsThisEncounter = 0;
        lastCatchRerollSignature = '';
        lastCatchRerollAt = 0;
        catchRerollAttemptsBySignature = {};
    }

    function syncCatchScreenSession(currentState) {
        if (currentState === 'catch-screen') {
            if (!catchScreenSessionActive) {
                catchScreenSessionActive = true;
                catchRerollsThisEncounter = 0;
                lastCatchRerollSignature = '';
                lastCatchRerollAt = 0;
                catchRerollAttemptsBySignature = {};
            }
            return;
        }

        if (catchScreenSessionActive) {
            resetCatchScreenSession();
        }
    }

    function hasReachedMapCaptureCap() {
        return CONFIG.MAX_CATCHES_PER_MAP >= 0 && capturesThisMap >= CONFIG.MAX_CATCHES_PER_MAP;
    }

    function getMapNodeStateText(node) {
        if (!node) return '';
        const parts = [
            node.getAttribute('class') || '',
            node.getAttribute('aria-label') || '',
            node.getAttribute('title') || '',
            node.getAttribute('data-state') || '',
            node.getAttribute('data-status') || ''
        ];
        Array.from(node.querySelectorAll('[class], [aria-label], [title], use, image, img, svg')).slice(0, 10).forEach(child => {
            parts.push(
                child.getAttribute('class') || '',
                child.getAttribute('aria-label') || '',
                child.getAttribute('title') || '',
                child.getAttribute('href') || '',
                child.getAttribute('xlink:href') || '',
                child.getAttribute('src') || ''
            );
        });
        return foldText(parts.join(' '));
    }

    function isCompletedMapNode(node) {
        const text = getMapNodeStateText(node);
        return Boolean(text.match(/completed|complete|visited|cleared|finished|done|current|active|selected|checkmark|check-mark|check_icon|checked/));
    }

    function getClickableMapNodes() {
        const nodes = Array.from(document.querySelectorAll('.map-node--clickable'));
        const freshNodes = nodes.filter(node => isVisible(node) && !isCompletedMapNode(node));
        return freshNodes.length > 0 ? freshNodes : nodes.filter(node => isVisible(node));
    }

    function getMapNodeClickSignature(node) {
        if (!node) return '';
        const pos = getMapNodePosition(node);
        return `${currentMapKey || '-'}:${Math.round(pos.x)}:${Math.round(pos.y)}:${classifyMapNode(node)}`;
    }

    function forceClickAlternateMapNode(reason = 'recovery') {
        const nodes = getClickableMapNodes();
        if (nodes.length === 0) return false;
        const alternate = nodes.find(node => getMapNodeClickSignature(node) !== lastMapClickSignature) || nodes[0];
        const signature = getMapNodeClickSignature(alternate);
        lastMapClickSignature = signature;
        repeatedMapClickCount = 1;
        log('warn', '🗺️', `Map recovery click (${reason}) on ${classifyMapNode(alternate)} node.`);
        return triggerRealClick(alternate);
    }

    function classifyMapNode(node) {
        const spriteType = classifyMapNodeBySprite(node);
        if (spriteType) return spriteType;
        const text = getNodeClassificationText(node);

        if (text.match(/master.?ball|ball.?master|\bmaster\b|legendary[-_ ]?encounter|legendary.?pokemon|legendary|legendario|legendaria|mythical|mitico|mitica|legend.?battle|boss.?legend/)) return 'legendary';
        if (text.match(/poke.?center|pokecenter|center|heal/)) return 'center';
        if (text.match(/final.?boss|boss|gym|elite|leader|champion|campeon/)) return 'boss';
        if (text.match(/trainer|versus|battle|fisher|fisherman|hiker|swimmer|black.?belt|psychic|bird|sailor|camper|picnic|juggler|burglar|channeler|engineer|rocker|tamer|beauty|cue.?ball|lass|youngster|cooltrainer|ace|gentleman|super.?nerd|nerd|biker|gambler/)) return 'trainer';
        if (text.match(/pokeball|poke-ball|catch/)) return 'catch';
        if (text.match(/grass|wild/)) return 'grass';
        if (text.match(/\?|question|unknown|mystery|random|surprise|interrog/)) return 'unknown';
        if (text.match(/item|backpack|bag/)) return 'item';
        if (text.match(/scientist|professor|passive|buff/)) return 'buff';
        if (text.match(/trade|npc/)) return 'trade';
        return 'unknown';
    }

    function getMapNodePosition(node) {
        const transform = node ? (node.getAttribute('transform') || '') : '';
        const matchTranslate = transform.match(/translate\(([-0-9.]+)[,\s]+([-0-9.]+)/);
        if (matchTranslate) {
            return { x: Number.parseFloat(matchTranslate[1]) || 0, y: Number.parseFloat(matchTranslate[2]) || 0 };
        }

        const rect = node ? node.getBoundingClientRect() : null;
        return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
    }

    function parseMapTree() {
        const mapSvg = document.getElementById('map-svg') || document.querySelector('#map-container svg');
        const rawNodes = getMapNodeElements();
        const seen = new Set();
        let nodes = rawNodes.filter(node => {
            if (!node || seen.has(node)) return false;
            seen.add(node);
            return getNodeImageSrc(node) || (node.getAttribute('class') || '').includes('map-node');
        }).map((node) => {
            const pos = getMapNodePosition(node);
            return {
                element: node,
                type: classifyMapNode(node),
                src: getNodeImageSrc(node),
                x: pos.x,
                y: pos.y,
                clickable: node.classList.contains('map-node--clickable') || node.matches('.map-node--clickable')
            };
        });

        // Sort from top to bottom, left to right
        nodes.sort((a, b) => (a.y - b.y) || (a.x - b.x));
        
        // Re-assign index so that 0 is top-most/current and 22 is bottom-most/final.
        nodes.forEach((node, idx) => {
            node.index = idx;
        });

        const adjacency = new Map();
        const edges = [];

        // Exact known 23-node map structure
        if (nodes.length === 23) {
            nodes[22].type = 'boss';

            const HARDCODED_MAP_ADJACENCY = {
                0: [1, 2],
                1: [3, 4],
                2: [4, 5],
                3: [6, 7],
                4: [7, 8],
                5: [8, 9],
                6: [10],
                7: [10, 11],
                8: [11, 12],
                9: [12],
                10: [13, 14],
                11: [14, 15],
                12: [15, 16],
                13: [17],
                14: [17, 18],
                15: [18, 19],
                16: [19],
                17: [20],
                18: [20, 21],
                19: [21],
                20: [22],
                21: [22],
                22: []
            };

            nodes.forEach(node => {
                const nextNodes = HARDCODED_MAP_ADJACENCY[node.index] || [];
                adjacency.set(node.index, nextNodes);
                nextNodes.forEach(to => {
                    edges.push({ from: node.index, to });
                });
            });

            return { nodes, edges, adjacency, hasRealEdges: true, edgeSource: 'known 23-node graph' };
        }

        // Fallback for maps of different sizes
        nodes.forEach(node => adjacency.set(node.index, []));
        const findNodeAt = (x, y) => {
            let best = null;
            let bestDist = Infinity;
            nodes.forEach(node => {
                const dist = Math.hypot(node.x - x, node.y - y);
                if (dist < bestDist) {
                    best = node;
                    bestDist = dist;
                }
            });
            return bestDist <= 8 ? best : null;
        };

        if (mapSvg) {
            Array.from(mapSvg.querySelectorAll('line')).forEach(line => {
                const x1 = Number.parseFloat(line.getAttribute('x1'));
                const y1 = Number.parseFloat(line.getAttribute('y1'));
                const x2 = Number.parseFloat(line.getAttribute('x2'));
                const y2 = Number.parseFloat(line.getAttribute('y2'));
                if ([x1, y1, x2, y2].some(value => Number.isNaN(value))) return;

                const a = findNodeAt(x1, y1);
                const b = findNodeAt(x2, y2);
                if (!a || !b || a.index === b.index) return;

                const from = a.y <= b.y ? a : b;
                const to = a.y <= b.y ? b : a;
                edges.push({ from: from.index, to: to.index });
                if (!adjacency.get(from.index).includes(to.index)) {
                    adjacency.get(from.index).push(to.index);
                }
            });
        }

        return {
            nodes,
            edges,
            adjacency,
            hasRealEdges: edges.length > 0,
            edgeSource: edges.length > 0 ? 'svg line graph' : 'layer fallback'
        };
    }

    function getNextMapLayerNodes(tree, node) {
        if (!tree || !node) return [];
        if (tree.hasRealEdges && tree.adjacency) {
            const nextIndexes = tree.adjacency.get(node.index) || [];
            return nextIndexes.map(index => tree.nodes.find(candidate => candidate.index === index)).filter(Boolean);
        }

        const ahead = tree.nodes.filter(candidate => candidate.y > node.y + 8);
        if (ahead.length === 0) return [];
        const nextY = Math.min(...ahead.map(candidate => candidate.y));
        return ahead.filter(candidate => Math.abs(candidate.y - nextY) < 12);
    }

    function scoreKnownBossNode(profile, context) {
        const lead = getAliveTeam(context.team)[0];
        const prep = getBossPrepStatus(context.team, profile);
        return EasyPokelikeStrategyUtils.scoreBossRouteNode({
            avgHP: context.avgHP,
            leadMatchupScore: profile && lead ? scoreLeadCandidate(lead, profile) / 4 : 0,
            leadNeedsItem: context.leadNeedsItem,
            earlyLevelingPriority: context.earlyLevelingPriority,
            prep,
            config: {
                lowHpThreshold: CONFIG.LOW_HP_THRESHOLD
            }
        }).score;
    }

    function scoreLegendaryNode(context) {
        const team = context.team || [];
        const alive = getAliveTeam(team);
        const lead = alive[0];
        const prep = context.bossPrepStatus || getBossPrepStatus(team);
        return EasyPokelikeStrategyUtils.scoreLegendaryRouteNode({
            avgHP: context.avgHP,
            hasFainted: context.hasFainted,
            aliveCount: alive.length,
            leadCarryScore: lead ? getPokemonCarryScore(lead) : undefined,
            leadHasItem: Boolean(lead?.heldItem),
            leadIsMainCarry: lead ? isMainCarryUnit(lead) : false,
            leadHasHealingItem: Boolean(lead?.heldItem && isHealingItem(lead.heldItem)),
            leadHp: lead ? (lead.hp || 100) : 100,
            prep,
            config: {
                criticalHpThreshold: CONFIG.CRITICAL_HP_THRESHOLD,
                lowHpThreshold: CONFIG.LOW_HP_THRESHOLD,
                legendaryNodeBaseScore: CONFIG.LEGENDARY_NODE_BASE_SCORE,
                legendaryNodeRouteBonus: CONFIG.LEGENDARY_NODE_ROUTE_BONUS,
                legendaryNodeReadyBonus: CONFIG.LEGENDARY_NODE_READY_BONUS,
                legendaryNodeLowHpPenalty: CONFIG.LEGENDARY_NODE_LOW_HP_PENALTY,
                legendaryNodeMaxUnderlevelPenalty: CONFIG.LEGENDARY_NODE_MAX_UNDERLEVEL_PENALTY,
                legendaryNodeUnderlevelPenalty: CONFIG.LEGENDARY_NODE_UNDERLEVEL_PENALTY
            }
        }).score;
    }

    function isShinyScoutMapNodeType(type) {
        return ['catch', 'grass', 'unknown', 'legendary'].includes(type);
    }

    function isTrainingMapNodeType(type) {
        return ['trainer', 'buff'].includes(type);
    }

    function getShinyRouteBalance(context = {}) {
        const tacticActive = getBotControlTactic() === 'shiny';
        const prepStatus = context.bossPrepStatus || getBossPrepStatus(context.team || [], context.opponentProfile || null);
        const prepPressure = Math.max(0, (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0));
        const avgHP = Number.isFinite(context.avgHP) ? context.avgHP : getTeamAverageHP(context.team || []);
        const lowHPCount = Number.isFinite(context.lowHPCount)
            ? context.lowHPCount
            : (context.team || []).filter(p => !p.isFainted && (p.hp || 0) < CONFIG.LOW_HP_THRESHOLD).length;
        const healthRisk = Boolean(
            context.hasFainted ||
            avgHP < CONFIG.LOW_HP_THRESHOLD ||
            lowHPCount >= 2
        );
        const mustTrain = Boolean(
            healthRisk ||
            prepPressure >= CONFIG.SHINY_TACTIC_TRAINING_PRESSURE_LIMIT
        );
        const needsTraining = Boolean(
            mustTrain ||
            prepPressure > CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT ||
            context.trainingCore
        );
        const safeToScout = tacticActive &&
            !mustTrain &&
            prepPressure <= CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT;
        const canBalancedScout = tacticActive &&
            !mustTrain &&
            prepPressure <= CONFIG.SHINY_TACTIC_BALANCED_SCOUT_PRESSURE_LIMIT;

        return {
            tacticActive,
            prepPressure,
            avgHP,
            lowHPCount,
            healthRisk,
            mustTrain,
            needsTraining,
            safeToScout,
            canBalancedScout
        };
    }

    function getBotControlTacticNodeBonus(type, context = {}) {
        const tactic = getBotControlTactic();
        if (tactic === 'auto') return 0;

        const team = context.team || [];
        const centerNeed = context.centerNeed || getCenterNeedStatus(team);
        const earlyExpansionClosed = Boolean(context.earlyExpansionClosed);
        const captureCapReached = Boolean(context.captureCapReached);
        const openTeamSlot = hasOpenTeamSlot(team);
        const prepStatus = context.bossPrepStatus || getBossPrepStatus(team);
        const prepPressure = Math.max(0, (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0));
        const runNeedsPower = prepPressure > 0 || Boolean(context.trainingCore);

        if (tactic === 'xp') {
            if (type === 'trainer') return 900;
            if (type === 'buff') return 180;
            if (type === 'catch' || type === 'grass') return -500;
            if (type === 'item') return -120;
            if (type === 'center' && centerNeed.canSkipCenter) return -300;
            return 0;
        }

        if (tactic === 'capture') {
            if (type === 'catch') return 850;
            if (type === 'grass') return 350;
            if (type === 'trade') return 120;
            if (type === 'trainer') return -180;
            return 0;
        }

        if (tactic === 'shiny') {
            const shinyBalance = getShinyRouteBalance(context);
            const settledScoutBonus = !shinyBalance.needsTraining && earlyExpansionClosed ? 1200 : 0;
            const capScoutBonus = captureCapReached ? 900 : 0;
            const balancedScoutBonus = shinyBalance.canBalancedScout
                ? Math.max(420, 980 - prepPressure * 45)
                : 0;
            if (type === 'catch') {
                if (shinyBalance.mustTrain) return -420 - prepPressure * 35;
                if (shinyBalance.needsTraining) return balancedScoutBonus + capScoutBonus + 180;
                return (captureCapReached ? 5200 : (openTeamSlot ? 1850 : 2550)) + settledScoutBonus;
            }
            if (type === 'unknown') {
                if (shinyBalance.mustTrain) return -280 - prepPressure * 30;
                if (shinyBalance.needsTraining) return Math.round(balancedScoutBonus * 1.05) + capScoutBonus + 240;
                return (captureCapReached ? 5050 : (openTeamSlot ? 1950 : 2450)) + Math.round(settledScoutBonus * 0.95);
            }
            if (type === 'grass') {
                if (shinyBalance.mustTrain) return -250 - prepPressure * 25;
                if (shinyBalance.needsTraining) return Math.round(balancedScoutBonus * 0.75) + Math.round(capScoutBonus * 0.55) + 40;
                return (captureCapReached ? 3700 : 1350) + Math.round(settledScoutBonus * 0.65);
            }
            if (type === 'trainer') return shinyBalance.needsTraining ? 900 + prepPressure * 120 : 260;
            if (type === 'buff') return shinyBalance.needsTraining ? 540 + prepPressure * 70 : 150;
            if (type === 'item') return runNeedsPower ? -140 : -70;
            if (type === 'trade') return openTeamSlot ? 60 : 20;
            if (type === 'legendary') return runNeedsPower ? 80 : 180;
            if (type === 'center') return centerNeed.canSkipCenter ? -260 : 150;
            if (type === 'boss') return prepStatus.ready ? 140 : -520;
            return 0;
        }

        if (tactic === 'boss') {
            if (type === 'item') return 420;
            if (type === 'buff') return 300;
            if (type === 'trainer') return 220;
            if (type === 'legendary') return 260;
            if (type === 'boss') return 180;
            if (type === 'center') return centerNeed.canSkipCenter ? -100 : 400;
            if ((type === 'catch' || type === 'grass') && earlyExpansionClosed) return -200;
            return 0;
        }

        if (tactic === 'duplicate') {
            if (!getBotControlDuplicateCatchesEnabled()) return 0;
            const needsOpeningPair = shouldPrioritizeOpeningDuplicatePair(team);
            const duplicateKeys = new Set(getDuplicateGroups(team).map(group => group.key));
            const teamMaxLevel = Math.max(0, ...team.map(p => p.level || 0));
            const hasLowLevelNonDuplicate = !openTeamSlot && team.some(p =>
                !duplicateKeys.has(getPokemonIdentityKey(p.name)) &&
                (p.level || 0) < teamMaxLevel - CONFIG.EARLY_LOW_LEVEL_SWAP_GAP
            );
            if (type === 'catch') {
                if (needsOpeningPair) return CONFIG.DUPLICATE_PRIORITY_ROUTE_BONUS;
                return hasLowLevelNonDuplicate ? 120 : -420;
            }
            if (type === 'grass') return -260;
            if (type === 'trainer') return hasDuplicatePair(team) ? 620 : 260;
            if (type === 'buff') return hasDuplicatePair(team) ? 220 : 80;
            if (type === 'legendary') return hasLowLevelNonDuplicate ? 180 : 80;
            if (type === 'trade') return hasLowLevelNonDuplicate ? 80 : -80;
            return 0;
        }

        return 0;
    }

    function scoreMapNodeImmediate(mapNode, context) {
        let score = 0;
        const {
            team, avgHP, hasFainted, lowHPCount, leadNeedsItem,
            buildingCoreTeam, trainingCore, earlyLevelingPriority, captureCapReached
        } = context;
        const openTeamSlot = hasOpenTeamSlot(team);
        const teamSize = (team || []).length;
        const needsEarlyRoster = openTeamSlot && teamSize < CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
        const earlyExpansionClosed = context.earlyExpansionClosed || false;
        const teamMaxLevel = Math.max(0, ...team.map(p => p.level || 0));
        const hasLowLevelForSwap = !openTeamSlot && team.some(p => (p.level || 0) < teamMaxLevel - 3);
        const prepStatus = context.bossPrepStatus || getBossPrepStatus(team);
        const prepPressure = (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0);
        const bossLevelPressure = Math.max(0, prepPressure);
        const primaryCarry = getPrimaryCarry(team);
        const duplicateRouteScore = getDuplicatePairRouteScore(team);
        const centerNeed = context.centerNeed || getCenterNeedStatus(team);
        const sinnohTraining = context.sinnohTraining || getSinnohTowerTrainingContext(team);
        const carryNeedsHealingItem = Boolean(
            primaryCarry &&
            isMainCarryUnit(primaryCarry) &&
            !primaryCarry.isFainted &&
            !isHealingItem(primaryCarry.heldItem)
        );
        const shinyRoute = getShinyRouteBalance(context);

        switch (mapNode.type) {
            case 'center':
                score += EasyPokelikeStrategyUtils.scoreCenterRouteNode({
                    avgHP,
                    hasFainted,
                    lowHPCount,
                    bossLevelPressure,
                    centerNeed,
                    config: {
                        criticalHpThreshold: CONFIG.CRITICAL_HP_THRESHOLD,
                        lowHpThreshold: CONFIG.LOW_HP_THRESHOLD,
                        centerHealthyPathPenalty: CONFIG.CENTER_HEALTHY_PATH_PENALTY,
                        centerStrongCarryPathPenalty: CONFIG.CENTER_STRONG_CARRY_PATH_PENALTY,
                        centerAlmostHealthyPathPenalty: CONFIG.CENTER_ALMOST_HEALTHY_PATH_PENALTY,
                        centerCarrySkipAvgHpThreshold: CONFIG.CENTER_CARRY_SKIP_AVG_HP_THRESHOLD
                    }
                }).score;
                break;
            case 'buff':
                score += EasyPokelikeStrategyUtils.scoreBuffRouteNode({
                    earlyLevelingPriority,
                    prepPressure,
                    bossLevelPressure,
                    sinnohTrainingActive: sinnohTraining.active,
                    sinnohNeedsOffense: sinnohTraining.needsOffense,
                    config: {
                        bossLevelPressureBuffBonus: CONFIG.BOSS_LEVEL_PRESSURE_BUFF_BONUS,
                        sinnohBuffNodeBonus: CONFIG.SINNOH_BUFF_NODE_BONUS,
                        sinnohOffenseBuffNodeBonus: CONFIG.SINNOH_OFFENSE_BUFF_NODE_BONUS
                    }
                }).score;
                break;
            case 'legendary':
                score += scoreLegendaryNode(context);
                break;
            case 'catch':
                score += EasyPokelikeStrategyUtils.scoreCatchRouteNode({
                    nodeType: 'catch',
                    shinyRoute,
                    buildingCoreTeam,
                    needsEarlyRoster,
                    hasLowLevelForSwap,
                    earlyLevelingPriority,
                    openTeamSlot,
                    captureCapReached,
                    earlyExpansionClosed,
                    bossLevelPressure,
                    prepPressure,
                    duplicateRouteScore,
                    sinnohTrainingActive: sinnohTraining.active,
                    aliveCount: getAliveTeam(team).length,
                    config: {
                        earlyOptionalTeamSize: CONFIG.EARLY_OPTIONAL_TEAM_SIZE,
                        bossLevelPressureCatchPenalty: CONFIG.BOSS_LEVEL_PRESSURE_CATCH_PENALTY,
                        sinnohCatchNodePenalty: CONFIG.SINNOH_CATCH_NODE_PENALTY,
                        sinnohGrassNodePenalty: CONFIG.SINNOH_GRASS_NODE_PENALTY,
                        sinnohTrainingCoreTeamSize: CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE
                    }
                }).score;
                break;
            case 'grass':
                score += EasyPokelikeStrategyUtils.scoreCatchRouteNode({
                    nodeType: 'grass',
                    shinyRoute,
                    buildingCoreTeam,
                    needsEarlyRoster,
                    hasLowLevelForSwap,
                    earlyLevelingPriority,
                    openTeamSlot,
                    captureCapReached,
                    earlyExpansionClosed,
                    bossLevelPressure,
                    prepPressure,
                    duplicateRouteScore,
                    sinnohTrainingActive: sinnohTraining.active,
                    aliveCount: getAliveTeam(team).length,
                    config: {
                        earlyOptionalTeamSize: CONFIG.EARLY_OPTIONAL_TEAM_SIZE,
                        bossLevelPressureCatchPenalty: CONFIG.BOSS_LEVEL_PRESSURE_CATCH_PENALTY,
                        sinnohCatchNodePenalty: CONFIG.SINNOH_CATCH_NODE_PENALTY,
                        sinnohGrassNodePenalty: CONFIG.SINNOH_GRASS_NODE_PENALTY,
                        sinnohTrainingCoreTeamSize: CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE
                    }
                }).score;
                break;
            case 'unknown':
                score += EasyPokelikeStrategyUtils.scoreUnknownRouteNode({
                    shinyRoute,
                    captureCapReached,
                    bossLevelPressure,
                    prepPressure
                }).score;
                break;
            case 'item':
                score += EasyPokelikeStrategyUtils.scoreItemRouteNode({
                    earlyLevelingPriority,
                    carryNeedsHealingItem,
                    leadNeedsItem,
                    buildingCoreTeam,
                    bossLevelPressure,
                    sinnohTrainingActive: sinnohTraining.active,
                    sinnohNeedsTm: sinnohTraining.needsTm,
                    config: {
                        bossLevelPressureItemPenalty: CONFIG.BOSS_LEVEL_PRESSURE_ITEM_PENALTY,
                        sinnohItemNodeBonus: CONFIG.SINNOH_ITEM_NODE_BONUS,
                        sinnohTmNodeBonus: CONFIG.SINNOH_TM_NODE_BONUS
                    }
                }).score;
                break;
            case 'trainer': {
                const profile = detectNextOpponentProfile(mapNode.element);
                if (isBossOpponentProfile(profile)) {
                    score += scoreKnownBossNode(profile, context);
                    break;
                }
                const matchupScore = (isNodeSpecificOpponentProfile(profile) || isBossOpponentProfile(profile)) ? scoreLeadCandidate(getAliveTeam(team)[0], profile) / 3 : getTrainerMatchupScore(mapNode.src, team);
                score += EasyPokelikeStrategyUtils.scoreTrainerRouteNode({
                    avgHP,
                    matchupScore,
                    leadNeedsItem,
                    earlyLevelingPriority,
                    prepPressure,
                    bossLevelPressure,
                    sinnohTrainingActive: sinnohTraining.active,
                    config: {
                        lowHpThreshold: CONFIG.LOW_HP_THRESHOLD,
                        bossLevelPressureTrainerBonus: CONFIG.BOSS_LEVEL_PRESSURE_TRAINER_BONUS,
                        sinnohTrainerNodeBonus: CONFIG.SINNOH_TRAINER_NODE_BONUS
                    }
                }).score;
                break;
            }
            case 'boss': {
                const profile = detectNextOpponentProfile(mapNode.element);
                score += scoreKnownBossNode(profile, context);
                break;
            }
            case 'trade':
                score += captureCapReached ? -250 : 120;
                break;
            default:
                score += 1;
                break;
        }

        score += getChallengeStrategyNodeBonus(mapNode.type, context);
        score += getStoryStrategyNodeBonus(mapNode.type, context);
        score += getBotControlTacticNodeBonus(mapNode.type, context);
        score += (mapNode.x % 17);
        return score;
    }

    function scorePathFromNode(mapNode, tree, context, depth = CONFIG.PATH_LOOKAHEAD_DEPTH, memo = new Map(), routeItemCount = 0, routeScoutCount = 0) {
        let immediate = scoreMapNodeImmediate(mapNode, context);
        if (context.earlyLevelingPriority && mapNode.type === 'item' && routeItemCount > 0) {
            immediate -= 900 * routeItemCount;
        }
        const prepPressure = (context.bossPrepStatus?.avgDeficit || 0) + (context.bossPrepStatus?.leadDeficit || 0);
        if (prepPressure > 0 && mapNode.type === 'item' && routeItemCount > 0) {
            immediate -= Math.round(prepPressure * 80 * routeItemCount);
        }
        const shinyBalance = getShinyRouteBalance(context);
        const isScoutNode = isShinyScoutMapNodeType(mapNode.type);
        if (shinyBalance.tacticActive) {
            const scoutRouteBonusByType = {
                catch: CONFIG.SHINY_TACTIC_CATCH_ROUTE_BONUS,
                unknown: CONFIG.SHINY_TACTIC_UNKNOWN_ROUTE_BONUS,
                grass: CONFIG.SHINY_TACTIC_GRASS_ROUTE_BONUS,
                legendary: Math.round(CONFIG.SHINY_TACTIC_UNKNOWN_ROUTE_BONUS * 0.65)
            };
            if (isScoutNode && !shinyBalance.mustTrain) {
                const baseScoutBonus = scoutRouteBonusByType[mapNode.type] || 0;
                const scoutPressureScale = shinyBalance.needsTraining ? 0.58 : 1;
                immediate += Math.round((baseScoutBonus * scoutPressureScale) / (1 + routeScoutCount * 0.16));
                if (routeScoutCount >= CONFIG.SHINY_TACTIC_SCOUT_STREAK_SOFT_LIMIT) {
                    const excessScouts = routeScoutCount - CONFIG.SHINY_TACTIC_SCOUT_STREAK_SOFT_LIMIT + 1;
                    immediate -= Math.round(excessScouts * (shinyBalance.canBalancedScout ? 220 : 420) + prepPressure * 22);
                }
            }
            if (isTrainingMapNodeType(mapNode.type) && routeScoutCount > 0) {
                immediate += Math.round(routeScoutCount * CONFIG.SHINY_TACTIC_TRAIN_AFTER_SCOUT_BONUS + prepPressure * 24);
                if (routeScoutCount >= CONFIG.SHINY_TACTIC_SCOUT_STREAK_SOFT_LIMIT) {
                    immediate += 280;
                }
            }
        }
        if (shinyBalance.tacticActive && isScoutNode && routeScoutCount > 0 && prepPressure > CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT) {
            immediate -= Math.round(routeScoutCount * (140 + prepPressure * 28));
        }
        if (shinyBalance.tacticActive && isTrainingMapNodeType(mapNode.type) && routeScoutCount > 0 && prepPressure > CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT) {
            immediate += Math.round(routeScoutCount * (120 + prepPressure * 18));
        }
        if (depth <= 1) return immediate;

        const nextRouteItemCount = routeItemCount + (mapNode.type === 'item' ? 1 : 0);
        const nextRouteScoutCount = isTrainingMapNodeType(mapNode.type)
            ? 0
            : routeScoutCount + (isScoutNode ? 1 : 0);
        const memoKey = `${mapNode.index}:${depth}:${Math.min(routeItemCount, 3)}:${Math.min(routeScoutCount, 4)}`;
        if (memo.has(memoKey)) return memo.get(memoKey);

        const nextNodes = getNextMapLayerNodes(tree, mapNode);
        if (nextNodes.length === 0) {
            memo.set(memoKey, immediate);
            return immediate;
        }

        const bestFuture = Math.max(...nextNodes.map(next => scorePathFromNode(next, tree, context, depth - 1, memo, nextRouteItemCount, nextRouteScoutCount)));
        const futureWeight = shinyBalance.tacticActive ? CONFIG.SHINY_TACTIC_ROUTE_FUTURE_WEIGHT : 0.55;
        const score = immediate + bestFuture * futureWeight;
        memo.set(memoKey, score);
        return score;
    }

    function isRewardMapNodeType(type) {
        return ['item', 'buff', 'catch', 'grass', 'unknown', 'trainer', 'trade', 'legendary'].includes(type);
    }

    function getBestRouteFromNode(mapNode, tree, context, depth = CONFIG.PATH_LOOKAHEAD_DEPTH) {
        const route = [];
        const seen = new Set();
        let current = mapNode;
        let remaining = depth;
        let routeItemCount = 0;
        let routeScoutCount = 0;

        while (current && remaining > 0 && !seen.has(current.index)) {
            route.push(current);
            seen.add(current.index);
            routeItemCount += current.type === 'item' ? 1 : 0;
            routeScoutCount = isTrainingMapNodeType(current.type)
                ? 0
                : routeScoutCount + (isShinyScoutMapNodeType(current.type) ? 1 : 0);
            const nextNodes = getNextMapLayerNodes(tree, current);
            if (nextNodes.length === 0) break;
            current = nextNodes
                .map(next => ({ node: next, score: scorePathFromNode(next, tree, context, remaining - 1, new Map(), routeItemCount, routeScoutCount) }))
                .sort((a, b) => b.score - a.score)[0]?.node || null;
            remaining--;
        }

        return route;
    }

    function getBestPathSummary(mapNode, tree, context, depth = CONFIG.PATH_LOOKAHEAD_DEPTH) {
        return getBestRouteFromNode(mapNode, tree, context, depth)
            .map(node => node.type)
            .join(' > ');
    }

    function getMapRouteIndexes(route) {
        return (route || [])
            .map(node => Number.isFinite(node.index) ? node.index : '?')
            .join('-');
    }

    function getMapRouteTypeSummary(route) {
        return (route || [])
            .map(node => `${Number.isFinite(node.index) ? node.index : '?'}:${node.type || 'unknown'}`)
            .join(' > ');
    }

    function getMapGraphLabel(tree) {
        if (!tree) return 'sin grafo';
        if (tree.hasRealEdges) {
            return `${tree.edgeSource || 'real graph'} ${tree.edges.length} edges`;
        }
        return tree.edgeSource || 'layer fallback';
    }

    function getMapRouteKnowledgeLabel(tree, route) {
        if (!tree || !route || route.length === 0) return 'sin ruta';
        const lastNode = route[route.length - 1];
        const reachesTerminal = getNextMapLayerNodes(tree, lastNode).length === 0;
        if (tree.hasRealEdges && reachesTerminal) return 'ruta completa conocida';
        if (tree.hasRealEdges) return 'ruta parcial conocida';
        return 'ruta estimada por capas';
    }

    function getMapStrategyLabel(context = {}, chosenNode = null) {
        const tactic = getBotControlTactic();
        if (tactic && tactic !== 'auto') {
            return `control:${BOT_CONTROL_TACTICS[tactic] || tactic}`;
        }
        if (context.storyStrategy?.active) return `historia:${context.storyStrategy.region || 'region'}`;
        if (context.challengeStrategy?.active) return 'desafio';
        if (context.shinyRoute?.tacticActive) return 'shiny';
        if (context.sinnohTraining?.active) return 'entrenamiento Sinnoh';
        if (context.earlyLevelingPriority) return 'subir nivel temprano';
        if (context.bossPrepStatus && !context.bossPrepStatus.ready) {
            return `preparacion boss ${context.bossPrepStatus.targets?.reason || ''}`.trim();
        }
        if (chosenNode?.type === 'center') return 'curacion';
        if (context.captureCapReached) return 'cap capturas';
        return 'auto';
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║     🐾 AI: CATCH CANDIDATE SCORER (Trait-Aware Drafting)    ║
    // ╚══════════════════════════════════════════════════════════════╝

    function scoreCatchCandidate(candidateName, candidateTypes, team, isShiny = false, attackTypes = null, bossTypesOverride = null, options = {}) {
        let score = 0;
        const traitCounts = getTeamTraitCounts(team);
        const teamTypes = getTeamTypes(team);
        const bossTypes = bossTypesOverride || getCurrentCatchBossTypes();
        const aliveCount = getAliveTeam(team || []).length;
        const coverageWeight = aliveCount < CONFIG.EARLY_OPTIONAL_TEAM_SIZE
            ? CONFIG.EARLY_NEW_TYPE_COVERAGE_WEIGHT
            : CONFIG.SETTLED_NEW_TYPE_COVERAGE_WEIGHT;
        const storyMode = isStoryStrategyActive();
        if (!storyMode) {
            score += getTraitCompletionScore(candidateTypes, team);
            score += scoreSinnohPassivePlanForTypes(candidateTypes, team, { isShiny });
            score += scoreSinnohPowerCatchCandidate(candidateName, candidateTypes, team, {
                isShiny,
                attackTypes,
                level: options.level || 0
            }) * 0.45;
        }
        score += scorePokemonStats(getPokemonBaseStats(candidateName)) * 0.6;

        // 1. Trait synergy score — prioritize completing trait thresholds
        if (!storyMode) {
            candidateTypes.forEach(type => {
                const traitInfo = TRAIT_DATA[type];
                if (!traitInfo) return;
                const currentCount = traitCounts[type] || 0;
                const tierValue = TRAIT_TIER_VALUE[traitInfo.tier] || 1;

                // Near threshold (1 away from activating T1=2, T2=4, T3=6)
                if (currentCount === 1 || currentCount === 3 || currentCount === 5) {
                    score += tierValue * 2; // About to unlock next tier!
                } else if (currentCount === 0) {
                    score += tierValue * 0.5; // Starting a new synergy
                } else {
                    score += tierValue * 0.3; // Adding to existing
                }
            });
        }

        // 2. Type coverage — fill gaps
        candidateTypes.forEach(type => {
            if (!teamTypes.includes(type)) {
                score += coverageWeight;
            }
        });

        // 3. Boss counter-pick
        if (bossTypes.length > 0) {
            score += scoreCatchBossCounter(candidateTypes, attackTypes, bossTypes);
        }

        // 4. Grass support: sustain scales well when a protected carry keeps sweeping.
        score += getGrassSupportCatchScore(candidateTypes, team);

        // 5. Duplicate-pair strategy: early catches often enter twice while slots are open.
        score += getDuplicatePairCatchScore(candidateName, candidateTypes, team, attackTypes, bossTypes, options);

        // 6. Legendary/masterball rewards can decide late floors.
        if (isLegendaryPokemonName(candidateName)) {
            score += CONFIG.LEGENDARY_CATCH_SCORE_BONUS;
        }

        // 7. Shiny bonus: early shiny depth is stronger than chasing weak one-off type coverage.
        score += getShinyDraftScore(candidateTypes, team, isShiny);
        score += scoreChallengeCatchScoreBonus({
            name: candidateName,
            types: candidateTypes,
            attackTypes,
            isShiny,
            alreadyOwnedShiny: Boolean(options.alreadyOwnedShiny),
            level: options.level || 0
        }, team, bossTypes, options.opponentProfile || null);
        score += scoreStoryCatchScoreBonus({
            name: candidateName,
            types: candidateTypes,
            attackTypes,
            isShiny,
            alreadyOwnedShiny: Boolean(options.alreadyOwnedShiny),
            level: options.level || 0
        }, team, bossTypes, options.opponentProfile || null);

        return score;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║       💰 AI: TRADE EVALUATOR                                ║
    // ╚══════════════════════════════════════════════════════════════╝

    function evaluateTrade(team) {
        const tradeScreen = document.getElementById('trade-screen');
        if (!tradeScreen) return;

        // Try to read the trade description to understand what's offered
        const tradeDesc = document.getElementById('trade-desc');
        const tradeList = document.querySelectorAll('#trade-team-list li, #trade-team-list .trade-option');

        // If we can parse the trade options, click the best one
        if (tradeList.length > 0) {
            // Look for clickable trade options
            let bestOption = null;
            let bestScore = -999;

            tradeList.forEach(option => {
                const text = option.innerText.toLowerCase().trim();
                // Try to identify the Pokémon being offered
                for (const { name, types } of getAllKnownPokemonEntries()) {
                    if (text.includes(name)) {
                        const score = scoreCatchCandidate(name, types, team);
                        if (score > bestScore) {
                            bestScore = score;
                            bestOption = option;
                        }
                    }
                }
            });

            const tradeAllowance = getEarlyCatchAllowance(team, bestScore, false);
            if (bestOption && bestScore > 3 && tradeAllowance !== 'skip') {
                log('info', '🔄', `Accepting trade (score: ${bestScore})`);
                triggerRealClick(bestOption);
                return;
            }
        }

        // Decline if no good trade found
        const declineBtn = document.getElementById('btn-skip-trade');
        if (declineBtn) {
            log('info', '🔄', 'Declining trade — no good candidates.');
            triggerRealClick(declineBtn);
        }
    }

    // ╔══════════════════════════════════════════════════════════════╗
