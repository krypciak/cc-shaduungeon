export class EntitySpawn {
    constructor() {
        this.mapId = 1000
    }

    doorDirName(side) {
        switch (side) {
        case 0: return 'SOUTH'
        case 1: return 'WEST'
        case 2: return 'NORTH'
        case 3: return 'EAST'
        }
    }

    door(x, y, level, ds) {
        return {
            type: 'Door',
            x, y, level,
            settings: {
                name: ds.marker,
                dir: this.doorDirName(ds.side),
                condition: ds.cond,
                map: ds.destMap,
                marker: ds.destMarker,
                hideCondition: '',
                blockEventCondition: '',
                variation: '',
                doorType: 'DEFAULT',
                mapId: rouge.entitySpawn.mapId++, 
            },
            dir: ds.side
        }
    }

    glowingLinePerpendicular(rect, level, side, size, cond) {
        rect = ig.copy(rect)
        size = Math.floor(size / 8)*8
        switch (side) {
        case 0: size -= 32 + 4; rect.y = rect.y - size; break
        case 1: rect.x = rect.x + 0; break
        case 2: rect.y = rect.y + 0; break
        case 3: size -= 32; rect.x = rect.x - size; break
        }
        if (side % 2 == 0) {
            rect.x = rect.x + rect.width/2 - 4
            rect.width = 8
            rect.height = size
        } else {
            rect.y = rect.y + rect.height/2 - 4
            rect.width = size
            rect.height = 8
        }
        return this.glowingLine(rect, level, cond)
    }

    glowingLine(rect, level, cond) {
        const { x, y, width, height } = rect
        return {
            type: 'GlowingLine',
            x, y, level,
            settings: {
                name: '',
                size: { x: width, y: height },
                condition: cond,
                mapId: rouge.entitySpawn.mapId++, 
            },
            // this used by me, not by the game
            rect,
        }
    }

    barrier(rect, level, cond, side) {
        rect.width = Math.floor(rect.width/8)*8
        rect.height = Math.floor(rect.height/8)*8
        const barrierType = rect.width == 8 ? 'barrierV' : 'barrierH'
        return {
            type: 'ScalableProp',
            x: rect.x,
            y: rect.y,
            level,
            settings: {
                name: '', 
                patternOffset: {x: 0, y: 0}, 
                blockNavMap: false, 
                propConfig: {ends: null, name: barrierType, sheet: 'dungeon-ar'},
                size: {x: rect.width, y: rect.height},
                wallZHeight: 32,
                spawnCondition: (cond ? cond : ''),
                mapId: rouge.entitySpawn.mapId++, 
            },
            // this used by me, not by the game
            rect, side,
        }
    }
    
    wall(rect, level, cond, side) {
        rect.width = Math.floor(rect.width/8)*8
        rect.height = Math.floor(rect.height/8)*8
        const type = rect.width == 8 ? 'WallVertical' : 'WallHorizontal'
        return {
            type, 
            x: rect.x, 
            y: rect.y,
            level,
            settings: {
                skipRender: false,
                topEnd: 'STOP',
                bottomEnd: 'STOP',
                collType: 'BLOCK',
                condition: (cond ? cond : ''),
                size: {x: rect.width, y: rect.height},
                wallZHeight: 32,
                mapId: rouge.entitySpawn.mapId++, 
            },
            // this used by me, not by the game
            rect, side,
        }
    }

    blocker(rect, level, collType, cond) {
        const { x, y, width, height } = rect
        return {
            type: 'HiddenBlock',
            x, y, level,
            settings: {
                collType,
                size: {x: width, y: height},
                zHeight: 128,
                heightShape: 'NONE',
                shape: 'RECTANGLE',
                terrain: 'NORMAL',
                spawnCondition: cond,
                mapId: rouge.entitySpawn.mapId++, 
            },
            rect,
        }
    }

    enemyCounter(x, y, level, enemyGroup, enemyCount, cond) {
        return {
            type: 'EnemyCounter',
            x, y, level,
            settings: { 
                name: '',
                enemyGroup: enemyGroup,
                enemyCount: enemyCount, 
                preVariable: '', 
                postVariable: cond,
                countVariable: '',
                mapId: rouge.entitySpawn.mapId++, 
            }
        }
    }

    touchTriggerParallel(rect, level, side, offset, size, variable) {
        rect = ig.copy(rect)
        switch (side) {
        case 0:
            rect.x = rect.x - size
            rect.y = rect.y + 12 + offset
            break
        case 1:
            rect.x = rect.x - size - offset
            rect.y = rect.y - size
            break
        case 2:
            rect.x = rect.x - size
            rect.y = rect.y - 8 - size - offset
            break
        case 3:
            rect.x = rect.x + 8 + offset
            rect.y = rect.y - size
            break
        }
        if (side % 2 == 0) {
            rect.width = rect.width + 2*size
            rect.height = size
        } else {
            rect.width = size
            rect.height = rect.height + 2*size
        }

        return this.touchTrigger(rect, level, variable)
    }

    touchTrigger(rect, level, variable) {
        return {
            type: 'TouchTrigger',
            x: rect.x, y: rect.y,
            level,
            settings: {
                name: '',
                size: { x: rect.width, y: rect.height },
                type: 'SET_TRUE',
                zHeight: 64,
                reactToParty: false,
                mapId: this.mapId++,
                variable,
            },
            // this used by me, not by the game
            rect,
        }
    }

    getSpawnerEnemyCountAndSetGroup(spawner, enemyGroup) {
        let enemyCount = 0
        for (const enemyType of spawner.settings.enemyTypes) {
            enemyCount += enemyType.count
            enemyType.info.group = enemyGroup
        }
        return enemyCount
    }

    floorSwitch(x, y, level, variable) {
        return {
            type: 'FloorSwitch',
            x, y, level,
            settings: {
                spawnCondition: '',
                switchType: 'PERNAMENT',
                variable,
                lockCondition: '',
            }
        }
    }

    elementPole(x, y, level) {
        return {
            type: 'ElementPole',
            x, y, level,
            settings: {
                name: '',
                poleType:
                'LONG', 
                group: '',
                mapId: this.mapId++,
            }
        }
    }

    waterBubblePanel(x, y, level) {
        return {
            type: 'WaterBubblePanel',
            x, y, level,
            settings: {
                name: '', 
                mapId: this.mapId++,
            }
        }
    }

    waveTeleport(x, y, level) {
        return {
            type: 'WaveTeleport',
            x, y, level,
            settings: {
                name: '', 
                mapId: this.mapId++,
            }
        }
    }

    ballChangerElement(x, y, level, element, side) {
        return {
            type: 'BallChanger',
            x, y, level,
            settings: {
                name: '',
                condition: '',
                changerType: {
                    type: 'CHANGE_ELEMENT',
                    settings: {
                        element,
                        dir: this.doorDirName(side),
                    }
                },
                mapId: this.mapId++,
            }
        }
    }

    compressor(x, y, level) {
        return {
            type: 'Compressor',
            x, y, level,
            settings: {
                name: '', 
                mapId: this.mapId++,
            }
        }
    }

    antiCompressor(x, y, level) {
        return {
            type: 'AntiCompressor',
            x, y, level,
            settings: {
                name: '', 
                mapId: this.mapId++,
            }
        }
    }

    boldPntMarker(x, y, level, index) {
        return {
            type: 'Marker',
            x, y, level,
            settings: {
                name: 'boldPnt' + index, 
                dir: 'NORTH',
                mapId: this.mapId++,
            }
        }
    }

    magnet(x, y, level, side) {
        return {
            type: 'Magnet',
            x, y, level,
            settings: {
                name: '', 
                dir: this.doorDirName(side),
                mapId: this.mapId++,
            }
        }
    }

    // type: SOURCE, EXTENDER, GROUND_DISCHARGE
    teslaCoil(x, y, level, type) {
        return {
            type: 'TeslaCoil',
            x, y, level,
            settings: {
                name: '', 
                coilType: type,
                mapId: this.mapId++,
            }
        }
    }

    enemySpawner(rect, level, group, enemies) {
        const enemyTypes = []
        for (const enemyType of enemies) {
            const obj = {
                info: {
                    group,
                    party: '',
                    face: null,
                    type: enemyType.type,
                    attribs: {},
                },
                count: enemyType.count
            }
            if (enemyType.level) {
                obj.info.level = enemyType.level
            }
            enemyTypes.push(obj)
        }
        return  {
            type: 'EnemySpawner',
            x: rect.x, y: rect.y,
            level,
            settings: {
                name: '',
                size: { x: rect.width, y: rect.height },
                onActivateClear: true,
                enemyTypes,
                spawnCondition: '',
                mapId: rouge.entitySpawn.mapId++, 
            }
        }
    }

    marker(x, y, level, name) {
        return {
            type: 'Marker',
            x, y, level,
            settings: { 
                name,
                dir: 'NORTH', 
                mapId: this.mapId++,
            }
        }
    }

    eventTrigger(x, y, level, settings) {
        settings.mapId = this.mapId++
        return {
            type: 'EventTrigger',
            x, y, level,
            settings,
        }
    }
}
