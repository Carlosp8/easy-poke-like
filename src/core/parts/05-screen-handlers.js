    // ║   🗺️ SCREEN HANDLERS                                       ║
    // ╚══════════════════════════════════════════════════════════════╝

    // One handler per visible game screen. Keep side effects local to each handler.
    // --- MAP SCREEN (Enhanced Pathfinding) ---
    function handleMapScreen() {
        const team = parseTeamStatus();
        if (team.length === 0) return;
        lockVisibleShinyTeamMembers(team, 'map-screen');
        syncMapCaptureState();

        // 1. Fainted leader → drag first alive to slot 0
        if (team[0] && team[0].isFainted) {
            const firstAlive = team.find(p => !p.isFainted);
            if (firstAlive) {
                log('info', '💀', `Leader fainted → dragging ${firstAlive.name} to lead.`);
                tryTeamReorder(firstAlive.element, team[0].element, firstAlive, team[0], 'fainted-lead');
                return;
            }
        }

        // 2. Detect the known boss or visible enemy profile. Do not reorder only for held items on the map:
        // node-specific counter-picks below own the lead slot to avoid drag loops.
        const opponentProfile = detectNextOpponentProfile();

        // 3. Equip unassigned items from the bag (inventory)
        const bagItems = getBagItems();
        if (bagItems.length > 0) {
            const bestBagItem = pickBestBagItemForTeam(bagItems, team, opponentProfile);
            if (bestBagItem && shouldEquipBagItem(bestBagItem.name, team, opponentProfile) && shouldAttemptMapBagItem(bestBagItem.name, team)) {
                log('info', '🎒', `Found useful bag item: [${bestBagItem.name}]. Opening equip modal.`);
                lastChosenItemName = bestBagItem.name;
                triggerRealClick(bestBagItem.element);
                return; // Let the modal open and settle
            }
        }

        // 4. Navigate the map tree
        const clickableNodes = getClickableMapNodes();
        if (clickableNodes.length === 0) return;
        const mapDecisionFingerprint = getMapDecisionFingerprint(team, clickableNodes, opponentProfile);
        const mapChangedSinceLastDecision = mapDecisionFingerprint !== lastMapDecisionFingerprint;
        lastMapDecisionFingerprint = mapDecisionFingerprint;

        const avgHP = getTeamAverageHP(team);
        const hasFainted = team.some(p => p.isFainted);
        const lowHPCount = team.filter(p => !p.isFainted && p.hp < CONFIG.LOW_HP_THRESHOLD).length;
        const leadNeedsItem = team[0] && !team[0].isFainted && !team[0].heldItem;
        const buildingCoreTeam = shouldBuildCoreTeam(team);
        const bossPrepStatus = getBossPrepStatus(team, opponentProfile);
        const bossPrepTargets = bossPrepStatus.targets;
        const trainingCore = shouldPrioritizeEarlyTraining(team, opponentProfile);
        const aliveCount = getAliveTeam(team).length;
        const earlyLevelingPriority = trainingCore || aliveCount <= CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
        const avgLevel = getTeamAverageLevel(team);
        const leadLevel = getLeadLevel(team);
        const earlyExpansionClosed = shouldStopEarlyExpansion(team, opponentProfile);
        const captureCapReached = hasReachedMapCaptureCap();
        const mapTree = parseMapTree();
        const centerNeed = getCenterNeedStatus(team, opponentProfile, bossPrepStatus);
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const challengeStrategy = getChallengeStrategyContext(team, opponentProfile);
        const storyStrategy = getStoryStrategyContext(team, opponentProfile);
        const context = {
            team,
            opponentProfile,
            avgHP,
            hasFainted,
            lowHPCount,
            leadNeedsItem,
            buildingCoreTeam,
            trainingCore,
            earlyLevelingPriority,
            earlyExpansionClosed,
            bossPrepStatus,
            captureCapReached,
            centerNeed,
            sinnohTraining,
            challengeStrategy,
            storyStrategy
        };

        let bestNode = null;
        let bestMapNode = null;
        let highestScore = -9999;
        const pathScoreMemo = new Map();

        const candidates = clickableNodes.map(node => {
            const mapNode = mapTree.nodes.find(item => item.element === node) || (() => {
                const pos = getMapNodePosition(node);
                return {
                    index: -1,
                    element: node,
                    type: classifyMapNode(node),
                    src: getNodeImageSrc(node),
                    x: pos.x,
                    y: pos.y,
                    clickable: true
                };
            })();
            const score = scorePathFromNode(mapNode, mapTree, context, CONFIG.PATH_LOOKAHEAD_DEPTH, pathScoreMemo);
            return { node, mapNode, score };
        }).sort((a, b) => b.score - a.score);

        if (mapChangedSinceLastDecision) {
            const availableSummary = candidates
                .map(candidate => `${candidate.mapNode.index}:${candidate.mapNode.type}`)
                .join(', ');
            log('info', 'map', `Nodos disponibles: ${availableSummary || 'ninguno'}`);
            candidates.forEach(candidate => {
                const route = getBestRouteFromNode(candidate.mapNode, mapTree, context, CONFIG.PATH_LOOKAHEAD_DEPTH);
                log('debug', '🧭', `Nodo candidato ${candidate.mapNode.index}:${candidate.mapNode.type} score=${candidate.score.toFixed(1)} ruta=${getMapRouteIndexes(route)} | ${getMapRouteTypeSummary(route)}`);
            });
        }

        const preferredCandidate = (() => {
            for (const candidate of candidates) {
                const signature = `${currentMapKey || '-'}:${candidate.mapNode.index}:${candidate.mapNode.type}:${Math.round(candidate.mapNode.x)}:${Math.round(candidate.mapNode.y)}`;
                if (signature !== lastMapClickSignature || repeatedMapClickCount < 2) return candidate;
            }
            return candidates[0] || null;
        })();

        candidates.forEach(candidate => {
            const { node, mapNode, score } = candidate;

            if (score > highestScore) {
                highestScore = score;
                bestNode = node;
                bestMapNode = mapNode;
            }
        });

        if (preferredCandidate && preferredCandidate.node !== bestNode && lastMapClickSignature) {
            bestNode = preferredCandidate.node;
            bestMapNode = preferredCandidate.mapNode;
            highestScore = preferredCandidate.score;
            log('warn', '🗺️', `Map click repeated without progress. Trying alternate ${bestMapNode.type} node.`);
        }

        if (bestMapNode?.type === 'center' && centerNeed.canSkipCenter) {
            const rewardAlternative = candidates.find(candidate =>
                candidate.mapNode.type !== 'center' &&
                isRewardMapNodeType(candidate.mapNode.type) &&
                candidate.score >= highestScore - CONFIG.CENTER_REWARD_ALTERNATE_MARGIN
            );
            if (rewardAlternative) {
                log('info', '🗺️', `Skipping center at ${centerNeed.avgHP.toFixed(1)}% avg HP (lowest ${centerNeed.lowestHP}%). Taking ${rewardAlternative.mapNode.type} reward instead.`);
                bestNode = rewardAlternative.node;
                bestMapNode = rewardAlternative.mapNode;
                highestScore = rewardAlternative.score;
            }
        }

        if (bestNode) {
            const nextProfile = ['trainer', 'boss', 'legendary'].includes(bestMapNode.type)
                ? (detectNextOpponentProfile(bestNode) || (bestMapNode.type === 'legendary'
                    ? makeOpponentProfile({ name: 'legendary node', types: [], sourceConfidence: 'legendary-node' })
                    : null))
                : null;
            const shouldReorderForNode = bestMapNode.type === 'boss' ||
                                         bestMapNode.type === 'legendary' ||
                                         (bestMapNode.type === 'trainer' && (isNodeSpecificOpponentProfile(nextProfile) || isBossOpponentProfile(nextProfile)));
            const duplicateOrderProfile = isDuplicatePriorityMode() &&
                                          hasDuplicatePair(team) &&
                                          ['trainer', 'boss', 'legendary'].includes(bestMapNode.type) &&
                                          !nextProfile
                ? makeOpponentProfile({ name: 'duplicate-order', types: [], sourceConfidence: 'duplicate-order' })
                : null;
            const orderProfile = nextProfile || duplicateOrderProfile;
            if (['trainer', 'boss', 'legendary'].includes(bestMapNode.type) && ensureLeadMeetsBattleLevel(team, bossPrepStatus, nextProfile)) return;
            if (orderProfile && (shouldReorderForNode || duplicateOrderProfile) && optimizeTeamOrder(team, orderProfile, bossPrepStatus)) return;
            if (nextProfile && shouldReorderForNode && ensureLeadHasHeldItem(team, nextProfile)) return;

            const chosenRoute = getBestRouteFromNode(bestMapNode, mapTree, context, CONFIG.PATH_LOOKAHEAD_DEPTH);
            const pathSummary = chosenRoute.map(node => node.type).join(' > ');
            const routeIndexes = getMapRouteIndexes(chosenRoute);
            const routeTypes = getMapRouteTypeSummary(chosenRoute);
            const routeKnowledge = getMapRouteKnowledgeLabel(mapTree, chosenRoute);
            const routeStrategy = getMapStrategyLabel(context, bestMapNode);
            const edgeMode = getMapGraphLabel(mapTree);
            const clickSignature = `${currentMapKey || '-'}:${bestMapNode.index}:${bestMapNode.type}:${Math.round(bestMapNode.x)}:${Math.round(bestMapNode.y)}`;
            const allMapNodes = mapTree.nodes;
            const clickableMapNodes = allMapNodes.filter(node => node.clickable);
            const visibleLegendaryNodes = mapTree.nodes.filter(node => node.type === 'legendary').length;
            const shouldStoreUnknownHints = bestMapNode.type === 'unknown' || bestMapNode.type === 'legendary';
            const unknownNodeHints = shouldStoreUnknownHints
                ? allMapNodes
                    .filter(node => node.type === 'unknown')
                    .slice(0, 4)
                    .map(node => ({
                        index: node.index,
                        x: Math.round(node.x),
                        y: Math.round(node.y),
                        debug: getMapNodeDebugInfo(node.element)
                    }))
                : [];
            ensureRunTelemetry('map-screen');
            if (mapChangedSinceLastDecision) {
                recordRunEvent('map-choice', {
                    nodeType: bestMapNode.type,
                    nodeIndex: bestMapNode.index,
                    nodeDebug: getMapNodeDebugInfo(bestMapNode.element),
                    nodeTypeCounts: summarizeMapNodeTypes(allMapNodes),
                    clickableNodeTypeCounts: summarizeMapNodeTypes(clickableMapNodes),
                    totalMapNodes: allMapNodes.length,
                    clickableMapNodes: clickableMapNodes.length,
                    visibleLegendaryNodes,
                    unknownNodeHints,
                    score: Number(highestScore.toFixed(1)),
                    path: pathSummary,
                    routeIndexes,
                    routeTypes,
                    routeKnowledge,
                    routeStrategy,
                    edgeMode,
                    nextOpponent: compactOpponentProfile(nextProfile),
                    teamSize: team.length,
                    aliveCount,
                    avgHP: Number(avgHP.toFixed(1)),
                    avgLevel: Number(avgLevel.toFixed(1)),
                    leadLevel,
                    trainingCore,
                    earlyLevelingPriority,
                    earlyExpansionClosed,
                    bossPrepTargets,
                    bossPrepStatus,
                    capturesThisMap,
                    captureCapReached,
                    sinnohTraining: sinnohTraining.active ? {
                        assumedTowerSinnoh: sinnohTraining.progress.assumedTowerSinnoh,
                        mapOrdinal: sinnohTraining.progress.mapOrdinal,
                        carry: sinnohTraining.carry ? sinnohTraining.carry.name : null,
                        carryMoveTier: sinnohTraining.carryMoveTier,
                        observedCarryMoveTier: sinnohTraining.observedCarryMoveTier,
                        rememberedCarryMoveTier: sinnohTraining.rememberedCarryMoveTier,
                        needsTm: sinnohTraining.needsTm,
                        needsOffense: sinnohTraining.needsOffense,
                        needsSpeed: sinnohTraining.needsSpeed
                    } : null,
                    challengeStrategy: challengeStrategy.active ? {
                        mapOrdinal: challengeStrategy.mapOrdinal,
                        hasShiny: challengeStrategy.hasShiny,
                        earlyShinyHunt: challengeStrategy.earlyShinyHunt,
                        carry: challengeStrategy.carry ? challengeStrategy.carry.name : null,
                        carryNeedsItem: challengeStrategy.carryNeedsItem,
                        needsCarryBuff: challengeStrategy.needsCarryBuff,
                        prepPressure: challengeStrategy.prepPressure
                    } : null,
                    storyStrategy: storyStrategy.active ? {
                        region: storyStrategy.region || null,
                        needsTeam: storyStrategy.needsTeam,
                        needsCoverage: storyStrategy.needsCoverage,
                        uncoveredLeagueTypes: storyStrategy.uncoveredLeagueTypes,
                        weakMemberCount: storyStrategy.weakMembers.length,
                        prepPressure: storyStrategy.prepPressure
                    } : null,
                    centerNeed
                });
                currentRunTelemetry.best.mapSteps = Math.max(currentRunTelemetry.best.mapSteps, currentRunTelemetry.events.filter(event => event.type === 'map-choice').length);
                currentRunTelemetry.best.battles = Math.max(currentRunTelemetry.best.battles, getRunBattleCount(currentRunTelemetry));
            }
            if (mapChangedSinceLastDecision || clickSignature !== lastMapClickSignature || repeatedMapClickCount <= 1) {
                log('info', '🧭', `Ruta decidida según estrategia ${routeStrategy}: ${routeIndexes} | ${routeKnowledge} | ${edgeMode} | ${routeTypes}`);
            }
            log('debug', '🗺️', `Map reevaluated ${clickableNodes.length} clickable options over ${allMapNodes.length} total nodes (${mapChangedSinceLastDecision ? 'fresh state' : 'repeat'}). ${edgeMode}. Path=${pathSummary}. Captures=${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP} target=${bossPrepTargets.reason}:${bossPrepTargets.avgLevel}/${bossPrepTargets.leadLevel} training=${trainingCore} earlyExpansionClosed=${earlyExpansionClosed} avgLv=${avgLevel.toFixed(1)} leadLv=${leadLevel}. Score=${highestScore.toFixed(1)}`);
            if (clickSignature === lastMapClickSignature) repeatedMapClickCount++;
            else {
                lastMapClickSignature = clickSignature;
                repeatedMapClickCount = 1;
            }
            triggerRealClick(bestNode);
        }
    }

    // --- BATTLE SCREEN ---
    function handleBattleScreen() {
        const continueBtn = document.getElementById('btn-continue-battle');
        if (continueBtn && isVisible(continueBtn)) {
            triggerRealClick(continueBtn);
            return;
        }
        const skipBtn = document.getElementById('btn-auto-battle');
        if (skipBtn && isVisible(skipBtn)) {
            ensureRunTelemetry('battle-screen');
            recordRunEvent('battle-auto', { team: compactTeamSnapshot(parseTeamStatus(), detectNextOpponentProfile()) });
            triggerRealClick(skipBtn);
        }
    }

    function shouldAttemptElitePrepBagItem(itemName, team) {
        const signature = `${itemName}:${(team || []).map(p => `${p.name}:${p.heldItem || '-'}:${p.level || 0}`).join('|')}`;
        if (signature === lastElitePrepBagClickSignature && Date.now() - lastElitePrepBagClickAt < 8000) {
            log('warn', '🎒', `Elite prep: skipping repeated bag item [${itemName}] and proceeding to FIGHT.`);
            return false;
        }
        lastElitePrepBagClickSignature = signature;
        lastElitePrepBagClickAt = Date.now();
        return true;
    }

    function shouldAttemptMapBagItem(itemName, team) {
        const signature = `${currentMapKey || '-'}:${itemName}:${(team || []).map(p => `${p.name}:${p.heldItem || '-'}:${p.level || 0}`).join('|')}`;
        if (signature === lastMapBagClickSignature && Date.now() - lastMapBagClickAt < 8000) {
            log('warn', '🎒', `Skipping repeated map bag item [${itemName}] after no progress.`);
            markItemKeptInBag(itemName, { team, reason: 'repeated-map-bag-item', blockAssignment: true });
            return false;
        }
        lastMapBagClickSignature = signature;
        lastMapBagClickAt = Date.now();
        return true;
    }

    function isEnabledActionControl(control) {
        if (!control || !isVisible(control)) return false;
        if (control.disabled || control.getAttribute('aria-disabled') === 'true') return false;
        if (control.classList && control.classList.contains('disabled')) return false;

        const style = window.getComputedStyle(control);
        return style.pointerEvents !== 'none';
    }

    function isRerollControl(control) {
        if (!control) return false;
        const classText = typeof control.className === 'string' ? control.className : (control.getAttribute('class') || '');
        const idText = control.id || '';
        const dataText = Array.from(control.attributes || [])
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => `${attr.name} ${attr.value}`)
            .join(' ');
        const text = foldText([
            control.innerText || '',
            control.title || '',
            control.getAttribute('aria-label') || '',
            idText,
            classText,
            dataText
        ].join(' '));

        const structuralMatch = foldText(`${idText} ${classText} ${dataText}`)
            .match(/reroll|re-roll|reroll-placeholder|reroll-pla|data-reroll|roll-option/);

        if (structuralMatch && text.includes('reroll-placeholder') && !control.querySelector('button, .btn, [role="button"], [onclick]') && !control.onclick) {
            return false;
        }
        if (!text && !structuralMatch) return false;
        if (!structuralMatch && text.match(/skip|saltar|omitir|cancel|catch|captur|elegir|select/)) return false;
        return Boolean(structuralMatch || text.match(/reroll|re roll|re-roll|volver a tirar|volver tirar|tirar otra|nuevo intento|\broll\b|refresh|retry|again|cambiar|aleator/));
    }

    function getRerollActionTarget(control) {
        if (!control) return null;
        const childTarget = control.querySelector(
            'button:not([disabled]), .btn:not(.disabled), [role="button"]:not([aria-disabled="true"]), [onclick], svg, img'
        );
        if (childTarget && isVisible(childTarget)) return childTarget;
        return control;
    }

    function findRerollControlInScope(scope) {
        if (!scope) return null;

        const controls = Array.from(scope.querySelectorAll(
            'button, .btn, [role="button"], [onclick], [data-reroll], [class*="reroll"], [id*="reroll"], ' +
            '.reroll-placeholder, [class*="reroll-pla"], [aria-label], [title]'
        ));

        const control = controls.find(candidate => isEnabledActionControl(candidate) && isRerollControl(candidate));
        return control ? getRerollActionTarget(control) : null;
    }

    function findRerollControlForCard(card) {
        if (!card) return null;
        const wrapper = card.closest('.poke-choice-wrap, .catch-choice, .choice-card, .choice, li');
        return findRerollControlInScope(wrapper || card);
    }

    function getRerollCardSignature(item) {
        const card = item?.card;
        if (!card) {
            return `${item?.name || '?'}:${item?.score?.toFixed?.(1) || '?'}:${item?.isShiny ? 'S' : '-'}`;
        }

        const assets = Array.from(card.querySelectorAll('img, image')).slice(0, 4).map(asset => [
            asset.getAttribute('src') || '',
            asset.getAttribute('href') || '',
            asset.getAttribute('xlink:href') || '',
            asset.getAttribute('alt') || '',
            asset.getAttribute('title') || '',
            asset.getAttribute('class') || ''
        ].join('|')).join('~');
        const dataAttrs = Array.from(card.attributes || [])
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => `${attr.name}=${attr.value}`)
            .join('|');
        const text = foldText(card.innerText || '').slice(0, 280);
        const classText = foldText(card.getAttribute('class') || '').slice(0, 120);

        return [
            item.name || '?',
            Number.isFinite(item.score) ? item.score.toFixed(1) : '?',
            item.isShiny ? 'S' : '-',
            item.level || 0,
            (item.types || []).join('/'),
            classText,
            dataAttrs,
            assets,
            text
        ].join('::');
    }

    function getPokemonBaseStatTotal(stats) {
        if (!stats) return 0;
        return getPokemonStat(stats, 'hp') +
               getPokemonStat(stats, 'atk', 'attack') +
               getPokemonStat(stats, 'def') +
               getPokemonStat(stats, 'special', 'spa', 'spatk') +
               getPokemonStat(stats, 'spdef', 'spd') +
               getPokemonStat(stats, 'speed', 'spe');
    }

    function isPremiumCatchCandidate(cardScore, isShiny, name) {
        if (isShiny) return true;
        if (isLegendaryPokemonName(name)) return true;
        if (cardScore >= CONFIG.CATCH_REROLL_PROTECT_SCORE) return true;
        return getPokemonBaseStatTotal(getPokemonBaseStats(name)) >= 540;
    }

    function getCurrentCatchBossTypes() {
        const opponentProfile = detectNextOpponentProfile();
        return opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
    }

    function scoreCatchBossCounter(candidateTypes, attackTypes, bossTypes) {
        return EasyPokelikeStrategyUtils.scoreCatchBossCounter(candidateTypes, attackTypes, bossTypes);
    }

    function isBossRelevantCatchCandidate(candidate, bossTypes) {
        if (!candidate || normalizeTypeList(bossTypes).length === 0) return false;
        const attackScore = getAttackCoverageScore(candidate.attackTypes || candidate.types, bossTypes);
        const defensiveScore = getDefensiveMatchupScore(candidate.types || [], bossTypes);
        return attackScore > 0 || defensiveScore > 0 || (candidate.bossMatchupScore || 0) >= 8;
    }

    function isDirectBossCounterCandidate(candidate, bossTypes) {
        if (!candidate || normalizeTypeList(bossTypes).length === 0) return false;
        const attackScore = getAttackCoverageScore(candidate.attackTypes || candidate.types, bossTypes);
        const defensiveScore = getDefensiveMatchupScore(candidate.types || [], bossTypes);
        return attackScore >= 5 ||
               (candidate.bossMatchupScore || 0) >= CONFIG.EARLY_EXPANSION_COUNTER_SCORE ||
               (attackScore > 0 && defensiveScore > 0);
    }

    function getBotControlCatchScoreBonus(candidate, team, bossTypes) {
        const tactic = getBotControlTactic();
        if (tactic === 'auto' || !candidate) return 0;

        if (tactic === 'capture') {
            return 18;
        }

        if (tactic === 'shiny') {
            if (candidate.isShiny) {
                let bonus = candidate.alreadyOwnedShiny
                    ? CONFIG.SHINY_TACTIC_OWNED_SHINY_BONUS
                    : CONFIG.SHINY_TACTIC_NEW_SHINY_BONUS;
                if (candidate.isLegendary) bonus += 30;
                bonus += Math.min(24, Math.max(0, candidate.bossMatchupScore || 0));
                bonus += Math.min(18, Math.max(0, candidate.sinnohPowerScore || 0) / 3);
                return bonus;
            }

            const runCriticalValue = candidate.isLegendary ||
                isDirectBossCounterCandidate(candidate, bossTypes) ||
                isBossRelevantCatchCandidate(candidate, bossTypes) ||
                (candidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE ||
                (candidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE;

            if (runCriticalValue) {
                const value = (candidate.bossMatchupScore || 0) +
                    (candidate.sinnohPowerScore || 0) / 4 +
                    (candidate.sinnohPassivePlanScore || 0) / 4;
                return Math.min(CONFIG.SHINY_TACTIC_RUN_VALUE_BONUS_CAP, Math.max(8, value));
            }

            return hasOpenTeamSlot(team)
                ? -CONFIG.SHINY_TACTIC_NON_SHINY_PENALTY
                : -Math.round(CONFIG.SHINY_TACTIC_NON_SHINY_PENALTY * 1.5);
        }

        if (tactic === 'xp') {
            const protectedValue = candidate.isShiny ||
                candidate.isLegendary ||
                (candidate.duplicatePairScore || 0) >= CONFIG.DUPLICATE_PAIR_PROTECT_SCORE ||
                isBossRelevantCatchCandidate(candidate, bossTypes);
            return protectedValue ? 0 : -16;
        }

        if (tactic === 'boss') {
            const matchupBonus = Math.min(28, (candidate.bossMatchupScore || 0) * 1.4);
            return isDirectBossCounterCandidate(candidate, bossTypes)
                ? Math.max(10, matchupBonus)
                : matchupBonus;
        }

        if (tactic === 'duplicate') {
            const duplicateScore = candidate.duplicatePairScore || 0;
            if (duplicateScore > 0) return Math.max(18, duplicateScore);
            return hasOpenTeamSlot(team) ? 6 : 0;
        }

        return 0;
    }

    function isProtectedCatchCandidate(candidate, bossTypes) {
        if (!candidate) return false;
        return isPremiumCatchCandidate(candidate.score, candidate.isShiny, candidate.name) ||
               (candidate.duplicatePairScore || 0) >= CONFIG.DUPLICATE_PAIR_PROTECT_SCORE ||
               (candidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE ||
               (candidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE ||
               (candidate.challengeScore || 0) >= CONFIG.CHALLENGE_CATCH_PROTECT_SCORE ||
               (candidate.storyScore || 0) >= CONFIG.STORY_CATCH_PROTECT_SCORE ||
               isBossRelevantCatchCandidate(candidate, bossTypes);
    }

    function findCatchRerollButton(scoredCards, options = {}) {
        const bossTypes = getCurrentCatchBossTypes();
        const shouldProtect = item => {
            if (!item) return true;
            if (options.preserveShiny && item.isShiny) return true;
            if (options.ignoreProtectedForReroll) return false;
            return isProtectedCatchCandidate(item, bossTypes);
        };
        const hasProtectedVisible = scoredCards.some(item => shouldProtect(item));
        const sortedCards = [...scoredCards]
            .filter(item => item.rerollButton && !shouldProtect(item))
            .sort((a, b) => a.score - b.score);

        for (const item of sortedCards) {
            return { button: item.rerollButton, score: item.score, name: item.name || 'unknown' };
        }

        const catchScope = document.getElementById('catch-screen') || document.getElementById('catch-choices');
        const globalReroll = hasProtectedVisible && !options.allowProtectedGlobal ? null : findRerollControlInScope(catchScope);
        if (globalReroll) {
            return { button: globalReroll, score: null, name: 'global reroll', isGlobal: true };
        }

        return null;
    }

    function getCatchRerollReason(team, bestScore, bestIsShiny, earlyAllowance, scoredCards = [], opponentProfile = null) {
        const bossTypes = getCurrentCatchBossTypes();
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const tactic = getBotControlTactic();
        const challengeStrategy = getChallengeStrategyContext(team, opponentProfile);
        const bestCandidate = [...scoredCards].sort((a, b) => b.score - a.score)[0] || null;
        const bestPassivePlanScore = bestCandidate?.sinnohPassivePlanScore || 0;
        const bestPowerScore = bestCandidate?.sinnohPowerScore || 0;
        const bestChallengeScore = bestCandidate?.challengeScore || 0;
        const bestStoryScore = bestCandidate?.storyScore || 0;
        const bossPrepStatus = getBossPrepStatus(team, opponentProfile);
        const prepPressure = Math.max(0, (bossPrepStatus.avgDeficit || 0) + (bossPrepStatus.leadDeficit || 0));
        const bestIsRunCritical = Boolean(
            bestCandidate &&
            (
                bestCandidate.isLegendary ||
                isDirectBossCounterCandidate(bestCandidate, bossTypes) ||
                bestPassivePlanScore >= CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE ||
                bestPowerScore >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE ||
                bestChallengeScore >= CONFIG.CHALLENGE_CATCH_PROTECT_SCORE ||
                bestStoryScore >= CONFIG.STORY_CATCH_PROTECT_SCORE
            )
        );
        const worstRerollable = [...scoredCards]
            .filter(item => item.rerollButton && !isProtectedCatchCandidate(item, bossTypes))
            .sort((a, b) => a.score - b.score)[0];

        if (worstRerollable && worstRerollable.score < CONFIG.CATCH_REROLL_ALWAYS_BELOW_SCORE) {
            return `weak rerollable card ${worstRerollable.score.toFixed(1)} below ${CONFIG.CATCH_REROLL_ALWAYS_BELOW_SCORE}`;
        }

        if (sinnohTraining.active &&
            catchRerollsThisEncounter < CONFIG.SINNOH_CATCH_SCOUT_ATTEMPTS &&
            !bestIsShiny &&
            !bestCandidate?.isLegendary &&
            bestPassivePlanScore < CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE &&
            bestPowerScore < CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE) {
            return `Sinnoh scouting: best passive/power scores ${bestPassivePlanScore.toFixed(1)}/${bestPowerScore.toFixed(1)} below strong target`;
        }

        if (bestIsShiny) return '';

        if (challengeStrategy.earlyShinyHunt &&
            catchRerollsThisEncounter < CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER &&
            prepPressure <= CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT &&
            !bestIsRunCritical) {
            return `Challenge shiny scout ${catchRerollsThisEncounter + 1}/${CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER}`;
        }

        if (tactic === 'shiny' &&
            catchRerollsThisEncounter < CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER &&
            prepPressure <= CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT &&
            !bestIsRunCritical) {
            return `Shiny tactic scout ${catchRerollsThisEncounter + 1}/${CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER}`;
        }

        if (bestScore >= CONFIG.CATCH_REROLL_PROTECT_SCORE) return '';

        if (earlyAllowance === 'skip') {
            return `XP focus: best option ${bestScore.toFixed(1)} is not worth a team slot`;
        }

        if (bestScore < CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE) {
            return `best option ${bestScore.toFixed(1)} below accept score ${CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE}`;
        }

        if (shouldPrioritizeEarlyTraining(team, opponentProfile) && bestScore < CONFIG.CATCH_REROLL_XP_FOCUS_SCORE) {
            return `training core: best option ${bestScore.toFixed(1)} below XP-focus score ${CONFIG.CATCH_REROLL_XP_FOCUS_SCORE}`;
        }

        return '';
    }

    function tryRerollCatchOptions(scoredCards, reason, options = {}) {
        if (catchRerollsThisEncounter >= CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER) {
            return false;
        }

        const reroll = findCatchRerollButton(scoredCards, options);
        if (!reroll) return false;

        const catchScreen = document.getElementById('catch-screen') || document.getElementById('catch-choices');
        const cardsSnapshot = scoredCards.map(item => getRerollCardSignature(item)).join('|');
        const buttonSnapshot = foldText([
            reroll.button.id || '',
            reroll.button.getAttribute('class') || '',
            reroll.button.getAttribute('aria-label') || '',
            reroll.button.title || '',
            catchScreen ? (catchScreen.innerText || '').slice(0, 240) : ''
        ].join(' '));
        const signature = `${cardsSnapshot}::${buttonSnapshot}`;
        const now = Date.now();
        const signatureAttempts = catchRerollAttemptsBySignature[signature] || 0;
        const scoutTarget = options.scoutTarget || CONFIG.CATCH_REROLL_MIN_ATTEMPTS_PER_ENCOUNTER;
        const canUseScoutStaleRetry = Boolean(options.allowStaleScoutRetry) &&
                                      catchRerollsThisEncounter < scoutTarget;
        const maxAttemptsForSignature = canUseScoutStaleRetry
            ? Math.max(CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_STATE, scoutTarget)
            : CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_STATE;

        if (signature === lastCatchRerollSignature && now - lastCatchRerollAt < CONFIG.CATCH_REROLL_COOLDOWN_MS) {
            return false;
        }
        if (signatureAttempts >= maxAttemptsForSignature) {
            log('warn', '🔄', `Reroll state did not change after ${signatureAttempts} attempt(s). Falling back to catch/skip.`);
            return false;
        }

        lastCatchRerollSignature = signature;
        lastCatchRerollAt = now;
        catchRerollAttemptsBySignature[signature] = signatureAttempts + 1;
        catchRerollsThisEncounter++;
        engineStats.rerolls++;

        const weakestLabel = reroll.score !== null ? ` | weakest card score: ${reroll.score.toFixed(1)}` : ' | global reroll';
        ensureRunTelemetry('catch-reroll');
        recordRunEvent('catch-reroll', {
            reason,
            target: reroll.name,
            score: reroll.score === null ? null : Number(reroll.score.toFixed(1)),
            attemptsThisEncounter: catchRerollsThisEncounter,
            stateAttempts: signatureAttempts + 1,
            staleScoutRetry: signatureAttempts > 0 && canUseScoutStaleRetry
        });
        log('info', '🔄', `${reason}${weakestLabel}`);
        triggerRealClick(reroll.button);
        return true;
    }

    // --- CATCH SCREEN (Smart Drafting) ---
    function handleCatchScreen() {
        const team = parseTeamStatus();
        lockVisibleShinyTeamMembers(team, 'catch-screen');
        const openTeamSlot = hasOpenTeamSlot(team);
        if (!currentMapKey) syncMapCaptureState();
        const cards = document.querySelectorAll('#catch-choices .poke-card');
        const opponentProfile = detectNextOpponentProfile();
        const bossTypes = getCurrentCatchBossTypes();
        const earlyExpansionClosed = shouldStopEarlyExpansion(team, opponentProfile);
        const bossPrepStatus = getBossPrepStatus(team, opponentProfile);
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const teamAvgLevelBeforeCatch = getTeamAverageLevel(team);
        const expectedCatchCopies = getExpectedCatchCopiesFromOpenSlots(team);
        const shinyTacticActive = getBotControlTactic() === 'shiny';
        const effectiveCaptureCapReached = hasReachedMapCaptureCap() && !shinyTacticActive;
        const challengeStrategy = getChallengeStrategyContext(team, opponentProfile);
        const storyStrategy = getStoryStrategyContext(team, opponentProfile);

        if (cards.length === 0) {
            const skipBtn = document.getElementById('btn-skip-catch');
            if (skipBtn) {
                ensureRunTelemetry('catch-screen');
                recordRunEvent('catch-skip', { reason: 'no-cards', bossPrepStatus });
                triggerRealClick(skipBtn);
            }
            return;
        }

        if (hasReachedMapCaptureCap()) {
            log('debug', '🐾', `Capture cap reached (${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP}); scoring first in case this is a premium/legendary reward.`);
        }

        let bestCard = null;
        let bestScore = -999;
        let bestIsShiny = false;
        let bestName = '';
        let bestCandidate = null;
        let scoredCards = [];

        cards.forEach(card => {
            const learnedInfo = learnPokemonInfoFromCard(card, 'catch-card');
            const nameEl = card.querySelector('.poke-card-name, .poke-name, [class*="name"]');
            if (!nameEl && !learnedInfo?.name) return;
            const name = learnedInfo?.name || nameEl.innerText.toLowerCase().trim();
            let types = learnedInfo?.types?.length ? [...learnedInfo.types] : [...getKnownPokemonTypes(name)];

            // Try to read types from the card DOM if not in database
            if (types.length === 0) {
                const typeBadges = card.querySelectorAll('.type-badge, .poke-type, [class*="type"]');
                typeBadges.forEach(badge => {
                    const t = badge.innerText.trim();
                    if (TYPES.includes(t)) types.push(t);
                });
            }

            const isShiny = isPokemonElementShiny(card);
            const alreadyOwnedShiny = isAlreadyOwnedShinyCandidate(card, name);
            const isLegendary = isLegendaryPokemonName(name);

            const attackTypes = learnedInfo?.attackTypes?.length ? learnedInfo.attackTypes : getAttackTypesFromElement(card, types);
            const candidateLevel = learnedInfo?.level || parseLevelText(card.querySelector('.poke-level, .team-slot-lv, [class*="level"]')?.innerText || card.innerText || '');
            const bossMatchupScore = scoreCatchBossCounter(types, attackTypes, bossTypes);
            const grassSupportScore = getGrassSupportCatchScore(types, team);
            const duplicatePairScore = getDuplicatePairCatchScore(name, types, team, attackTypes, bossTypes, { expectedCatchCopies });
            const sinnohPassivePlanScore = storyStrategy.active ? 0 : scoreSinnohPassivePlanForTypes(types, team, { isShiny, opponentProfile });
            const sinnohPowerScore = storyStrategy.active ? 0 : scoreSinnohPowerCatchCandidate(name, types, team, {
                isShiny,
                attackTypes,
                level: candidateLevel,
                opponentProfile
            });
            const storyScore = scoreStoryCatchScoreBonus({
                name,
                types,
                attackTypes,
                isShiny,
                alreadyOwnedShiny,
                isLegendary,
                level: candidateLevel
            }, team, bossTypes, opponentProfile);
            const challengeScore = scoreChallengeCatchScoreBonus({
                name,
                types,
                attackTypes,
                isShiny,
                alreadyOwnedShiny,
                isLegendary,
                level: candidateLevel
            }, team, bossTypes, opponentProfile);
            let score = scoreCatchCandidate(name, types, team, isShiny, attackTypes, bossTypes, {
                expectedCatchCopies,
                level: candidateLevel,
                opponentProfile,
                alreadyOwnedShiny
            });
            score += sinnohPowerScore * 0.55;
            const tacticScore = getBotControlCatchScoreBonus({
                name,
                score,
                isShiny,
                alreadyOwnedShiny,
                isLegendary,
                types,
                attackTypes,
                bossMatchupScore,
                grassSupportScore,
                duplicatePairScore,
                sinnohPassivePlanScore,
                sinnohPowerScore
            }, team, bossTypes);
            score += tacticScore;
            score += scoreTraitPreviewFromCard(card);
            score += scorePokemonStats(learnedInfo?.currentStats || parseCardStats(card));
            const projectedAvgLevel = getProjectedAverageLevelAfterCatch(team, candidateLevel);
            const avgLevelDrop = projectedAvgLevel === null ? 0 : Math.max(0, teamAvgLevelBeforeCatch - projectedAvgLevel);
            const rerollButton = findRerollControlForCard(card);
            log('debug', '🔎', `Catch candidate: ${name} [${types.join('/')}] score=${score.toFixed(1)} reroll=${rerollButton ? 'yes' : 'no'}`);

            const candidate = {
                card,
                score,
                name,
                isShiny,
                alreadyOwnedShiny,
                isLegendary,
                rerollButton,
                types,
                attackTypes,
                bossMatchupScore,
                grassSupportScore,
                duplicatePairScore,
                sinnohPassivePlanScore,
                sinnohPowerScore,
                storyScore,
                challengeScore,
                tacticScore,
                level: candidateLevel || 0,
                projectedAvgLevel: projectedAvgLevel === null ? null : Number(projectedAvgLevel.toFixed(1)),
                avgLevelDrop: Number(avgLevelDrop.toFixed(1))
            };
            scoredCards.push(candidate);

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
                bestIsShiny = isShiny;
                bestName = name;
                bestCandidate = candidate;
            }
        });

        const earlyAllowance = getEarlyCatchAllowance(team, bestScore, bestIsShiny);
        const teamMaxLevel = Math.max(0, ...team.map(p => p.level || 0));
        const hasLowLevelForSwap = !openTeamSlot && team.some(p => (p.level || 0) < teamMaxLevel - 3);
        const bestIsLegendary = Boolean(bestCandidate?.isLegendary);
        const bestIsDuplicatePlan = Boolean(bestCandidate && bestCandidate.duplicatePairScore >= CONFIG.DUPLICATE_PAIR_PROTECT_SCORE);
        const bestIsPremiumCatch = Boolean(bestCandidate && isPremiumCatchCandidate(bestCandidate.score, bestCandidate.isShiny, bestCandidate.name));
        const bestIsExceptional = Boolean(bestCandidate && (bestCandidate.isShiny || bestIsLegendary || bestScore >= CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE));
        const bestIsDirectCounter = isDirectBossCounterCandidate(bestCandidate, bossTypes);
        const bestIsSinnohPowerPlan = Boolean(
            bestCandidate &&
            (bestCandidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE
        );
        const bestIsSinnohPassivePlan = Boolean(
            bestCandidate &&
            (
                (bestCandidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_CATCH_PROTECT_SCORE ||
                bestIsSinnohPowerPlan
            )
        );
        const bestIsStrongSinnohPassivePlan = Boolean(
            bestCandidate &&
            (
                (bestCandidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE ||
                (bestCandidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE
            )
        );
        const bestIsChallengePlan = Boolean(
            bestCandidate &&
            (bestCandidate.challengeScore || 0) >= CONFIG.CHALLENGE_CATCH_PROTECT_SCORE
        );
        const bestIsStoryPlan = Boolean(
            bestCandidate &&
            (bestCandidate.storyScore || 0) >= CONFIG.STORY_CATCH_PROTECT_SCORE
        );
        const bestIsBossRelevant = bestCandidate ? isBossRelevantCatchCandidate(bestCandidate, bossTypes) : false;
        const hasVisibleShiny = scoredCards.some(candidate => candidate.isShiny);
        const hasNewVisibleShiny = scoredCards.some(candidate => candidate.isShiny && !candidate.alreadyOwnedShiny);
        const challengeNeedsFirstShiny = Boolean(challengeStrategy.active && challengeStrategy.earlyShinyHunt);
        const allowShinyScoutInStory = !storyStrategy.active || shinyTacticActive;
        const earlyShinyScoutWindow = allowShinyScoutInStory && (isEarlyShinyRerollWindow(team) || challengeNeedsFirstShiny);
        const settledCatchWindow = isSettledCatchDecisionWindow(team);
        const bestWouldDiluteLevels = Boolean(
            bestCandidate &&
            earlyExpansionClosed &&
            bestCandidate.avgLevelDrop > CONFIG.EARLY_MAX_CATCH_AVG_LEVEL_DROP &&
            !bestIsExceptional &&
            !bestIsPremiumCatch &&
            !bestIsDirectCounter &&
            !bestIsSinnohPassivePlan &&
            !bestIsChallengePlan &&
            !bestIsStoryPlan
        );
        const recordCatchSkip = (skipReason) => {
            ensureRunTelemetry('catch-screen');
            recordRunEvent('catch-skip', {
                reason: skipReason,
                bestName: bestName || 'unknown',
                bestScore: Number(bestScore.toFixed(1)),
                bestLevel: bestCandidate?.level || 0,
                bestProjectedAvgLevel: bestCandidate?.projectedAvgLevel ?? null,
                bestAvgLevelDrop: bestCandidate?.avgLevelDrop || 0,
                bestTypes: bestCandidate?.types || [],
                bestAttackTypes: bestCandidate?.attackTypes || [],
                bestGrassSupportScore: bestCandidate?.grassSupportScore || 0,
                bestDuplicatePairScore: bestCandidate?.duplicatePairScore || 0,
                bestSinnohPassivePlanScore: bestCandidate?.sinnohPassivePlanScore || 0,
                bestSinnohPowerScore: bestCandidate?.sinnohPowerScore || 0,
                bestStoryScore: bestCandidate?.storyScore || 0,
                bestChallengeScore: bestCandidate?.challengeScore || 0,
                bestTacticScore: bestCandidate?.tacticScore || 0,
                bestIsShiny: Boolean(bestCandidate?.isShiny),
                bestAlreadyOwnedShiny: Boolean(bestCandidate?.alreadyOwnedShiny),
                hasVisibleShiny,
                hasNewVisibleShiny,
                shinyTacticActive,
                challengeStrategy: challengeStrategy.active ? {
                    earlyShinyHunt: challengeStrategy.earlyShinyHunt,
                    hasShiny: challengeStrategy.hasShiny,
                    carry: challengeStrategy.carry ? challengeStrategy.carry.name : null,
                    carryNeedsItem: challengeStrategy.carryNeedsItem,
                    needsCarryBuff: challengeStrategy.needsCarryBuff,
                    prepPressure: challengeStrategy.prepPressure
                } : null,
                storyStrategy: storyStrategy.active ? {
                    region: storyStrategy.region || null,
                    needsTeam: storyStrategy.needsTeam,
                    needsCoverage: storyStrategy.needsCoverage,
                    uncoveredLeagueTypes: storyStrategy.uncoveredLeagueTypes,
                    weakMemberCount: storyStrategy.weakMembers.length,
                    prepPressure: storyStrategy.prepPressure
                } : null,
                expectedCatchCopies,
                bossTypes,
                earlyExpansionClosed,
                bossPrepStatus,
                openTeamSlot,
                capturesThisMap,
                teamAvgLevelBeforeCatch: Number(teamAvgLevelBeforeCatch.toFixed(1)),
                isExceptional: bestIsExceptional,
                isLegendary: bestIsLegendary,
                isPremium: bestIsPremiumCatch,
                isDuplicatePlan: bestIsDuplicatePlan,
                isSinnohPowerPlan: bestIsSinnohPowerPlan,
                isSinnohPassivePlan: bestIsSinnohPassivePlan,
                isChallengePlan: bestIsChallengePlan,
                isStoryPlan: bestIsStoryPlan,
                isDirectCounter: bestIsDirectCounter
            });
            const skipBtn = document.getElementById('btn-skip-catch');
            if (skipBtn) triggerRealClick(skipBtn);
        };

        const bossPrepPressure = Math.max(0, (bossPrepStatus.avgDeficit || 0) + (bossPrepStatus.leadDeficit || 0));
        const canShinyScoutSafely = (shinyTacticActive || challengeNeedsFirstShiny) &&
            bossPrepPressure <= CONFIG.SHINY_TACTIC_SCOUT_PRESSURE_LIMIT;
        const canDelayStrongPlanForShiny = canShinyScoutSafely && !bestIsLegendary && !bestIsDirectCounter;
        const shouldHoldForShinyReroll = canShinyScoutSafely &&
            !hasVisibleShiny &&
            catchRerollsThisEncounter < CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER;

        const earlyShinyScoutTarget = Math.min(
            CONFIG.EARLY_SHINY_REROLL_ATTEMPTS,
            CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER
        );
        if (openTeamSlot &&
            earlyShinyScoutWindow &&
            !hasVisibleShiny &&
            !bestIsLegendary &&
            !bestIsDirectCounter &&
            !bestIsChallengePlan &&
            !bestIsStoryPlan &&
            catchRerollsThisEncounter < earlyShinyScoutTarget) {
            const scoutReason = `Early shiny scout ${catchRerollsThisEncounter + 1}/${earlyShinyScoutTarget}`;
            if (tryRerollCatchOptions(scoredCards, scoutReason, {
                allowStaleScoutRetry: true,
                scoutTarget: earlyShinyScoutTarget,
                allowProtectedGlobal: true,
                ignoreProtectedForReroll: true,
                preserveShiny: true
            })) {
                return;
            }
        }

        if (!openTeamSlot && effectiveCaptureCapReached && !shouldHoldForShinyReroll && !bestIsPremiumCatch && !bestIsDirectCounter && !bestIsSinnohPassivePlan && !bestIsChallengePlan && !bestIsStoryPlan && !hasLowLevelForSwap) {
            log('info', '🐾', `Skipping catch — map capture cap reached (${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP}) and best is not premium (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}).`);
            recordCatchSkip('map-capture-cap');
            return;
        }

        const scoutTarget = canShinyScoutSafely
            ? CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER
            : sinnohTraining.active
            ? Math.min(CONFIG.SINNOH_CATCH_SCOUT_ATTEMPTS, CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER)
            : Math.min(CONFIG.CATCH_REROLL_MIN_ATTEMPTS_PER_ENCOUNTER, CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER);
        const shouldScoutMore = openTeamSlot &&
            allowShinyScoutInStory &&
            catchRerollsThisEncounter < scoutTarget &&
            !hasVisibleShiny &&
            !bestIsLegendary &&
            (!bestIsStrongSinnohPassivePlan || canDelayStrongPlanForShiny) &&
            !bestIsChallengePlan &&
            !bestIsStoryPlan;
        if (shouldScoutMore) {
            const scoutReason = `Reroll scout ${catchRerollsThisEncounter + 1}/${scoutTarget}`;
            if (tryRerollCatchOptions(scoredCards, scoutReason, {
                allowStaleScoutRetry: true,
                scoutTarget,
                preserveShiny: true,
                ignoreProtectedForReroll: canDelayStrongPlanForShiny && !bestIsChallengePlan && !bestIsStoryPlan
            })) {
                return; // Scout the refreshed choices before committing a team slot.
            }
        }

        const rerollReason = getCatchRerollReason(team, bestScore, bestIsShiny, earlyAllowance, scoredCards, opponentProfile);
        if (rerollReason && tryRerollCatchOptions(scoredCards, rerollReason)) {
            return; // Settle and let the next loop score the refreshed choices.
        }

        const catchDraftDecision = EasyPokelikeStrategyUtils.decideCatchDraftAction({
            openTeamSlot,
            bestScore,
            bestCandidate,
            hasVisibleShiny,
            earlyShinyScoutWindow,
            settledCatchWindow,
            sinnohTrainingActive: sinnohTraining.active,
            aliveCount: getAliveTeam(team).length,
            shouldBuildCoreTeam: shouldBuildCoreTeam(team),
            earlyExpansionClosed,
            effectiveCaptureCapReached,
            shouldPrioritizeTraining: shouldPrioritizeEarlyTraining(team, opponentProfile),
            hasLowLevelForSwap,
            teamMaxLevel,
            earlyAllowance,
            bestIsPremiumCatch,
            bestIsExceptional,
            bestIsDirectCounter,
            bestIsDuplicatePlan,
            bestIsSinnohPassivePlan,
            bestIsChallengePlan,
            bestIsStoryPlan,
            bestIsBossRelevant,
            bestWouldDiluteLevels,
            config: {
                earlyNonShinyMinAcceptScore: CONFIG.EARLY_NON_SHINY_MIN_ACCEPT_SCORE,
                settledCatchMinAcceptScore: CONFIG.SETTLED_CATCH_MIN_ACCEPT_SCORE,
                sinnohTrainingCoreTeamSize: CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE,
                earlyOptionalTeamSize: CONFIG.EARLY_OPTIONAL_TEAM_SIZE,
                catchRerollMinAcceptScore: CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE,
                earlyExceptionalCatchScore: CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE,
                earlyLowLevelSwapGap: CONFIG.EARLY_LOW_LEVEL_SWAP_GAP
            }
        });

        if (catchDraftDecision.action === 'skip') {
            const swapLevelText = catchDraftDecision.details.minUsefulSwapLevel
                ? ` | min useful swap level: ${catchDraftDecision.details.minUsefulSwapLevel}`
                : '';
            log('info', 'ðŸ¾', `Skipping catch (${catchDraftDecision.reason}) â€” best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}${swapLevelText}`);
            recordCatchSkip(catchDraftDecision.reason);
            return;
        }

        if (openTeamSlot &&
            earlyShinyScoutWindow &&
            !hasVisibleShiny &&
            bestCandidate &&
            bestScore < CONFIG.EARLY_NON_SHINY_MIN_ACCEPT_SCORE &&
            !bestIsPremiumCatch &&
            !bestIsExceptional &&
            !bestIsDirectCounter &&
            !bestIsSinnohPassivePlan &&
            !bestIsChallengePlan &&
            !bestIsStoryPlan) {
            log('info', '🐾', `Skipping early non-shiny low-value catch after scouting — best: ${bestName || 'unknown'} ${bestScore.toFixed(1)} below ${CONFIG.EARLY_NON_SHINY_MIN_ACCEPT_SCORE}.`);
            recordCatchSkip('early-non-shiny-low-value');
            return;
        }

        if (openTeamSlot &&
            settledCatchWindow &&
            bestCandidate &&
            bestScore < CONFIG.SETTLED_CATCH_MIN_ACCEPT_SCORE &&
            !bestIsPremiumCatch &&
            !bestIsExceptional &&
            !bestIsDirectCounter &&
            !bestIsDuplicatePlan &&
            !bestIsSinnohPassivePlan &&
            !bestIsChallengePlan &&
            !bestIsStoryPlan) {
            log('info', '🐾', `Skipping settled-run low-value catch — best: ${bestName || 'unknown'} ${bestScore.toFixed(1)} below ${CONFIG.SETTLED_CATCH_MIN_ACCEPT_SCORE}.`);
            recordCatchSkip('settled-run-low-value');
            return;
        }

        if (sinnohTraining.active &&
            getAliveTeam(team).length >= CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE &&
            !bestIsPremiumCatch &&
            !bestIsExceptional &&
            !bestIsDirectCounter &&
            !bestIsSinnohPassivePlan &&
            !bestIsChallengePlan &&
            !bestIsStoryPlan) {
            log('info', 'sinnoh', `Skipping catch for Sinnoh carry training - XP/MT/passive plan have priority (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}).`);
            recordCatchSkip('sinnoh-carry-training');
            return;
        }

        if (openTeamSlot && bestCandidate && !shouldBuildCoreTeam(team)) {
            const isExceptional = bestIsExceptional;
            const isPremium = bestIsPremiumCatch;
            const isDuplicatePlan = bestIsDuplicatePlan;
            const isSinnohPassivePlan = bestIsSinnohPassivePlan;
            const isChallengePlan = bestIsChallengePlan;
            const isStoryPlan = bestIsStoryPlan;
            const isBossRelevant = isBossRelevantCatchCandidate(bestCandidate, bossTypes);
            const isDirectCounter = bestIsDirectCounter;
            const fillingEarlyRoster = getAliveTeam(team).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE &&
                                       bestScore >= CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE;
            const goodGeneralValue = !earlyExpansionClosed &&
                                     !shouldPrioritizeEarlyTraining(team, opponentProfile) &&
                                     !effectiveCaptureCapReached &&
                                     bestScore >= CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE;
            const shouldAcceptRosterFill = fillingEarlyRoster && (!effectiveCaptureCapReached || isPremium || bestScore >= CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE);
            const canBreakEarlyRosterCap = !earlyExpansionClosed || isExceptional || isPremium || isDirectCounter || isDuplicatePlan || isSinnohPassivePlan || isChallengePlan || isStoryPlan;

            if (bestWouldDiluteLevels || !canBreakEarlyRosterCap || (!isPremium && !isBossRelevant && !goodGeneralValue && !shouldAcceptRosterFill && !isExceptional && !isDirectCounter && !isDuplicatePlan && !isSinnohPassivePlan && !isChallengePlan && !isStoryPlan)) {
                const skipReason = bestWouldDiluteLevels
                    ? 'would dilute levels'
                    : earlyExpansionClosed && !isExceptional && !isPremium && !isDirectCounter && !isDuplicatePlan && !isSinnohPassivePlan && !isChallengePlan && !isStoryPlan
                    ? 'early roster closed'
                    : effectiveCaptureCapReached
                    ? 'already caught this map'
                    : shouldPrioritizeEarlyTraining(team, opponentProfile)
                        ? 'leveling focus'
                        : 'no strong boss value';
                log('info', '🐾', `Skipping catch for ${skipReason} — best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}`);
                recordCatchSkip(skipReason);
                return;
            }
        }

        if (!openTeamSlot && hasLowLevelForSwap && bestCandidate?.level) {
            const minUsefulSwapLevel = Math.max(1, teamMaxLevel - CONFIG.EARLY_LOW_LEVEL_SWAP_GAP);
            if (bestCandidate.level < minUsefulSwapLevel && !bestIsPremiumCatch && !bestIsExceptional && !bestIsDirectCounter && !bestIsSinnohPassivePlan && !bestIsChallengePlan && !bestIsStoryPlan) {
                log('info', '🐾', `Skipping catch — replacement too low level (${bestCandidate.level} < ${minUsefulSwapLevel}).`);
                recordCatchSkip('replacement-too-low-level');
                return;
            }
        }

        if (!openTeamSlot && earlyAllowance === 'skip' && !hasLowLevelForSwap && !bestIsPremiumCatch && !bestIsSinnohPassivePlan && !bestIsChallengePlan && !bestIsStoryPlan) {
            log('info', '🐾', `Skipping catch for XP focus — core team needs levels (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)})`);
            recordCatchSkip('xp-focus');
            return;
        }

        // If team is full (6) and no candidate scores well, skip
        if (!openTeamSlot && bestScore < 2 && !hasLowLevelForSwap && !bestIsPremiumCatch && !bestIsSinnohPassivePlan && !bestIsChallengePlan && !bestIsStoryPlan) {
            log('info', '🐾', `Skipping catch — no good candidates (best: ${bestScore.toFixed(1)})`);
            recordCatchSkip('weak-candidate');
            return;
        }

        if (bestCard) {
            const catchReason = bestCandidate?.isShiny && !bestCandidate.alreadyOwnedShiny
                ? 'Catching new shiny target'
                : bestCandidate?.isShiny
                ? 'Catching owned shiny target'
                : bestIsLegendary
                ? 'Catching legendary/masterball reward'
                : bestIsDuplicatePlan
                ? 'Catching duplicate-pair target'
                : bestIsSinnohPowerPlan
                ? 'Catching Sinnoh run-power target'
                : bestIsSinnohPassivePlan
                ? 'Catching Sinnoh passive-plan target'
                : bestIsChallengePlan
                ? 'Catching challenge-plan target'
                : bestIsStoryPlan
                ? 'Catching story-league target'
                : (openTeamSlot ? 'Catching useful open-slot target' : 'Catching Pokemon');
            ensureRunTelemetry('catch-screen');
            recordRunEvent('catch-decision', {
                action: 'catch',
                reason: catchReason,
                name: bestName || 'unknown',
                score: Number(bestScore.toFixed(1)),
                types: bestCandidate?.types || [],
                attackTypes: bestCandidate?.attackTypes || [],
                bossTypes,
                grassSupportScore: bestCandidate?.grassSupportScore || 0,
                duplicatePairScore: bestCandidate?.duplicatePairScore || 0,
                sinnohPassivePlanScore: bestCandidate?.sinnohPassivePlanScore || 0,
                sinnohPowerScore: bestCandidate?.sinnohPowerScore || 0,
                storyScore: bestCandidate?.storyScore || 0,
                challengeScore: bestCandidate?.challengeScore || 0,
                tacticScore: bestCandidate?.tacticScore || 0,
                isShiny: Boolean(bestCandidate?.isShiny),
                alreadyOwnedShiny: Boolean(bestCandidate?.alreadyOwnedShiny),
                hasVisibleShiny,
                hasNewVisibleShiny,
                shinyTacticActive,
                expectedCatchCopies,
                level: bestCandidate?.level || 0,
                projectedAvgLevel: bestCandidate?.projectedAvgLevel ?? null,
                avgLevelDrop: bestCandidate?.avgLevelDrop || 0,
                earlyExpansionClosed,
                bossPrepStatus,
                isExceptional: bestIsExceptional,
                isLegendary: bestIsLegendary,
                isPremium: bestIsPremiumCatch,
                isDuplicatePlan: bestIsDuplicatePlan,
                isSinnohPowerPlan: bestIsSinnohPowerPlan,
                isSinnohPassivePlan: bestIsSinnohPassivePlan,
                isChallengePlan: bestIsChallengePlan,
                isStoryPlan: bestIsStoryPlan,
                isDirectCounter: bestIsDirectCounter,
                challengeStrategy: challengeStrategy.active ? {
                    earlyShinyHunt: challengeStrategy.earlyShinyHunt,
                    hasShiny: challengeStrategy.hasShiny,
                    carry: challengeStrategy.carry ? challengeStrategy.carry.name : null,
                    carryNeedsItem: challengeStrategy.carryNeedsItem,
                    needsCarryBuff: challengeStrategy.needsCarryBuff,
                    prepPressure: challengeStrategy.prepPressure
                } : null,
                storyStrategy: storyStrategy.active ? {
                    region: storyStrategy.region || null,
                    needsTeam: storyStrategy.needsTeam,
                    needsCoverage: storyStrategy.needsCoverage,
                    uncoveredLeagueTypes: storyStrategy.uncoveredLeagueTypes,
                    weakMemberCount: storyStrategy.weakMembers.length,
                    prepPressure: storyStrategy.prepPressure
                } : null,
                teamAvgLevelBeforeCatch: Number(teamAvgLevelBeforeCatch.toFixed(1)),
                openTeamSlot,
                capturesThisMap,
                duplicateCatchesEnabled: getBotControlDuplicateCatchesEnabled(),
                duplicatePriorityCatchNodesTaken,
                duplicatePriorityCatchNodeLimit: CONFIG.DUPLICATE_PRIORITY_CATCH_NODE_LIMIT,
                duplicatePriorityCatchWindow: canUseDuplicatePriorityCatchNode(team)
            });
            log('info', '🐾', `${catchReason} (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)})`);
            const duplicateCatchesEnabled = getBotControlDuplicateCatchesEnabled();
            triggerRealClick(bestCard, { singleTarget: !duplicateCatchesEnabled });
            const countedCopies = duplicateCatchesEnabled ? Math.max(1, expectedCatchCopies || 1) : 1;
            capturesThisMap += countedCopies;
            engineStats.catches += countedCopies;
            if (isDuplicatePriorityMode() && duplicateCatchesEnabled && countedCopies > 1) {
                duplicatePriorityCatchNodesTaken = Math.min(
                    CONFIG.DUPLICATE_PRIORITY_CATCH_NODE_LIMIT,
                    duplicatePriorityCatchNodesTaken + 1
                );
            }
        }
    }

    // --- ITEM SCREEN (Ranked Selection) ---
    function handleItemScreen() {
        const cards = document.querySelectorAll('#item-choices .item-card');
        if (cards.length === 0) return;

        const team = parseTeamStatus();
        const opponentProfile = detectNextOpponentProfile();
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
        const bossType = opponentProfile || (bossTypes.length > 0 ? bossTypes : null);
        let bestCard = null;
        let bestScore = Number.NEGATIVE_INFINITY;
        let bestItemName = '';

        cards.forEach(card => {
            const name = getItemNameFromElement(card);
            if (!name) return;
            if (isItemOnBagCooldown(name) || isItemAssignmentBlocked(name, team, bossType)) return;
            const tier = ITEM_TIERS[name] || 'D';
            const canUseNow = shouldEquipBagItem(name, team, bossType);
            const score = scoreItemForTeam(name, team, bossType) + (canUseNow ? 0 : -260);

            log('debug', '🎒', `Item: ${name} → Tier ${tier} (${score})`);

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
                bestItemName = name;
            }
        });

        if (bestCard) {
            lastChosenItemName = bestItemName;
            ensureRunTelemetry('item-screen');
            recordRunEvent('item-choice', {
                item: bestItemName,
                score: Number(bestScore.toFixed(1)),
                opponent: compactOpponentProfile(opponentProfile),
                team: compactTeamSnapshot(team, bossType)
            });
            log('info', '🎒', `Picking item (score: ${bestScore})`);
            triggerRealClick(bestCard);
            engineStats.items++;
        } else {
            const exit = findItemChoiceExitControl();
            if (exit) {
                log('warn', 'item', 'No unblocked item choice left; continuing without reselecting a bagged item.');
                triggerRealClick(exit);
            } else {
                log('warn', 'item', 'No unblocked item choice left and no skip/continue control found.');
            }
        }
    }

    // --- PASSIVE SCREEN (Battle Tower passive items) ---
    function isSelectablePassiveCard(card) {
        if (!card || !isVisible(card) || isLockedChoice(card)) return false;
        if (card.querySelector('.starting-item-lock, .choice-lock, .item-lock, [data-locked="true"]')) return false;
        const style = window.getComputedStyle(card);
        if (style.pointerEvents === 'none') return false;

        const choices = card.closest('#passive-choices');
        const tagText = foldText(card.querySelector('.item-tag, .passive-tag, [class*="tag"]')?.innerText || '');
        if (choices?.classList.contains('is-replace-grid')) {
            return tagText.includes('replace') || style.cursor === 'pointer';
        }

        return style.cursor !== 'default';
    }

    function handlePassiveScreen() {
        const allCards = Array.from(document.querySelectorAll('#passive-choices .item-card, #passive-choices .passive-card'));
        const cards = allCards.filter(isSelectablePassiveCard);
        if (allCards.length > 0 && cards.length < allCards.length) {
            log('debug', '🧩', `Ignoring ${allCards.length - cards.length} locked/unavailable passive choice(s).`);
        }
        if (cards.length === 0) {
            const skipBtn = document.querySelector('#passive-choices .choice-skip-btn, #passive-choices button');
            if (skipBtn && isEnabledActionControl(skipBtn)) {
                log('warn', '🧩', 'No selectable passive choices found. Skipping passive choice.');
                triggerRealClick(skipBtn);
            }
            return;
        }

        const team = parseTeamStatus();
        const opponentProfile = detectNextOpponentProfile();
        const teamProfile = getPassiveTeamProfile(team, opponentProfile);
        const challengeStrategy = getChallengeStrategyContext(team, opponentProfile);
        let bestCard = null;
        let bestScore = -1;

        cards.forEach(card => {
            const score = scorePassiveCard(card, team, opponentProfile);

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        });

        log('info', '🧩', `Picking passive (score: ${bestScore.toFixed(1)})`);
        ensureRunTelemetry('passive-screen');
        recordRunEvent('passive-choice', {
            choice: (bestCard?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100),
            score: Number(bestScore.toFixed(1)),
            opponent: compactOpponentProfile(opponentProfile),
            teamTypes: getTeamTypes(team),
            hasShiny: teamProfile.hasShiny,
            weakCore: teamProfile.weakCore,
            bossCoveragePoor: teamProfile.bossCoveragePoor,
            uncoveredBossTypes: teamProfile.uncoveredBossTypes,
            bestBst: teamProfile.bestBst,
            challengeStrategy: challengeStrategy.active ? {
                carry: challengeStrategy.carry ? challengeStrategy.carry.name : null,
                hasShiny: challengeStrategy.hasShiny,
                earlyShinyHunt: challengeStrategy.earlyShinyHunt,
                carryNeedsItem: challengeStrategy.carryNeedsItem,
                needsCarryBuff: challengeStrategy.needsCarryBuff,
                prepPressure: challengeStrategy.prepPressure
            } : null
        });
        triggerRealClick(bestCard || cards[0]);
    }

    // --- ITEM EQUIP MODAL ---
    function handleItemEquipModal() {
        const modal = getActiveItemModal();
        if (!modal) return;

        const rows = getItemModalTargetRows(modal);
        const team = parseTeamStatus();
        let isUsableModal = modal.id === 'usable-item-modal' || USABLE_ITEMS.has(normalizeItemName(lastChosenItemName || ''));

        // Some item modals title themselves "Choose Pokemon"; prefer the actual item image/name.
        const pendingItemName = lastChosenItemName;
        let equipItemName = getItemNameFromModal(modal, pendingItemName);
        lastChosenItemName = '';
        isUsableModal = isUsableModal || USABLE_ITEMS.has(equipItemName);

        const equipItemTier = ITEM_TIERS[equipItemName] || 'D';
        const equipItemScore = TIER_SCORE[equipItemTier] || 10;
        const bossTypes = detectBossTypes();
        const bossType = bossTypes.length > 0 ? bossTypes : null;
        const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
        const challengeStrategy = getChallengeStrategyContext(team, bossType);

        log('info', '🎒', `${isUsableModal ? 'Using' : 'Equipping'} item: [${equipItemName}] (Tier ${equipItemTier}, Score ${equipItemScore})`);

        if (!equipItemName) {
            closeUnavailableItemModal(modal, equipItemName, 'unknown-item-modal', { preferBag: !isUsableModal, team, bossType });
            return;
        }

        if (rows.length === 0) {
            if (equipItemName === 'tm normal') {
                closeUnavailableItemModal(modal, equipItemName, 'move-tutor-no-visible-targets', { preferBag: false, team, bossType });
            } else {
                closeUnavailableItemModal(modal, equipItemName, 'item-no-visible-targets', { preferBag: !isUsableModal, team, bossType });
            }
            return;
        }

        if (!isUsableModal && isLowValueHeldItem(equipItemName)) {
            closeUnavailableItemModal(modal, equipItemName, 'low-value-held-item', { preferBag: true, team, bossType });
            return;
        }

        let candidates = rows.map((row, rowPosition) => {
            const rowIndex = Number.parseInt(
                row.getAttribute('data-idx') ??
                row.getAttribute('data-team-index') ??
                row.getAttribute('data-pokemon-index'),
                10
            );
            const teamIdx = Number.isNaN(rowIndex) ? rowPosition : rowIndex;
            const unit = team[teamIdx] || parseModalRowUnit(row, teamIdx);
            return {
                row,
                target: getPokemonRowActionTarget(row, { allowPokemonRow: true }),
                teamIdx,
                unit
            };
        }).filter(candidate => {
            if (!candidate.target || !candidate.unit) return false;
            if (isUsableModal && equipItemName === 'sacred ash') return candidate.unit.isFainted;
            return !candidate.unit.isFainted;
        });

        if (equipItemName === 'tm normal') {
            candidates = candidates
                .map(candidate => ({
                    ...candidate,
                    tutorStatus: getMoveTutorTargetStatus(candidate, sinnohTraining, challengeStrategy)
                }))
                .filter(candidate => candidate.tutorStatus.canTutor);

            if (candidates.length === 0) {
                closeUnavailableItemModal(modal, equipItemName, 'move-tutor-no-valid-target-after-max', { preferBag: false, team, bossType });
                return;
            }
        }

        if (candidates.length === 0) {
            closeUnavailableItemModal(modal, equipItemName, 'no-valid-item-target', { preferBag: !isUsableModal, team, bossType });
            return;
        }

        const boostType = getItemBoostType(equipItemName);
        if (!isUsableModal && boostType && !candidates.some(candidate => hasMatchingAttackForItem(candidate.unit, equipItemName))) {
            closeUnavailableItemModal(modal, equipItemName, `no-${boostType}-attacker`, { preferBag: true, team, bossType });
            return;
        }

        // Find the best candidate unit to equip this item to:
        // - Priority 1: Alive units with NO item currently equipped (to fill slots first)
        // - Priority 2: Swap/replace if the new item is better than their current item
        let bestCandidate = null;
        let bestTargetScore = Number.NEGATIVE_INFINITY;
        const teamMainCarry = getMainCarry(team);
        const itemIsCarryPreferred = !isUsableModal && isMainCarryPreferredHeldItem(equipItemName);
        const mainCarryWouldLikeItem = Boolean(
            teamMainCarry &&
            itemIsCarryPreferred &&
            (
                !teamMainCarry.heldItem ||
                !isMainCarryPreferredHeldItem(teamMainCarry.heldItem) ||
                scoreHeldItemForPokemon(teamMainCarry, equipItemName, bossType) >
                    scoreHeldItemForPokemon(teamMainCarry, teamMainCarry.heldItem, bossType) + 8
            )
        );

        candidates.forEach(candidate => {
            const p = candidate.unit;

            let score = p.hp / 20 + getPokemonCarryScore(p) / 8;
            const candidateIsMainCarry = isMainCarryUnit(p);
            const mainCarryHealingLock = !isUsableModal &&
                                         candidateIsMainCarry &&
                                         p.heldItem &&
                                         isHealingItem(p.heldItem) &&
                                         !isMainCarryPreferredHeldItem(equipItemName);
            const healingUpgradeForCarry = !isUsableModal &&
                                           candidateIsMainCarry &&
                                           isHealingItem(equipItemName) &&
                                           (!p.heldItem || !isHealingItem(p.heldItem));
            if (mainCarryWouldLikeItem) {
                score += candidateIsMainCarry
                    ? CONFIG.MAIN_CARRY_ITEM_RESERVE_BONUS
                    : -CONFIG.MAIN_CARRY_ITEM_RESERVE_PENALTY;
            }

            if (isUsableModal) {
                // For consumables, the game decides valid targets via disabled rows.
                score += scoreConsumableTarget(p, equipItemName);
                if (equipItemName === 'tm normal') {
                    const tutorStatus = candidate.tutorStatus || getMoveTutorTargetStatus(candidate, sinnohTraining, challengeStrategy);
                    if (!tutorStatus.canTutor || tutorStatus.confirmedMax) {
                        score -= 99999;
                    } else {
                        const knownGap = tutorStatus.tier >= 0
                            ? Math.max(0, tutorStatus.targetTier - tutorStatus.tier)
                            : 0;
                        score += knownGap > 0 ? knownGap * 520 : 160;
                        score += getPokemonCarryScore(p) / 3;
                        score += Math.max(0, 6 - candidate.teamIdx) * 2;
                        if (tutorStatus.needsTutor) score += 900;
                        if (tutorStatus.reason === 'known-low-tier') score += 260;
                        if (tutorStatus.reason === 'unknown-fallback') score += 80;
                        if (tutorStatus.isPreferredCarry) score += tutorStatus.needsTutor ? 1200 : 120;
                    }
                }
                if (challengeStrategy.active && challengeStrategy.carry) {
                    const isChallengeCarryTarget = candidate.teamIdx === challengeStrategy.carry.index ||
                        getPokemonIdentityKey(p.name) === getPokemonIdentityKey(challengeStrategy.carry.name);
                    if (['tm normal', 'rare candy'].includes(equipItemName)) {
                        score += isChallengeCarryTarget ? 190 : -70;
                    }
                    if (equipItemName === 'moon stone' && !isChallengeCarryTarget) score -= 35;
                }
                if ((equipItemName === 'tm normal' || equipItemName === 'rare candy') && sinnohTraining.active) {
                    const isCarryTarget = Boolean(
                        sinnohTraining.carry &&
                        (
                            candidate.teamIdx === sinnohTraining.carry.index ||
                            getPokemonIdentityKey(p.name) === sinnohTraining.carryKey
                        )
                    );
                    if (equipItemName === 'tm normal') {
                        if (sinnohTraining.needsTm) {
                            score += isCarryTarget ? CONFIG.SINNOH_TM_TARGET_BONUS : -CONFIG.SINNOH_NON_CARRY_TM_TARGET_PENALTY;
                        } else {
                            score += isCarryTarget ? -CONFIG.SINNOH_NON_CARRY_TM_TARGET_PENALTY : 60;
                        }
                    } else {
                        score += isCarryTarget ? CONFIG.SINNOH_TM_TARGET_BONUS : -CONFIG.SINNOH_NON_CARRY_TM_TARGET_PENALTY;
                    }
                }
            } else if (!p.heldItem) {
                const newScore = scoreHeldItemForPokemon(p, equipItemName, bossType);
                score += newScore;
                if (challengeStrategy.active && challengeStrategy.carry) {
                    const isChallengeCarryTarget = candidate.teamIdx === challengeStrategy.carry.index ||
                        getPokemonIdentityKey(p.name) === getPokemonIdentityKey(challengeStrategy.carry.name);
                    if (isChallengeCarryTarget && isMainCarryPreferredHeldItem(equipItemName)) score += 170;
                    else if (challengeStrategy.carryNeedsItem && isMainCarryPreferredHeldItem(equipItemName)) score -= 90;
                }
                if (healingUpgradeForCarry) score += CONFIG.MAIN_CARRY_HEAL_KEEP_MARGIN;
                if (boostType && !hasMatchingAttackForItem(p, equipItemName)) score -= 220;
                if (candidate.teamIdx === 0 && newScore > 0) score += 35; // Keep the first fighter itemized when possible.
                if (newScore > 20) score += 45; // Fill empty slots only when the item actually helps.
            } else {
                const currentScore = scoreHeldItemForPokemon(p, p.heldItem, bossType);
                const newScore = scoreHeldItemForPokemon(p, equipItemName, bossType);
                
                if (mainCarryHealingLock) {
                    score -= 500;
                } else if (healingUpgradeForCarry || newScore > currentScore + 12) {
                    score += newScore - currentScore; // Upgrade value
                    if (healingUpgradeForCarry) score += CONFIG.MAIN_CARRY_HEAL_KEEP_MARGIN;
                } else {
                    score -= 150; // Heavy penalty for downgrades/sidegrades
                }
                if (challengeStrategy.active && challengeStrategy.carry) {
                    const isChallengeCarryTarget = candidate.teamIdx === challengeStrategy.carry.index ||
                        getPokemonIdentityKey(p.name) === getPokemonIdentityKey(challengeStrategy.carry.name);
                    if (isChallengeCarryTarget && isMainCarryPreferredHeldItem(equipItemName) && newScore > currentScore + 4) score += 150;
                    else if (!isChallengeCarryTarget && challengeStrategy.carryNeedsItem && isMainCarryPreferredHeldItem(equipItemName)) score -= 110;
                }
            }

            if (score > bestTargetScore) {
                bestTargetScore = score;
                bestCandidate = candidate;
            }
        });

        // Decide: equip or send to bag (if it's a downgrade for all current holders)
        if (bestCandidate) {
            const targetUnit = bestCandidate.unit;
            const currentScore = targetUnit.heldItem ? scoreHeldItemForPokemon(targetUnit, targetUnit.heldItem, bossType) : 0;
            const newTargetScore = scoreHeldItemForPokemon(targetUnit, equipItemName, bossType);

            if (!isUsableModal &&
                isMainCarryUnit(targetUnit) &&
                targetUnit.heldItem &&
                isHealingItem(targetUnit.heldItem) &&
                !isMainCarryPreferredHeldItem(equipItemName)) {
                closeUnavailableItemModal(modal, equipItemName, 'main-carry-healing-item-locked', { preferBag: true, team, bossType });
                return;
            }
            
            if (!isUsableModal && !targetUnit.heldItem && newTargetScore <= 10) {
                closeUnavailableItemModal(modal, equipItemName, 'not-useful-for-empty-slot', { preferBag: true, team, bossType });
                return;
            }

            if (!isUsableModal && targetUnit.heldItem && newTargetScore <= currentScore + 12) {
                closeUnavailableItemModal(modal, equipItemName, 'not-an-upgrade', { preferBag: true, team, bossType });
                return;
            }
            
            log('info', '🎒', `${isUsableModal ? 'Using' : 'Assigning'} [${equipItemName}] on [${targetUnit.name}] (Replacing: [${targetUnit.heldItem || 'none'}])`);
            const targetIsSinnohCarry = Boolean(
                isUsableModal &&
                equipItemName === 'tm normal' &&
                sinnohTraining.active &&
                sinnohTraining.carry &&
                (
                    bestCandidate.teamIdx === sinnohTraining.carry.index ||
                    getPokemonIdentityKey(targetUnit.name) === sinnohTraining.carryKey
                )
            );
            if (targetIsSinnohCarry && sinnohTraining.carryKey) {
                const nextTier = Math.min(
                    CONFIG.SINNOH_TM_MAX_MOVE_TIER,
                    Math.max(sinnohTraining.carryMoveTier, -1) + 1
                );
                sinnohCarryKnownTmTiers[sinnohTraining.carryKey] = nextTier;
            }
            recordRunEvent('item-target', {
                item: equipItemName,
                action: isUsableModal ? 'use' : 'equip',
                target: targetUnit.name,
                targetIndex: bestCandidate.teamIdx,
                targetScore: Number(bestTargetScore.toFixed(1)),
                moveTutor: equipItemName === 'tm normal' && bestCandidate.tutorStatus ? {
                    tier: bestCandidate.tutorStatus.tier,
                    targetTier: bestCandidate.tutorStatus.targetTier,
                    reason: bestCandidate.tutorStatus.reason
                } : null,
                sinnohTraining: sinnohTraining.active ? {
                    carry: sinnohTraining.carry ? sinnohTraining.carry.name : null,
                    carryMoveTier: sinnohTraining.carryMoveTier,
                    observedCarryMoveTier: sinnohTraining.observedCarryMoveTier,
                    rememberedCarryMoveTier: sinnohTraining.carryKey ? (sinnohCarryKnownTmTiers[sinnohTraining.carryKey] ?? sinnohTraining.rememberedCarryMoveTier) : null,
                    needsTm: sinnohTraining.needsTm,
                    needsOffense: sinnohTraining.needsOffense,
                    needsSpeed: sinnohTraining.needsSpeed,
                    targetIsCarry: targetIsSinnohCarry
                } : null,
                challengeStrategy: challengeStrategy.active ? {
                    carry: challengeStrategy.carry ? challengeStrategy.carry.name : null,
                    carryNeedsItem: challengeStrategy.carryNeedsItem,
                    needsCarryBuff: challengeStrategy.needsCarryBuff,
                    prepPressure: challengeStrategy.prepPressure,
                    targetIsCarry: Boolean(
                        challengeStrategy.carry &&
                        (
                            bestCandidate.teamIdx === challengeStrategy.carry.index ||
                            getPokemonIdentityKey(targetUnit.name) === getPokemonIdentityKey(challengeStrategy.carry.name)
                        )
                    )
                } : null
            });
            triggerRealClick(bestCandidate.target);
            return;
        }

        // Fallback
        const firstTarget = candidates[0].target;
        if (firstTarget) triggerRealClick(firstTarget);
    }

    // --- EVOLUTION OVERLAY ---
    function handleEvoOverlay() {
        const overlay = document.getElementById('evo-overlay');
        if (overlay) triggerRealClick(overlay);
    }

    // --- EEVEE CHOICE OVERLAY ---
    function handleEeveeChoice() {
        const overlay = document.getElementById('eevee-choice-overlay');
        if (!overlay) return;

        const choices = overlay.querySelectorAll('#eevee-choices > *');
        if (choices.length === 0) return;

        // If user has a specific preference, use it
        if (CONFIG.EEVEE_EVOLUTION_PREFERENCE !== 'auto') {
            const pref = CONFIG.EEVEE_EVOLUTION_PREFERENCE.toLowerCase();
            for (const choice of choices) {
                if (choice.innerText.toLowerCase().includes(pref)) {
                    log('info', '🦊', `Eevee → ${CONFIG.EEVEE_EVOLUTION_PREFERENCE} (user preference)`);
                    triggerRealClick(choice);
                    return;
                }
            }
        }

        // Auto mode: pick based on team needs
        const team = parseTeamStatus();
        const teamTypes = getTeamTypes(team);
        const traitCounts = getTeamTraitCounts(team);

        let bestChoice = null;
        let bestScore = -999;

        choices.forEach(choice => {
            const text = choice.innerText.toLowerCase().trim();
            let evoName = null;
            let evoType = null;

            for (const [name, type] of Object.entries(EEVEE_EVOLUTIONS)) {
                if (text.includes(name.toLowerCase())) {
                    evoName = name;
                    evoType = type;
                    break;
                }
            }

            if (!evoType) return;

            let score = 0;

            // Trait synergy
            const traitInfo = TRAIT_DATA[evoType];
            if (traitInfo) {
                const tierVal = TRAIT_TIER_VALUE[traitInfo.tier] || 1;
                const current = traitCounts[evoType] || 0;
                if (current === 1 || current === 3 || current === 5) score += tierVal * 3;
                else score += tierVal;
            }

            // Type coverage gap fill
            if (!teamTypes.includes(evoType)) score += 8;

            // Boss counter
            const bossTypes = detectBossTypes();
            if (bossTypes.length > 0) {
                score += getAttackCoverageScore([evoType], bossTypes) * 2;
            }

            log('debug', '🦊', `Eevee option: ${evoName} (${evoType}) score=${score}`);

            if (score > bestScore) {
                bestScore = score;
                bestChoice = choice;
            }
        });

        if (bestChoice) {
            log('info', '🦊', `Eevee evolution chosen (score: ${bestScore})`);
            triggerRealClick(bestChoice);
        } else {
            triggerRealClick(choices[0]);
        }
    }

    // --- SWAP SCREEN ---
    function handleSwapScreen() {
        const team = parseTeamStatus();
        const shinyTacticActive = getBotControlTactic() === 'shiny';
        lockVisibleShinyTeamMembers(team, 'swap-screen');
        const swapChoices = document.querySelectorAll('#swap-choices .poke-card, #swap-choices .team-slot');
        const incoming = document.querySelector('#swap-incoming .poke-card');

        if (!incoming) {
            // If there's no visible incoming, try cancel
            const cancelBtn = document.getElementById('btn-cancel-swap');
            if (cancelBtn) triggerRealClick(cancelBtn);
            return;
        }

        // Read the incoming Pokémon info
        const incomingInfo = learnPokemonInfoFromCard(incoming, 'swap-incoming');
        const incomingNameEl = incoming.querySelector('.poke-card-name, .poke-name, [class*="name"]');
        const incomingName = incomingInfo?.name || (incomingNameEl ? incomingNameEl.innerText.toLowerCase().trim() : '');
        const incomingTypes = incomingInfo?.types?.length ? incomingInfo.types : getKnownPokemonTypes(incomingName);
        const incomingAttackTypes = incomingInfo?.attackTypes?.length ? incomingInfo.attackTypes : getAttackTypesFromElement(incoming, incomingTypes);
        const incomingLevel = incomingInfo?.level || parseLevelText(incoming.innerText || '');
        const incomingIsShiny = isPokemonElementShiny(incoming);
        const incomingAlreadyOwnedShiny = isAlreadyOwnedShinyCandidate(incoming, incomingName);
        const incomingBossTypes = getCurrentCatchBossTypes();
        const incomingBossMatchupScore = scoreCatchBossCounter(incomingTypes, incomingAttackTypes, incomingBossTypes);
        const incomingDuplicateScore = getDuplicateIncomingSwapScore(incomingName, team);
        const incomingSinnohPassivePlanScore = scoreSinnohPassivePlanForTypes(incomingTypes, team, { isShiny: incomingIsShiny });
        const incomingSinnohPowerScore = scoreSinnohPowerCatchCandidate(incomingName, incomingTypes, team, {
            isShiny: incomingIsShiny,
            attackTypes: incomingAttackTypes,
            level: incomingLevel
        });
        const incomingTacticScore = getBotControlCatchScoreBonus({
            name: incomingName,
            score: 0,
            isShiny: incomingIsShiny,
            alreadyOwnedShiny: incomingAlreadyOwnedShiny,
            isLegendary: isLegendaryPokemonName(incomingName),
            types: incomingTypes,
            attackTypes: incomingAttackTypes,
            bossMatchupScore: incomingBossMatchupScore,
            duplicatePairScore: incomingDuplicateScore,
            sinnohPassivePlanScore: incomingSinnohPassivePlanScore,
            sinnohPowerScore: incomingSinnohPowerScore
        }, team, incomingBossTypes);
        let incomingScore = scoreCatchCandidate(incomingName, incomingTypes, team, incomingIsShiny, incomingAttackTypes, incomingBossTypes, {
            level: incomingLevel
        }) + incomingDuplicateScore + incomingTacticScore;
        if (shinyTacticActive && incomingIsShiny) {
            incomingScore += incomingAlreadyOwnedShiny ? 12000 : 220000;
        }

        // Find the weakest team member
        let weakestIdx = -1;
        let weakestScore = 999;
        let weakestUnit = null;

        if (swapChoices.length > 0) {
            swapChoices.forEach((choice, idx) => {
                const nameEl = choice.querySelector('.poke-card-name, .team-slot-name, [class*="name"]');
                if (!nameEl) return;
                const name = nameEl.innerText.toLowerCase().trim();
                const types = getKnownPokemonTypes(name);
                const attackTypes = getAttackTypesFromElement(choice, types);
                const teamUnit = team[idx] || { index: idx, name, types, attackTypes, isFainted: false };
                teamUnit.isShiny = Boolean(teamUnit.isShiny || isPokemonElementShiny(choice));
                teamUnit.alreadyOwnedShiny = Boolean(teamUnit.alreadyOwnedShiny || (teamUnit.isShiny && isAlreadyOwnedShinyCandidate(choice, name)));
                const lockBonus = isBotControlLockedUnit(teamUnit) ? CONFIG.BOT_CONTROL_LOCK_KEEP_BONUS : 0;
                let score = scoreCatchCandidate(name, types, team, teamUnit.isShiny, attackTypes) +
                              getDuplicatePairReplacementProtectionScore(teamUnit, team, incomingName) +
                              getShinyReplacementKeepScore(teamUnit, team) +
                              lockBonus;
                if (shinyTacticActive) {
                    const teamShinyIsNew = teamUnit.isShiny && !teamUnit.alreadyOwnedShiny;
                    if (teamShinyIsNew) {
                        score += 500000;
                    } else if (incomingIsShiny && !incomingAlreadyOwnedShiny && teamUnit.isShiny && teamUnit.alreadyOwnedShiny) {
                        score -= 60000;
                    } else if (incomingIsShiny && !incomingAlreadyOwnedShiny && !teamUnit.isShiny) {
                        score -= 18000;
                    } else if (!incomingIsShiny && teamUnit.isShiny) {
                        score += 180000;
                    }
                }
                if (score < weakestScore) {
                    weakestScore = score;
                    weakestIdx = idx;
                    weakestUnit = teamUnit;
                }
            });
        }

        // Swap if incoming is significantly better
        const targetIsProtectedNewShiny = Boolean(shinyTacticActive && weakestUnit?.isShiny && !weakestUnit.alreadyOwnedShiny);
        if (incomingIsShiny) {
            ensureBotControlLockedKey(getPokemonIdentityKey(incomingName), incomingAlreadyOwnedShiny ? 'incoming-owned-shiny' : 'incoming-new-shiny');
        }
        if (!targetIsProtectedNewShiny && incomingScore > weakestScore + 2 && weakestIdx >= 0) {
            log('info', '🔄', `Swapping: ${incomingName} (${incomingScore.toFixed(1)}) replaces weakest (${weakestScore.toFixed(1)})`);
            triggerRealClick(swapChoices[weakestIdx]);
            engineStats.swaps++;
        } else {
            log('info', '🔄', `Keeping team as-is (incoming: ${incomingScore.toFixed(1)} vs weakest: ${weakestScore.toFixed(1)})`);
            const cancelBtn = document.getElementById('btn-cancel-swap');
            if (cancelBtn) triggerRealClick(cancelBtn);
        }
    }

    // --- TRADE SCREEN ---
    function handleTradeScreen() {
        const team = parseTeamStatus();
        evaluateTrade(team);
    }

    // --- SHINY SCREEN ---
    function handleShinyScreen() {
        const shinyContent = document.getElementById('shiny-content');
        if (shinyContent) {
            const btn = shinyContent.querySelector('button, .btn-primary, [class*="btn"]');
            if (btn) triggerRealClick(btn);
            else triggerRealClick(shinyContent);
        }
    }

    // --- BADGE SCREEN ---
    function handleBadgeScreen() {
        const nextBtn = document.getElementById('btn-next-map');
        if (nextBtn) triggerRealClick(nextBtn);
    }

    // --- TRANSITION SCREEN ---
    function handleTransitionScreen() {
        // Transition screens auto-resolve, but click to speed up
        const screen = document.getElementById('transition-screen');
        if (screen) triggerRealClick(screen);
    }

    // --- STAT BUFF SCREEN (EV Allocation) ---
    function handleStatBuffScreen() {
        const choices = document.querySelectorAll('#stat-buff-choices .stat-card, #stat-buff-choices > *');
        if (choices.length === 0) return;

        const team = parseTeamStatus();
        const carry = getPrimaryCarry(team);
        const preferSpecial = carry ? getOffenseRole(carry) === 'special' : true;
        const opponentProfile = detectNextOpponentProfile();
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const challengeStrategy = getChallengeStrategyContext(team, opponentProfile);

        let bestChoice = null;
        let bestScore = -999;

        choices.forEach(choice => {
            const text = foldText(choice.innerText || '');
            const specialAttack = Boolean(text.match(/sp\.?\s*atk|sp atk|special attack|spa|ataque especial|ataque esp|atq esp|atk esp/));
            const specialDefense = Boolean(text.match(/sp\.?\s*def|sp def|special defense|defensa especial|def esp/));
            const plainAttack = Boolean(text.match(/(^|[^a-z])(atk|attack|ataque|atq)([^a-z]|$)/)) && !specialAttack;
            const speed = Boolean(text.match(/speed|velocidad|spe|(^|[^a-z])spd([^a-z]|$)/)) && !specialDefense;
            const hp = Boolean(text.match(/(^|[^a-z])(hp|ps)([^a-z]|$)|hit points|salud|vida/));
            const defense = Boolean(text.match(/defense|defensa|(^|[^a-z])def([^a-z]|$)/)) && !specialDefense;

            let score = 0;
            if (preferSpecial) {
                if (specialAttack) score += 140;
                if (plainAttack) score += 85;
            } else {
                if (plainAttack) score += 140;
                if (specialAttack) score += 85;
            }
            if (speed) score += 50;
            if (hp) score += 25;
            if (defense || specialDefense) score += 8;
            if (text.match(/random|azar|aleator/)) score -= 20;
            if (sinnohTraining.active) {
                if (preferSpecial) {
                    if (specialAttack) score += 120;
                    if (plainAttack) score += 45;
                } else {
                    if (plainAttack) score += 120;
                    if (specialAttack) score += 45;
                }
                if (sinnohTraining.needsOffense) {
                    if (preferSpecial) {
                        if (specialAttack) score += 180;
                        if (plainAttack) score += 70;
                    } else {
                        if (plainAttack) score += 180;
                        if (specialAttack) score += 70;
                    }
                }
                if (speed) score += sinnohTraining.needsSpeed ? 130 : 55;
                if (hp) score += 20;
                if (defense || specialDefense) score += 34;
                if (text.match(/random|azar|aleator/)) score -= 35;
            }
            if (challengeStrategy.active) {
                if (preferSpecial) {
                    if (specialAttack) score += 150;
                    if (plainAttack) score += 60;
                } else {
                    if (plainAttack) score += 150;
                    if (specialAttack) score += 60;
                }
                if (speed) score += challengeStrategy.needsCarryBuff ? 105 : 70;
                if (hp) score += challengeStrategy.prepPressure > 0 ? 38 : 16;
                if (defense || specialDefense) score += challengeStrategy.prepPressure > 0 ? 42 : 10;
                if (text.match(/random|azar|aleator/)) score -= 45;
            }

            if (score > bestScore) {
                bestScore = score;
                bestChoice = choice;
            }
        });

        ensureRunTelemetry('stat-buff-screen');
        recordRunEvent('stat-buff-choice', {
            carry: carry ? carry.name : null,
            offenseRole: carry ? getOffenseRole(carry) : null,
            choice: (bestChoice?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            score: bestScore,
            sinnohTraining: sinnohTraining.active ? {
                carryMoveTier: sinnohTraining.carryMoveTier,
                needsTm: sinnohTraining.needsTm,
                needsOffense: sinnohTraining.needsOffense,
                needsSpeed: sinnohTraining.needsSpeed
            } : null,
            challengeStrategy: challengeStrategy.active ? {
                carry: challengeStrategy.carry ? challengeStrategy.carry.name : null,
                needsCarryBuff: challengeStrategy.needsCarryBuff,
                prepPressure: challengeStrategy.prepPressure
            } : null
        });
        log('info', '📈', `Stat buff: picking for ${carry ? carry.name : 'team'} (${carry ? getOffenseRole(carry) : 'auto'}, score ${bestScore}).`);
        triggerRealClick(bestChoice || choices[0]);
    }

    // --- ELITE PREP SCREEN ---
    function handleElitePrepScreen() {
        // 1. Reorder team for type advantage
        const opponentProfile = detectNextOpponentProfile();
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();

        // Try reading from the elite prep enemy section
        let detectedTypes = [...bossTypes];
        if (detectedTypes.length === 0) {
            const enemyTraits = document.getElementById('elite-prep-enemy-traits');
            if (enemyTraits) {
                const traitBadges = enemyTraits.querySelectorAll('.trait-badge, [class*="trait"]');
                traitBadges.forEach(badge => {
                    const t = badge.innerText.trim();
                    if (TYPES.includes(t) && !detectedTypes.includes(t)) detectedTypes.push(t);
                });
            }
        }
        const prepProfile = opponentProfile || makeOpponentProfile({ name: 'elite prep', types: detectedTypes, sourceConfidence: 'elite-prep-types' });
        const detectedTypeLabel = getOpponentProfileLabel(prepProfile);

        const team = parseTeamStatus();
        if (team.length > 0) {
            const prepStatus = getBossPrepStatus(team, prepProfile);
            if (ensureLeadMeetsBattleLevel(team, prepStatus, prepProfile)) return;
            if (optimizeTeamOrder(team, prepProfile, prepStatus)) return;

            const bagItems = getBagItems();
            const bestBagItem = pickBestBagItemForTeam(bagItems, team, prepProfile);
            if (bestBagItem && shouldEquipBagItem(bestBagItem.name, team, prepProfile) && shouldAttemptElitePrepBagItem(bestBagItem.name, team)) {
                log('info', '🎒', `Elite prep: equipping/using [${bestBagItem.name}] before FIGHT.`);
                lastChosenItemName = bestBagItem.name;
                triggerRealClick(bestBagItem.element);
                return;
            }

            if (ensureLeadHasHeldItem(team, prepProfile)) return;
        }

        const playerSide = document.getElementById('elite-prep-player-side');
        if (playerSide && detectedTypes.length > 0) {
            const slots = Array.from(playerSide.querySelectorAll('.poke-card, .battle-poke'))
                .filter(slot => isVisible(slot) && !slot.querySelector('.poke-card, .battle-poke'));
            if (slots.length > 1) {
                // Find best counter among the visible Pokémon
                let bestSlot = null;
                let bestScore = -999;

                slots.forEach((slot, idx) => {
                    const nameEl = slot.querySelector('[class*="name"]');
                    if (!nameEl) return;
                    const name = nameEl.innerText.toLowerCase().trim();
                    const types = getKnownPokemonTypes(name);
                    const attackTypes = getAttackTypesFromElement(slot, types);
                    const unit = { name, types, attackTypes, hp: 100, level: 0, isFainted: false, heldItem: null };
                    const score = scoreLeadCandidate(unit, prepProfile);

                    if (score > bestScore) {
                        bestScore = score;
                        bestSlot = { slot, idx };
                    }
                });

                if (bestSlot && bestSlot.idx !== 0) {
                    log('info', '⚔️', `Elite prep: reordering for ${detectedTypeLabel}`);
                    if (tryTeamReorder(bestSlot.slot, slots[0], null, null, 'elite-prep-fallback')) {
                        return; // Let the reorder settle before clicking fight.
                    }
                }
            }
        }

        // 2. Click the FIGHT button
        const fightBtn = document.getElementById('btn-elite-prep-continue') || document.querySelector('.elite-prep-fight-btn');
        if (fightBtn && isEnabledActionControl(fightBtn)) {
            ensureRunTelemetry('elite-prep-screen');
            recordRunEvent('fight-start', {
                opponent: compactOpponentProfile(prepProfile),
                detectedTypeLabel,
                team: compactTeamSnapshot(team, prepProfile)
            });
            currentRunTelemetry.best.battles = Math.max(currentRunTelemetry.best.battles, getRunBattleCount(currentRunTelemetry));
            log('info', '⚔️', 'Elite prep: clicking FIGHT!');
            triggerRealClick(fightBtn);
        }
    }

    // --- GAME OVER SCREEN ---
    function handleGameOverScreen() {
        const retryBtn = document.getElementById('btn-retry');
        if (retryBtn) {
            finalizeRunTelemetry('gameover', {
                autoRestart: getBotControlAutoRestartEnabled(),
                gameoverText: (document.getElementById('gameover-stats')?.innerText || '').replace(/\s+/g, ' ').trim()
            });
        }
        if (!getBotControlAutoRestartEnabled()) return;
        if (retryBtn) {
            log('info', '💀', 'Game Over → Auto-restarting...');
            sinnohCarryKnownTmTiers = {};
            resetMapCaptureState('game over');
            triggerRealClick(retryBtn);
        }
    }

    // --- WIN SCREEN ---
    function handleWinScreen() {
        if (!getBotControlAutoRestartEnabled()) return;
        // Prefer tower climb, otherwise play again
        const towerBtn = document.querySelector('#win-screen [onclick*="showEndlessStageSelect"], #win-screen .btn-secondary--gold');
        if (towerBtn) {
            ensureRunTelemetry('win-screen');
            recordRunEvent('win-screen', { action: 'climb-tower', snapshot: getRunProgressSnapshot('win-screen') });
            log('info', '🏆', 'Victory → Climbing tower!');
            sinnohCarryKnownTmTiers = {};
            resetMapCaptureState('win tower');
            triggerRealClick(towerBtn);
            return;
        }
        const playAgainBtn = document.getElementById('btn-play-again');
        if (playAgainBtn) {
            finalizeRunTelemetry('win', { action: 'play-again' });
            log('info', '🏆', 'Victory → Playing again!');
            sinnohCarryKnownTmTiers = {};
            resetMapCaptureState('win play again');
            triggerRealClick(playAgainBtn);
        }
    }

    function getAutoStartModeEnabled(mode) {
        const runMode = getBotControlRunMode();
        if (runMode === 'manual') return false;
        if (runMode === 'battleTower') return mode === 'battleTower' || mode === 'resumeBattleTower';
        if (runMode === 'weeklyChallenges') return mode === 'weeklyChallenges';
        if (runMode === 'challengeMode') {
            return mode === 'challengeMode' || (mode === 'resumeChallenge' && !getBotControlMapPreference());
        }
        if (runMode === 'story') return mode === 'story';

        const modes = CONFIG.AUTO_START_MODES || {};
        if (mode === 'battleTower' || mode === 'resumeBattleTower') {
            if (Object.prototype.hasOwnProperty.call(modes, mode)) {
                return Boolean(modes[mode] || CONFIG.AUTO_START_BATTLE_TOWER);
            }
            return Boolean(CONFIG.AUTO_START_BATTLE_TOWER);
        }

        if (Object.prototype.hasOwnProperty.call(modes, mode)) {
            return Boolean(modes[mode]);
        }

        return false;
    }

    function getAutoStartPriority() {
        const runMode = getBotControlRunMode();
        const hasMapPreference = Boolean(getBotControlMapPreference());
        if (runMode === 'manual') return [];
        if (runMode === 'battleTower') {
            return hasMapPreference
                ? ['battleTower', 'resumeBattleTower']
                : ['resumeBattleTower', 'battleTower'];
        }
        if (runMode === 'weeklyChallenges') return ['weeklyChallenges'];
        if (runMode === 'challengeMode') return hasMapPreference ? ['challengeMode'] : ['resumeChallenge', 'challengeMode'];
        if (runMode === 'story') return ['story'];

        const configured = Array.isArray(CONFIG.AUTO_START_PRIORITY) ? CONFIG.AUTO_START_PRIORITY : [];
        return configured.length > 0 ? configured : [
            'resumeChallenge',
            'weeklyChallenges',
            'challengeMode',
            'resumeBattleTower',
            'battleTower'
        ];
    }

    function isChallengeAutoRunMode(mode = activeAutoRunMode) {
        return mode === 'weekly-challenge' || mode === 'challenge-mode';
    }

    function getVisibleControl(selectors) {
        return Array.from(document.querySelectorAll(selectors))
            .find(control => isEnabledActionControl(control)) || null;
    }

    function getChoiceSearchText(element) {
        if (!element) return '';
        const attrs = Array.from(element.attributes || [])
            .filter(attr => attr.name.startsWith('data-') || ['id', 'class', 'title', 'aria-label'].includes(attr.name))
            .map(attr => `${attr.name} ${attr.value}`);
        return foldText([
            element.innerText || '',
            element.textContent || '',
            ...attrs
        ].join(' '));
    }

    function isLockedChoice(element) {
        if (!element) return true;
        return Boolean(
            element.disabled ||
            element.hasAttribute?.('disabled') ||
            element.getAttribute?.('aria-disabled') === 'true' ||
            element.classList?.contains('locked') ||
            element.classList?.contains('disabled') ||
            element.classList?.contains('history-region-btn--locked')
        );
    }

    function findPreferredChoice(choices, preference = getBotControlMapPreference()) {
        const visibleChoices = Array.from(choices || []).filter(choice => isVisible(choice) && !isLockedChoice(choice));
        if (visibleChoices.length === 0) return null;
        if (preference) {
            const preferred = visibleChoices.find(choice => getChoiceSearchText(choice).includes(preference));
            if (preferred) return preferred;
            log('warn', '🧭', `No visible map/region matched [${preference}]. Falling back to best available.`);
        }
        return visibleChoices[visibleChoices.length - 1] || null;
    }

    function getStoryLaunchControl() {
        return getVisibleControl([
            '#btn-story-run',
            '#btn-history-run',
            '#btn-regions-run',
            '#btn-adventure-run',
            '#btn-continue-story',
            '#btn-continue-history',
            '[onclick*="showHistoryRegionSelect"]',
            '[onclick*="history"]',
            '[onclick*="History"]',
            '[id*="history"]',
            '[id*="story"]',
            '[class*="history"]',
            '[class*="story"]'
        ].join(', '));
    }

    function prepareAutoRun(reason, mode, context = null, eventType = 'run-start') {
        activeAutoRunMode = mode;
        activeChallengeContext = context;
        if (eventType === 'run-start') sinnohCarryKnownTmTiers = {};
        duplicatePriorityCatchNodesTaken = 0;
        currentRunTelemetry = makeRunTelemetry(reason);
        recordRunEvent(eventType, {
            reason,
            mode,
            context,
            labels: getProgressLabels()
        });
        resetMapCaptureState(reason);
    }

    function parseProgressRatio(text) {
        const match = foldText(text || '').match(/(\d+)\s*(?:\/|of|de)\s*(\d+)/);
        if (!match) return null;
        const current = Number.parseInt(match[1], 10);
        const total = Number.parseInt(match[2], 10);
        if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
        return { current, total };
    }

    function isWeeklyChallengeComplete() {
        try {
            if (typeof window.isWeeklyBeaten === 'function') {
                return Boolean(window.isWeeklyBeaten());
            }
        } catch (e) {
            log('debug', '⚔️', `Weekly completion helper failed: ${e.message}`);
        }

        const weeklyCard = document.getElementById('chal-weekly') || document.querySelector('.chal-weekly-card');
        const weeklyText = [
            weeklyCard?.innerText || '',
            document.querySelector('.chal-weekly-count')?.innerText || '',
            document.querySelector('.weekly-status')?.innerText || ''
        ].join(' ');

        const ratio = parseProgressRatio(weeklyText);
        if (ratio) return ratio.current >= ratio.total;

        const classText = weeklyCard ? String(weeklyCard.getAttribute('class') || '') : '';
        return Boolean(classText.match(/done|complete|completed|cleared|chal-weekly-card--d/));
    }

    function isWeeklySubComplete(subId, tile = null) {
        try {
            if (typeof window.isWeeklySubCleared === 'function') {
                return Boolean(window.isWeeklySubCleared(subId));
            }
        } catch (e) {
            log('debug', '⚔️', `Weekly sub completion helper failed: ${e.message}`);
        }

        if (!tile) return false;

        const classText = String(tile.getAttribute('class') || '');
        if (classText.match(/done|complete|completed|cleared|weekly-sub--d/)) return true;

        const text = tile.innerText || '';
        if (text.includes('✓')) return true;

        const ctaText = (tile.querySelector('.chal-intro-cta')?.innerText || '').trim();
        if (ctaText && !ctaText.match(/[▸>]/)) return true;

        return false;
    }

    function getWeeklySubAllowedTypes(tile) {
        if (!tile) return [];
        let types = getTypeListFromElements(tile.querySelectorAll('.type-badge, [data-type], [class*="type-"]'));
        if (types.length === 0) {
            types = detectTypesInText([
                tile.innerText || '',
                tile.getAttribute('class') || '',
                tile.getAttribute('data-sub') || ''
            ].join(' '));
        }
        return normalizeTypeList(types);
    }

    function getWeeklySubTiles() {
        return Array.from(document.querySelectorAll('.weekly-sub[data-sub]'))
            .filter(tile => isVisible(tile));
    }

    function getNextWeeklySubTile() {
        const tiles = getWeeklySubTiles();
        if (tiles.length === 0) return null;

        const byId = new Map(tiles.map(tile => [foldText(tile.getAttribute('data-sub') || ''), tile]));
        const preference = getBotControlMapPreference();
        if (preference) {
            const preferred = tiles.find(tile =>
                !isWeeklySubComplete(tile.getAttribute('data-sub') || '', tile) &&
                getChoiceSearchText(tile).includes(preference)
            );
            if (preferred) {
                return { subId: preferred.getAttribute('data-sub') || preference, tile: preferred };
            }
            log('warn', '⚔️', `Weekly target [${preference}] not visible/incomplete. Falling back to configured order.`);
        }

        const orderedIds = [
            ...(CONFIG.WEEKLY_CHALLENGE_ORDER || []),
            ...tiles.map(tile => tile.getAttribute('data-sub') || '')
        ].map(foldText).filter(Boolean);

        for (const subId of [...new Set(orderedIds)]) {
            const tile = byId.get(subId);
            if (tile && !isWeeklySubComplete(subId, tile)) {
                return { subId, tile };
            }
        }

        return null;
    }

    function getStartingItemChoices(root = document) {
        const selectors = [
            '#starting-item-choices .item-card',
            '#starting-item-choices > *',
            '#starting-items .item-card',
            '#starting-items > *',
            '#challenge-starting-items .item-card',
            '#challenge-starting-items > *',
            '#weekly-starting-items .item-card',
            '#weekly-starting-items > *',
            '.starting-item-card',
            '.starting-item-option',
            '.starter-item-card',
            '.weekly-starting-item',
            '.challenge-starting-item',
            '[data-starting-item]',
            '[data-start-item]'
        ].join(', ');

        return Array.from(root.querySelectorAll(selectors))
            .filter(choice => isVisible(choice) && !isLockedChoice(choice));
    }

    function isStartingItemScreenElement(screen) {
        if (!screen || !isVisible(screen)) return false;
        const text = getChoiceSearchText(screen);
        const idClass = foldText(`${screen.id || ''} ${screen.getAttribute?.('class') || ''}`);
        const hasStartingShape = Boolean(
            idClass.match(/starting.*item|start.*item|starter.*item|weekly.*item|challenge.*item/) ||
            text.match(/starting item|starting items|start item|item inicial|objeto inicial|elige.*objeto|choose.*item|select.*item/)
        );
        return hasStartingShape && getStartingItemChoices(screen).length > 0;
    }

    function getStartingItemActionTarget(choice) {
        if (!choice) return null;
        return choice.querySelector?.('button:not([disabled]), .btn:not(.disabled), [role="button"]:not([aria-disabled="true"])') || choice;
    }

    function handleStartingItemScreen() {
        const activeScreen = document.querySelector('.screen.active') || document;
        const choices = getStartingItemChoices(activeScreen);
        if (choices.length === 0) {
            const fallback = getVisibleControl('#btn-starting-item-confirm, #btn-starting-items-confirm, .starting-item-confirm, .btn-primary');
            if (fallback) triggerRealClick(fallback);
            return;
        }

        const team = parseTeamStatus();
        const opponentProfile = detectNextOpponentProfile();
        const selected = choices
            .map(choice => ({
                choice,
                score: scoreStartingItemChoice(choice, team, opponentProfile)
            }))
            .sort((a, b) => b.score - a.score)[0]?.choice || choices[0];
        const target = getStartingItemActionTarget(selected);
        ensureRunTelemetry('starting-item-screen');
        recordRunEvent('starting-item-choice', {
            choice: (selected.innerText || selected.getAttribute?.('aria-label') || selected.title || '').replace(/\s+/g, ' ').trim().slice(0, 100),
            score: scoreStartingItemChoice(selected, team, opponentProfile),
            mode: activeAutoRunMode,
            context: activeChallengeContext
        });
        log('info', '⚔️', `Selecting best starting item for ${activeAutoRunMode || 'challenge'}...`);
        triggerRealClick(target || selected);
    }

    function handleChallengeSelectScreen() {
        const weeklyEnabled = getAutoStartModeEnabled('weeklyChallenges');
        const challengeEnabled = getAutoStartModeEnabled('challengeMode');

        if (weeklyEnabled && !isWeeklyChallengeComplete()) {
            const weeklyBtn = getVisibleControl('#chal-weekly, .chal-weekly-card');
            if (weeklyBtn) {
                activeAutoRunMode = 'weekly-challenge';
                activeChallengeContext = null;
                log('info', '⚔️', 'Opening weekly challenge list...');
                resetMapCaptureState('open weekly challenges');
                triggerRealClick(weeklyBtn);
                return;
            }
        }

        if (challengeEnabled) {
            const challengeBtn = getVisibleControl('#chal-intro, .chal-intro--launch');
            if (challengeBtn) {
                const context = { kind: 'challenge-mode', subId: null, allowedTypes: [] };
                prepareAutoRun('start challenge mode', 'challenge-mode', context);
                log('info', '⚔️', 'Starting Challenge Mode...');
                triggerRealClick(challengeBtn);
                return;
            }
        }

        const backBtn = getVisibleControl('#challenge-back');
        if (backBtn && (getAutoStartModeEnabled('battleTower') || getAutoStartModeEnabled('resumeBattleTower'))) {
            triggerRealClick(backBtn);
        }
    }

    function handleWeeklySelectScreen() {
        const next = getNextWeeklySubTile();
        if (next) {
            const allowedTypes = getWeeklySubAllowedTypes(next.tile);
            const context = {
                kind: 'weekly-subchallenge',
                subId: next.subId,
                allowedTypes
            };
            prepareAutoRun(`start weekly challenge ${next.subId}`, 'weekly-challenge', context);
            recordRunEvent('weekly-sub-start', context);
            log('info', '⚔️', `Starting weekly challenge [${next.subId}]${allowedTypes.length ? ` (${allowedTypes.join('/')})` : ''}...`);
            triggerRealClick(next.tile);
            return;
        }

        activeChallengeContext = null;
        const backBtn = getVisibleControl('#weekly-back');
        if (backBtn) {
            log('info', '⚔️', 'Weekly challenges complete. Returning to Challenge menu...');
            triggerRealClick(backBtn);
        }
    }

    // --- STAGE COMPLETE SCREEN ---
    function handleStageComplete() {
        // Try to continue to next stage
        const continueBtn = document.getElementById('btn-stage-continue');
        if (continueBtn) {
            const completedMode = activeAutoRunMode;
            const completedContext = activeChallengeContext;
            ensureRunTelemetry('stage-complete');
            recordRunEvent('stage-complete', {
                mode: completedMode,
                context: completedContext,
                snapshot: getRunProgressSnapshot('stage-complete')
            });
            if (isChallengeAutoRunMode(completedMode)) {
                finalizeRunTelemetry('stage-complete', {
                    action: 'challenge-continue',
                    mode: completedMode,
                    context: completedContext
                });
                activeAutoRunMode = null;
                activeChallengeContext = null;
            }
            resetMapCaptureState('stage complete');
            triggerRealClick(continueBtn);
            return;
        }
        const againBtn = document.getElementById('btn-stage-again');
        if (againBtn) {
            finalizeRunTelemetry('stage-complete-again', { action: 'stage-again' });
            resetMapCaptureState('stage again');
            triggerRealClick(againBtn);
        }
    }

    // --- TITLE SCREEN ---
    function handleTitleScreen() {
        for (const mode of getAutoStartPriority()) {
            if (!getAutoStartModeEnabled(mode)) continue;

            if (mode === 'resumeChallenge') {
                const resumeChallenge = getVisibleControl('#btn-continue-challenge');
                if (resumeChallenge) {
                    const context = { kind: 'resume-challenge', subId: null, allowedTypes: [] };
                    prepareAutoRun('resume challenge', 'challenge-mode', context, 'run-resume');
                    log('info', '⚔️', 'Resuming Challenge run...');
                    triggerRealClick(resumeChallenge);
                    return;
                }
            }

            if (mode === 'weeklyChallenges' || mode === 'challengeMode') {
                const challengeBtn = getVisibleControl('#btn-challenges-run');
                if (challengeBtn) {
                    activeAutoRunMode = mode === 'weeklyChallenges' ? 'weekly-challenge' : 'challenge-mode';
                    activeChallengeContext = null;
                    log('info', '⚔️', 'Opening Challenges...');
                    resetMapCaptureState('open challenges');
                    triggerRealClick(challengeBtn);
                    return;
                }
            }

            if (mode === 'story') {
                const storyBtn = getStoryLaunchControl();
                if (storyBtn) {
                    prepareAutoRun('open story mode', 'story', {
                        kind: 'story-mode',
                        target: getBotControlMapPreference() || null
                    });
                    log('info', '🧭', 'Opening Story mode...');
                    triggerRealClick(storyBtn);
                    return;
                }
            }

            if (mode === 'resumeBattleTower') {
                const resumeTower = getVisibleControl('#btn-continue-endless');
                if (resumeTower) {
                    prepareAutoRun('resume tower', 'battle-tower', null, 'run-resume');
                    log('info', '🏠', 'Resuming Battle Tower run...');
                    triggerRealClick(resumeTower);
                    return;
                }
            }

            if (mode === 'battleTower') {
                const towerBtn = getVisibleControl('#btn-endless-run');
                if (towerBtn) {
                    prepareAutoRun('start tower', 'battle-tower');
                    log('info', '🏠', 'Starting Battle Tower...');
                    triggerRealClick(towerBtn);
                    return;
                }
            }
        }
    }

    // --- TRAINER SELECT SCREEN ---
    function handleTrainerScreen() {
        const trainerBoy = document.getElementById('trainer-boy');
        if (trainerBoy) triggerRealClick(trainerBoy);
    }

    function getStarterChoiceSearchableText(choice) {
        if (!choice) return '';
        const imgs = Array.from(choice.querySelectorAll('img'));
        return foldText([
            choice.innerText || '',
            choice.title || '',
            choice.getAttribute('aria-label') || '',
            choice.getAttribute('data-species') || '',
            choice.getAttribute('data-name') || '',
            choice.getAttribute('class') || '',
            ...imgs.map(img => `${img.alt || ''} ${img.title || ''} ${img.src || ''}`)
        ].join(' '));
    }

    function getStarterChoiceTypes(choice) {
        if (!choice) return [];

        let types = getTypeListFromElements(choice.querySelectorAll(
            '.type-badge, .poke-type, [data-type], [data-poke-type], [class*="type-"]'
        ));
        if (types.length > 0) return types;

        const searchableText = getStarterChoiceSearchableText(choice);
        for (const { name, types: knownTypes } of getAllKnownPokemonEntries()) {
            if (searchableText.includes(foldText(name))) {
                return normalizeTypeList(knownTypes);
            }
        }

        return normalizeTypeList(detectTypesInText(searchableText));
    }

    function getAllowedStarterChoices(choices) {
        const allowedTypes = normalizeTypeList(activeChallengeContext?.allowedTypes || []);
        if (allowedTypes.length === 0) return choices;

        const filtered = choices.filter(choice => {
            const choiceTypes = getStarterChoiceTypes(choice);
            return choiceTypes.some(type => allowedTypes.includes(type));
        });

        if (filtered.length > 0) {
            log('info', '🐾', `Starter filter for challenge types [${allowedTypes.join('/')}] kept ${filtered.length}/${choices.length} choice(s).`);
            return filtered;
        }

        log('warn', '🐾', `No starter matched challenge types [${allowedTypes.join('/')}]. Using all visible choices.`);
        return choices;
    }

    // --- STARTER SELECT SCREEN ---
    function handleStarterScreen() {
        let choices = Array.from(document.querySelectorAll('#starter-choices .dex-card, #starter-choices .poke-card'));
        if (choices.length === 0) {
            choices = Array.from(document.querySelectorAll('#starter-choices > *'));
        }
        if (choices.length === 0) return;
        choices = getAllowedStarterChoices(choices);

        const botState = getBotControlState();
        const starterMode = botState.starterMode || 'auto';
        if (starterMode === 'manual') {
            log('debug', '🐾', 'Starter mode is manual; waiting for player choice.');
            return;
        }

        const stateStarter = botState.starterPreference;
        const configuredStarter = starterMode === 'preferred'
            ? stateStarter
            : (CONFIG.STARTER_PREFERENCE || '');
        const starterPreference = foldText(configuredStarter || '');
        if (starterPreference) {
            for (const choice of choices) {
                const searchableText = getStarterChoiceSearchableText(choice);

                if (searchableText.includes(starterPreference)) {
                    log('info', '🐾', `Starter preference matched: ${configuredStarter}`);
                    triggerRealClick(choice);
                    return;
                }
            }

            log('warn', '🐾', `Starter preference [${configuredStarter}] not visible. Falling back to auto starter scoring.`);
        }

        // Score visible starters by configured carry value, shiny value, and Sinnoh trait goals.
        let bestChoice = null;
        let bestScore = -1;

        choices.forEach(choice => {
            const text = getStarterChoiceSearchableText(choice);
            let score = 0;
            let matchedName = '';
            let matchedTypes = [];

            // Score known type traits and remember the matched Pokemon for carry/stat bonuses.
            for (const { name, types } of getAllKnownPokemonEntries()) {
                if (text.includes(foldText(name))) {
                    matchedName = name;
                    matchedTypes = normalizeTypeList(types);
                    types.forEach(t => {
                        const traitInfo = TRAIT_DATA[t];
                        if (traitInfo) score += TRAIT_TIER_VALUE[traitInfo.tier] || 1;
                    });
                    break;
                }
            }
            if (matchedName && isMainCarryName(matchedName)) score += 90;
            if (matchedName) score += scorePokemonStats(getPokemonBaseStats(matchedName)) * 0.8;

            // Shiny bonus for starters (they count as 2x for traits and are rare)
            const isShiny = isPokemonElementShiny(choice);
            if (isShiny) {
                score += 35 + getShinyDraftScore(matchedTypes, [], true);
            }
            if (isSinnohTowerRunContext()) {
                score += scoreSinnohPassivePlanForTypes(matchedTypes, [], { isShiny });
                const matchedAttackTypes = matchedName
                    ? getLikelyAttackTypes({ name: matchedName, types: matchedTypes, level: 0 })
                    : matchedTypes;
                score += scoreSinnohBossRunPlanFit(matchedTypes, matchedAttackTypes, [], null, {
                    bossWeight: 0.6,
                    arceusWeight: 0.8,
                    postArceusWeight: 0.7
                });
                if (matchedTypes.includes('Rock')) score += 24;
                if (matchedTypes.includes('Water')) score += 24;
                if (matchedTypes.includes('Dragon')) score += 24;
                if (matchedTypes.includes('Fairy')) score += 34;
                if (isShiny && (matchedTypes.includes('Normal') || matchedTypes.includes('Bug'))) score += 8;
            }
            if (isChallengeStrategyActive()) {
                score += scoreChallengeStarterFit(matchedName, matchedTypes, isShiny);
            }
            if (isStoryStrategyActive()) {
                score += scoreStoryStarterFit(matchedName, matchedTypes, isShiny);
            }

            if (score > bestScore) {
                bestScore = score;
                bestChoice = choice;
            }
        });

        triggerRealClick(bestChoice || choices[0]);
    }

    // --- ENDLESS STAGE SELECT ---
    function handleEndlessStageSelect() {
        const stages = document.querySelectorAll('#stage-select-list .region-card, #stage-select-list .history-region-btn, #stage-select-list > *');
        if (stages.length === 0) return;

        const selectedStage = findPreferredChoice(stages);

        if (selectedStage) {
            log('info', '🗼', `Selecting Endless Stage: ${selectedStage.innerText.split('\n')[0]}`);
            ensureRunTelemetry('stage select');
            recordRunEvent('stage-select', {
                label: selectedStage.innerText.split('\n')[0],
                target: getBotControlMapPreference() || null,
                labels: getProgressLabels()
            });
            resetMapCaptureState('stage select');
            triggerRealClick(selectedStage);
        }
    }

    function handleHistoryRegionSelect() {
        const regions = document.querySelectorAll(
            '#history-region-list .history-region-btn, #history-region-list .region-card, ' +
            '#region-select-list .history-region-btn, #region-select-list .region-card, ' +
            '.history-region-btn, .region-card, #history-region-select > *'
        );
        if (regions.length === 0) return;

        const selectedRegion = findPreferredChoice(regions);
        if (!selectedRegion) return;

        ensureRunTelemetry('history-region-select');
        recordRunEvent('story-region-select', {
            label: selectedRegion.innerText.split('\n')[0],
            target: getBotControlMapPreference() || null,
            labels: getProgressLabels()
        });
        resetMapCaptureState('story region select');
        log('info', '🧭', `Selecting Story region: ${selectedRegion.innerText.split('\n')[0]}`);
        triggerRealClick(selectedRegion);
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║          🛡️ ANTI-STUCK WATCHDOG                             ║
    // ╚══════════════════════════════════════════════════════════════╝

    function getAntiStuckProgressSignature(currentState) {
        try {
            if (currentState === 'map-screen') {
                const mapKey = currentMapKey || getCurrentMapKey() || '';
                const clickableSignature = getClickableMapNodes()
                    .map(node => getMapNodeClickSignature(node))
                    .sort()
                    .join('|');
                const teamSignature = parseTeamStatus()
                    .map(unit => `${unit.index}:${getPokemonIdentityKey(unit.name)}:${unit.hp}:${unit.level}:${unit.isFainted ? 'F' : 'A'}`)
                    .join('|');
                return `${currentState}:${mapKey}:${capturesThisMap}:${clickableSignature}:${teamSignature}`;
            }
            if (currentState === 'catch-screen') {
                const cards = Array.from(document.querySelectorAll('#catch-choices .poke-card'))
                    .map(card => foldText(card.innerText || card.textContent || '').slice(0, 120))
                    .join('|');
                return `${currentState}:${catchRerollsThisEncounter}:${cards}`;
            }
            return `${currentState}:${document.querySelector('.screen.active')?.innerText?.slice(0, 240) || ''}`;
        } catch (e) {
            return currentState;
        }
    }

    function antiStuckCheck(currentState) {
        const progressSignature = getAntiStuckProgressSignature(currentState);
        if (currentState === lastStateForStuck && progressSignature === lastStuckProgressSignature) {
            stuckCounter++;
        } else {
            stuckCounter = 0;
            lastStateForStuck = currentState;
            lastStuckProgressSignature = progressSignature;
        }

        if (stuckCounter >= CONFIG.STUCK_PANIC_THRESHOLD) {
            log('error', '🚨', `PANIC: Stuck for ${stuckCounter} loops on [${currentState}]. Attempting recovery...`);
            if (currentState === 'map-screen' && forceClickAlternateMapNode('panic')) {
                stuckCounter = 0;
                return true;
            }
            // Try clicking any visible button on the page
            const allBtns = document.querySelectorAll('button:not([disabled]), .btn-primary, .btn-secondary, [role="button"]');
            for (const btn of allBtns) {
                if (isVisible(btn)) {
                    triggerRealClick(btn);
                    stuckCounter = 0;
                    return true;
                }
            }
        } else if (stuckCounter >= CONFIG.STUCK_FORCE_THRESHOLD) {
            log('warn', '⚠️', `Force-clicking generic navigation (stuck: ${stuckCounter}x on [${currentState}])`);
            if (currentState === 'map-screen' && forceClickAlternateMapNode('force-threshold')) {
                stuckCounter = 0;
                return true;
            }
            const navBtns = document.querySelectorAll(
                '.btn-next, #btn-stage-continue, .choice-skip-btn, #btn-skip-catch, #btn-skip-trade, ' +
                '#btn-cancel-swap, #btn-equip-to-bag, #btn-equip-cancel, #btn-cancel-use, #btn-next-map, ' +
                '#btn-continue-battle, #btn-auto-battle, #btn-elite-prep-continue, .elite-prep-fight-btn, #btn-retry, #btn-play-again, ' +
                '#btn-challenges-run, #btn-continue-challenge, #chal-intro, #chal-weekly, #weekly-back, .weekly-sub, ' +
                '#starting-item-choices > *, #starting-items > *, .starting-item-card, .starting-item-option, [data-starting-item]'
            );
            for (const btn of navBtns) {
                if (isVisible(btn)) {
                    triggerRealClick(btn);
                    stuckCounter = 0;
                    return true;
                }
            }
        } else if (stuckCounter >= CONFIG.STUCK_WARN_THRESHOLD) {
            log('warn', '⚠️', `Potential stuck: ${stuckCounter}x on [${currentState}]`);
        }

        return false;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║            🔄 MAIN ENGINE LOOP                              ║
    // ╚══════════════════════════════════════════════════════════════╝

    function engineLoop() {
        engineStats.loops++;
        const currentState = getActiveScreen();
        refreshVisiblePokemonInfoCache();
        ensureBotControlPanel();
        syncCatchScreenSession(currentState);

        if (isBotPaused()) {
            return;
        }

        const shouldTrackRunState = ![
            'title-screen',
            'challenge-select',
            'weekly-select',
            'history-region-select',
            'endless-stage-select',
            'IDLE_TRANSITION'
        ].includes(currentState);
        const suppressRecentGameOverTelemetry = currentState === 'gameover-screen' &&
                                                !currentRunTelemetry &&
                                                Date.now() - lastRunFinalizedAt < 10000;
        if ((shouldTrackRunState || currentRunTelemetry) && !suppressRecentGameOverTelemetry) {
            updateRunProgress(currentState);
        }

        // Log state transitions
        if (currentState !== lastLoggedState) {
            log('info', '🤖', `State: [${currentState}]`);
            engineStats.screens[currentState] = (engineStats.screens[currentState] || 0) + 1;
            if (currentRunTelemetry) {
                recordRunEvent('screen-enter', { screen: currentState });
            }
            lastLoggedState = currentState;
        }

        // Anti-stuck check
        if (antiStuckCheck(currentState)) return;

        // State machine
        switch (currentState) {
            // --- Overlays (highest priority) ---
            case 'EEVEE_CHOICE':
                handleEeveeChoice();
                break;

            case 'EVO_OVERLAY':
                handleEvoOverlay();
                break;

            case 'ITEM_EQUIP_MODAL':
                handleItemEquipModal();
                break;

            // --- Core gameplay screens ---
            case 'map-screen':
                handleMapScreen();
                break;

            case 'battle-screen':
                handleBattleScreen();
                break;

            case 'catch-screen':
                handleCatchScreen();
                break;

            case 'item-screen':
                handleItemScreen();
                break;

            case 'passive-screen':
                handlePassiveScreen();
                break;

            case 'swap-screen':
                handleSwapScreen();
                break;

            case 'trade-screen':
                handleTradeScreen();
                break;

            case 'shiny-screen':
                handleShinyScreen();
                break;

            case 'badge-screen':
                handleBadgeScreen();
                break;

            case 'stat-buff-screen':
                handleStatBuffScreen();
                break;

            case 'elite-prep-screen':
                handleElitePrepScreen();
                break;

            case 'transition-screen':
                handleTransitionScreen();
                break;

            // --- Meta screens ---
            case 'gameover-screen':
                handleGameOverScreen();
                break;

            case 'win-screen':
                handleWinScreen();
                break;

            case 'endless-stage-complete':
                handleStageComplete();
                break;

            case 'title-screen':
                handleTitleScreen();
                break;

            case 'challenge-select':
                handleChallengeSelectScreen();
                break;

            case 'weekly-select':
                handleWeeklySelectScreen();
                break;

            case 'starting-item-screen':
                handleStartingItemScreen();
                break;

            case 'trainer-screen':
                handleTrainerScreen();
                break;

            case 'starter-screen':
                handleStarterScreen();
                break;

            case 'endless-stage-select':
                handleEndlessStageSelect();
                break;

            case 'history-region-select':
                handleHistoryRegionSelect();
                break;

            // --- Fallback / transitions ---
            default:
                const nextBtn = document.querySelector(
                    '.btn-next, #btn-stage-continue, .choice-skip-btn, ' +
                    '#btn-continue-battle, #btn-auto-battle, ' +
                    '#starting-item-choices > *, #starting-items > *, .starting-item-card, .starting-item-option, [data-starting-item]'
                );
                if (nextBtn && isVisible(nextBtn)) {
                    triggerRealClick(nextBtn);
                }
                break;
        }
    }

    // ╔══════════════════════════════════════════════════════════════╗
