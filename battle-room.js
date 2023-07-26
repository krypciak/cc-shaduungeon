export class BattleRoom {
    constructor() {
        this.currentLevel = 1
        this.currentDifficulty = 0.5
    }

    generateRoom(map, theme, x1, y1, prevMapName, puzzleStartPosSide, rc, tunnelQueue) {
        const battleSel = ig.blitzkrieg.util
            .getSelFromRect({ x: x1, y: y1, width: rc.battle.width, height: rc.battle.height }, map.name, 0)

        ig.blitzkrieg.msg('rouge', 'difficulty: ' + this.currentDifficulty, 1)
        ig.blitzkrieg.msg('rouge', 'level: ' + this.currentLevel, 1)
        const spawnerSize = ig.copy(battleSel.size)
        spawnerSize.x += rc.battle.spacing
        spawnerSize.y += rc.battle.spacing
        spawnerSize.width -= rc.battle.spacing*2
        spawnerSize.height -= rc.battle.spacing*2
        const elements = [1,1,1,1]
        const { spawner, enemies } = ig.rouge.enemyDb.generateSpawner(spawnerSize, rc.enemyGroup, this.currentDifficulty, this.currentLevel, elements)
        spawner.level = map.masterLevel
        spawner.settings.spawnCondition = '!' + rc.battleDoneCond
        // this.currentLevel += 7
        // this.currentDifficulty += 0.8

        const tunnelSides = [1,1,1,1]
        let tunnelSide = 3
        if ((tunnelSide+2)%4 == puzzleStartPosSide) {
            tunnelSide = (puzzleStartPosSide + 1)%4
        }
        tunnelSides[(tunnelSide + 2)%4] = 0
        const roomSize = ig.rouge.roomComponents.rectRoom(map, battleSel.size, theme, 0, [1,1,1,1], null, {
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


        const barrierMap = ig.rouge.roomComponents.executeTunnelQueue(map, tunnelQueue)

        const enemyCount = ig.rouge.entitySpawn.getSpawnerEnemyCountAndSetGroup(spawner, rc.enemyGroup)
        map.entities.push(spawner)


        const puzzleExitWall = barrierMap['puzzle'].exitWall
        map.entities.push(puzzleExitWall)

        map.entities.push(ig.rouge.entitySpawn
            .blocker(puzzleExitWall.rect, map.masterLevel, 'BLOCK', '!' + rc.battleDoneCond))

        const enemyCounter = ig.rouge.entitySpawn.enemyCounter(
            roomSize.x + roomSize.width/2 - 16, roomSize.y + roomSize.height/2 - 16, map.masterLevel, rc.enemyGroup, enemyCount, rc.battleDoneCond)

        map.entities.push(enemyCounter)
        const glowingLineSize = Math.abs(
            puzzleExitWall.side % 2 == 0 ? puzzleExitWall.rect.y - enemyCounter.y : puzzleExitWall.rect.x - enemyCounter.x)
        map.entities.push(ig.rouge.entitySpawn
            .glowingLinePerpendicular(puzzleExitWall.rect, map.masterLevel, puzzleExitWall.side, glowingLineSize, rc.battleDoneCond))

        const entarenceBarrier = barrierMap[rc.enemyGroup].entarenceBarrier
        map.entities.push(entarenceBarrier)

        map.entities.push(ig.rouge.entitySpawn
            .blocker(entarenceBarrier.rect, map.masterLevel, 'PBLOCK', '!' + rc.battleStartCond))

        map.entities.push(ig.rouge.entitySpawn
            .touchTriggerParallel(entarenceBarrier.rect, map.masterLevel, entarenceBarrier.side, 10, 32, rc.battleStartCond))

        const puzzleEntarenceWall = barrierMap['puzzle'].entarenceWall
        const markerPos = { 
            x: puzzleEntarenceWall.x + puzzleEntarenceWall.rect.width/2,
            y: puzzleEntarenceWall.y + puzzleEntarenceWall.rect.height/2 }
        const puzzleEntarenceCheckpoint = 'puzzleEntarenceCheckpoint'
        map.entities.push(ig.rouge.entitySpawn
            .marker(markerPos.x, markerPos.y, map.masterLevel, puzzleEntarenceCheckpoint))

        map.entities.push(ig.rouge.entitySpawn
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

        ig.rouge.enemyDb.spawnEntityMapObjects(map, battleSel.size, tunnelSide, puzzleStartPosSide, enemies, elements)

        return { battleSel, barrierMap, tunnelSide, roomSize }
    }
}
