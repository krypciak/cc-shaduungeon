export function generateBattleRoom(map, theme, x1, y1, prevMapName, puzzleStartPosSide, rc, tunnelQueue) {
    const battleSel = blitzkrieg.util
        .getSelFromRect({ x: x1, y: y1, width: rc.battle.width, height: rc.battle.height }, map.name, 0)

    const spawnerSize = ig.copy(battleSel.size)
    spawnerSize.x += rc.battle.spacing
    spawnerSize.y += rc.battle.spacing
    spawnerSize.width -= rc.battle.spacing*2
    spawnerSize.height -= rc.battle.spacing*2
    const elements = [1,1,1,1]
    const { spawner, enemies } = rouge.enemyDb.generateSpawner(spawnerSize, rc.enemyGroup, 1, 1, elements)
    spawner.level = map.masterLevel
    spawner.settings.spawnCondition = '!' + rc.battleDoneCond

    const tunnelSides = [1,1,1,1]
    let tunnelSide = rc.battleTunnel.side
    if ((tunnelSide+2)%4 == puzzleStartPosSide) {
        console.log('fatal error, not implemented')
        tunnelSide = (tunnelSide + 1)%4
    }
    tunnelSides[(tunnelSide + 2)%4] = 0
    const roomSize = rouge.roomComponents.rectRoom(map, battleSel.size, theme, 0, [1,1,1,1], null, {
        name: 'battle1',
        side: tunnelSide,
        drawSides: tunnelSides,
        prefX: battleSel.size.x + battleSel.size.width/2,
        prefY: battleSel.size.y + battleSel.size.height/2,
        width: rc.battleTunnel.width,
        height: rc.battleTunnel.height,
        door: {
            destMap: prevMapName,
            side: tunnelSide,
            marker: 'start',
            destMarker: 'end',
            cond: '',
            noNavMap: true,
        },
        entarenceCond: rc.battleStartCond + ' && !' + rc.battleDoneCond,
        queue: tunnelQueue,
    })


    const barrierMap = rouge.roomComponents.executeTunnelQueue(map, tunnelQueue)

    const enemyCount = rouge.entitySpawn.getSpawnerEnemyCountAndSetGroup(spawner, rc.enemyGroup)
    map.entities.push(spawner)


    const puzzleExitWall = barrierMap['puzzle'].exitWall
    map.entities.push(puzzleExitWall)

    map.entities.push(rouge.entitySpawn
        .blocker(puzzleExitWall.rect, map.masterLevel, 'BLOCK', '!' + rc.battleDoneCond))

    const enemyCounter = rouge.entitySpawn.enemyCounter(
        roomSize.x + roomSize.width/2 - 16, roomSize.y + roomSize.height/2 - 16, map.masterLevel, rc.enemyGroup, enemyCount, rc.battleDoneCond)

    map.entities.push(enemyCounter)
    const glowingLineSize = Math.abs(
        puzzleExitWall.side % 2 == 0 ? puzzleExitWall.rect.y - enemyCounter.y : puzzleExitWall.rect.x - enemyCounter.x)
    map.entities.push(rouge.entitySpawn
        .glowingLinePerpendicular(puzzleExitWall.rect, map.masterLevel, puzzleExitWall.side, glowingLineSize, rc.battleDoneCond))

    const entarenceBarrier = barrierMap[rc.enemyGroup].entarenceBarrier
    map.entities.push(entarenceBarrier)

    map.entities.push(rouge.entitySpawn
        .blocker(entarenceBarrier.rect, map.masterLevel, 'PBLOCK', '!' + rc.battleStartCond))

    map.entities.push(rouge.entitySpawn
        .touchTriggerParallel(entarenceBarrier.rect, map.masterLevel, entarenceBarrier.side, 10, 32, rc.battleStartCond))

    const puzzleEntarenceWall = barrierMap['puzzle'].entarenceWall
    const markerPos = { 
        x: puzzleEntarenceWall.x + puzzleEntarenceWall.rect.width/2,
        y: puzzleEntarenceWall.y + puzzleEntarenceWall.rect.height/2 }
    const puzzleEntarenceCheckpoint = 'puzzleEntarenceCheckpoint'
    map.entities.push(rouge.entitySpawn
        .marker(markerPos.x, markerPos.y, map.masterLevel, puzzleEntarenceCheckpoint))

    map.entities.push(rouge.entitySpawn
        .eventTrigger(markerPos.x + 80, markerPos.y, map.masterLevel, {
            name: 'battleEndEvent',
            startCondition: rc.battleDoneCond,
            eventType: 'PARALLEL',
            endCondition: 'false',
            triggerType: 'ONCE_PER_ENTRY',
            event: [
                {
                    entity: { player: true },
                    marker: { global: true, name: puzzleEntarenceCheckpoint },
                    type: 'SET_RESPAWN_POINT'
                },
                { type: 'SAVE' }
            ]
        }))

    const tunnelRect = barrierMap['battle1'].rect
    const eventTriggered = false
    // aggro all enemies on the map when entering the touch trigger
    ig.game.addons.varsChanged.push({ onVarsChanged: () => {  
        if (! eventTriggered && ig.vars.storage.tmp.battle1) {
            eventTriggered = true
            for (const enemy of ig.game.getEntitiesByType(ig.ENTITY.Enemy)) {
                if (enemy.enemyGroup == rc.enemyGroup) {
                    enemy.setTarget(ig.game.playerEntity)
                    const spacing = 10
                    const x = enemy.coll.pos.x
                    const y = enemy.coll.pos.y
                    // if the enemy is behind a barrier teleport them inside the battle room
                    if ((x + spacing >= tunnelRect.x ||
                         x - spacing >= tunnelRect.x) && 
                        (x + spacing <= tunnelRect.x2 ||
                         x - spacing <= tunnelRect.x2) &&
                        (y + spacing >= tunnelRect.y  ||
                         y - spacing >= tunnelRect.y) && 
                        (y + spacing <= tunnelRect.y2 ||
                         y - spacing <= tunnelRect.y2)) {
                        
                        enemy.setPos(spawnerSize.x, spawnerSize.y, 0)
                    }
                }
            }
        }
    }})

    rouge.enemyDb.spawnEntityMapObjects(map, battleSel.size, tunnelSide, puzzleStartPosSide, enemies, elements)

    return { battleSel, barrierMap, tunnelSide, roomSize }
}
