import { Dir, DirUtil, EntityPoint, EntityRect } from './util.js'

let mapId: number = 1000

export interface MapEntity extends sc.MapModel.MapEntity { }

export namespace MapTransporter {
    export function check(e: MapEntity): e is MapTransporter {
        return 'map' in e.settings && 'marker' in e.settings && 'dir' in e.settings
    }
}

// Door, Teleport Ground itd.
export interface MapTransporter extends MapEntity {
    settings: {
        name: string
        mapId: number
        map: string
        dir: keyof typeof Dir
        marker: string
        condition?: string
        hideCondition?: string 
    }
}

interface DoorSettings extends ig.ENTITY.Door.Settings {
    dir: keyof typeof Dir
}

export class MapDoor implements MapTransporter {
    type: string = 'Door'
    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: DoorSettings) {}
    
    static new(pos: EntityPoint, level: number, dir: Dir,
        marker: string, destMap: string, destMarker: string, condition?: string): MapDoor {

        return new MapDoor(pos.x, pos.y, level, {
            name: marker,
            dir: DirUtil.convertToString(DirUtil.flip(dir)),
            condition: condition ?? '',
            map: destMap,
            marker: destMarker,
            hideCondition: '',
            blockEventCondition: '',
            variation: '',
            doorType: 'DEFAULT',
            mapId: mapId++, 
        })
    }
}

export class MapElementPole implements MapEntity {
    type: string = 'ElementPole'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.ElementPole.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, poleType: keyof typeof sc.TERMO_POLE_TYPE): MapElementPole {
        return new MapElementPole(pos.x, pos.y, level, {
            name, mapId: mapId++,
            poleType,
            group: ''
        })
    }
}

export class MapGlowingLine implements MapEntity {
    type: string = 'GlowingLine'
    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.GlowingLine.Settings) {
            
        if (settings.size.x % 8 != 0 || settings.size.y % 8 != 0) {
            throw new Error('GlowingLine size has to be a multiple of 8')
        }
    }

    static new(pos: EntityPoint, level: number, name: string, size: EntityPoint, condition?: string): MapGlowingLine {
        return new MapGlowingLine(pos.x, pos.y, level, {
            name, size, condition: condition ?? '', mapId: mapId++, 
        })
    }

    static newPerpendicular(rect: EntityRect, level: number, name: string, dir: Dir, size: number, condition: string): MapGlowingLine {
        const pos: EntityPoint = new EntityPoint(rect.x, rect.y)
        size = Math.floor(size / 8)*8
        switch (dir) {
            case Dir.NORTH: size -= 32 + 4; pos.y = pos.y - size; break
            case Dir.EAST:  pos.x = pos.x + 0; break
            case Dir.SOUTH: pos.y = pos.y + 0; break
            case Dir.WEST:  size -= 32; pos.x = pos.x - size; break
        }
        const size1: EntityPoint = new EntityPoint(size, size)
        if (DirUtil.isVertical(dir)) {
            pos.x += rect.width/2 - 4
            size1.x = 8
        } else {
            pos.y += rect.height/2 - 4
            size1.y = 8
        }
        return MapGlowingLine.new(pos, level, name, size1, condition)
    }
}

class MapScalableProp implements MapEntity {
    type: string = 'ScalableProp'
    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.ScalableProp.Settings) {
            
        if (settings.size && (settings.size.x % 8 != 0 || settings.size.y % 8 != 0)) {
            throw new Error('ScalableProp size has to be a multiple of 8')
        }
    }
}

export class MapBarrier extends MapScalableProp {
    static new(rect: EntityRect, level: number, name: string, condition?: string): MapBarrier {
        const barrierType: string = rect.width == 8 ? 'barrierV' : 'barrierH'
        return new MapScalableProp(rect.x, rect.y, level, {
            name,
            mapId: mapId++,
            patternOffset: { x: 0, y: 0 },
            propConfig: { ends: null, name: barrierType, sheet: 'dungeon-ar' },
            size: { x: rect.width, y: rect.height },
            spawnCondition: condition ?? '',
            blockNavMap: false,
        })
    }
}

export class MapWall implements MapEntity {
    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public type: string,
        public settings: ig.ENTITY.WallBase.Settings) {

        if (this.type != 'WallVertical' && this.type != 'WallHorizontal') {
            throw new Error('Wall type has to be either WallVertical or WallHorizontal')
        }

        if (settings.size && (settings.size.x % 8 != 0 || settings.size.y % 8 != 0)) {
            throw new Error('Wall size has to be a multiple of 8')
        }
    }

    isVertical(): boolean {
        return this.type == 'WallVertical'
    }
        
    static new(rect: EntityRect, level: number, name: string, condition?: string): MapWall {
        let settings: ig.ENTITY.WallBase.Settings = {
            name, mapId: mapId++,
            skipRender: false,
            collType: 'BLOCK',
            condition: condition ?? '',
            size: { x: rect.width, y: rect.height },
            wallZHeight: 32,
        }
        const barrierType: string = rect.width == 8 ? 'WallVertical' : 'WallHorizontal'
        if (barrierType == 'WallVertical') {
            const newSettings: any = settings
            newSettings.topEnd = 'STOP'
            newSettings.bottomEnd = 'STOP'
            settings = newSettings as ig.ENTITY.WallVertical.Settings
        } else {
            const newSettings: any = settings
            newSettings.topEnd = 'STOP'
            newSettings.bottomEnd = 'STOP'
            settings = newSettings as ig.ENTITY.WallHorizontal.Settings
        }

        return new MapWall(rect.x, rect.y, level, barrierType, settings)
    }
}

export class MapHiddenBlock implements MapEntity {
    type: string = 'HiddenBlock'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.HiddenBlock.Settings) {

        if (settings.shape && ! Object.keys(ig.COLLSHAPE).includes(settings.shape)) { throw new Error('Invalid HiddenBlock shape') }
        if (settings.heightShape && ! Object.keys(ig.COLL_HEIGHT_SHAPE).includes(settings.heightShape)) { throw new Error('Invalid HiddenBlock heightShape') }
        if (settings.terrain && ! Object.keys(ig.TERRAIN).includes(settings.terrain)) { throw new Error('Invalid HiddenBlock terrain') }
        if (settings.collType && ! Object.keys(ig.COLLTYPE).includes(settings.collType)) { throw new Error('Invalid HiddenBlock collType') }
    }
        
    static new(pos: EntityPoint, level: number, name: string, size: EntityPoint,
        collType: keyof typeof ig.COLLTYPE,
        shape: keyof typeof ig.COLLSHAPE,
        terrain: keyof typeof ig.TERRAIN,
        heightShape: keyof typeof ig.COLL_HEIGHT_SHAPE,
        zHeight: number,
        condition: string = ''): MapHiddenBlock {

        return new MapHiddenBlock(pos.x, pos.y, level, {
            name, mapId: mapId++,
            size, collType, shape, terrain, heightShape, zHeight, spawnCondition: condition,
            blockNavMap: false,
        })
    }

    newInvisibleBlocker(pos: EntityPoint, level: number, size: EntityPoint, condition: string = ''): MapHiddenBlock {
        return MapHiddenBlock.new(pos, level, 'invisibleBlocker' + mapId, size, 'BLOCK', 'RECTANGLE', 'NORMAL', 'NONE', 256, condition)
    }

    newInvisibleProjectileBlocker(pos: EntityPoint, level: number, size: EntityPoint, condition: string = ''): MapHiddenBlock {
        return MapHiddenBlock.new(pos, level, 'invisibleBlocker' + mapId, size, 'PBLOCK', 'RECTANGLE', 'NORMAL', 'NONE', 256, condition)
    }
}

export class MapEnemyCounter implements MapEntity {
    type: string = 'EnemyCounter'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.EnemyCounter.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, enemyGroup: string, enemyCount: number,
        preVariable: string = '', postVariable: string = '' , countVariable: string = ''): MapEnemyCounter {
        return new MapEnemyCounter(pos.x, pos.y, level, {
            name,
            mapId: mapId++,
            enemyGroup, enemyCount, preVariable, postVariable, countVariable,
        })
    }
}

export class MapTouchTrigger implements MapEntity {
    type: string = 'TouchTrigger'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.TouchTrigger.Settings) { }

    static new(rect: EntityRect, level: number, name: string, variable: string) : MapTouchTrigger {
        return new MapTouchTrigger(rect.x, rect.y, level, {
            name,
            mapId: mapId++,
            size: { x: rect.width, y: rect.height },
            variable,
            type: 'SET_TRUE',
            zHeight: 64,
            reactToParty: false,
            shape: 'RECTANGLE',
            startCondition: '',
        })
    }

    static newParallel(rect: EntityRect, level: number, name: string, dir: Dir, offset: number, size: number, variable: string): MapTouchTrigger {
        rect = ig.copy(rect)
        switch (dir) {
            case Dir.NORTH:
                rect.x = rect.x - size
                rect.y = rect.y + 12 + offset
                break
            case Dir.EAST:
                rect.x = rect.x - size - offset
                rect.y = rect.y - size
                break
            case Dir.SOUTH:
                rect.x = rect.x - size
                rect.y = rect.y - 8 - size - offset
                break
            case Dir.WEST:
                rect.x = rect.x + 8 + offset
                rect.y = rect.y - size
                break
        }
        if (DirUtil.isVertical(dir)) {
            rect.width = rect.width + 2*size
            rect.height = size
        } else {
            rect.width = size
            rect.height = rect.height + 2*size
        }
        return MapTouchTrigger.new(rect, level, name, variable)

    }
}

export class MapFloorSwitch implements MapEntity {
    type: string = 'FloorSwitch'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.FloorSwitch.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, variable: string): MapFloorSwitch {
        return new MapFloorSwitch(pos.x, pos.y, level, {
            name,
            mapId: mapId++,
            variable,
            switchType: 'PERMANENT',
            lockCondition: null,
        })
    }
}

export class MapWaterBubblePanel implements MapEntity {
    type: string = 'WaterBubblePanel'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.WaterBubblePanel.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, coalCoolTime?: number): MapWaterBubblePanel {
        return new MapWaterBubblePanel(pos.x, pos.y, level, {
            name,
            mapId: mapId++,
            coalCoolTime,
        })
    }
}

export class MapWaveTeleport implements MapEntity {
    type: string = 'WaveTeleport'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.WaveTeleport.Settings) { }

    static new(pos: EntityPoint, level: number, name: string): MapWaveTeleport {
        return new MapWaveTeleport(pos.x, pos.y, level, {
            name,
            mapId: mapId++,
        })
    }
}

export class MapBallChanger implements MapEntity {
    type: string = 'BallChanger'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.BallChanger.Settings) { }

    static newChangeDir(pos: EntityPoint, level: number, name: string, dir: ig.ActorEntity.FACE8): MapBallChanger {
        return new MapBallChanger(pos.x, pos.y, level, {
            name, mapId: mapId++,
            changerType: {
                type: sc.BALL_CHANGER_TYPE.CHANGE_DIR,
                options: { dir: DirUtil.convertToStringFace8(dir) }
            }
        })
    }

    static newChangeSpeed(pos: EntityPoint, level: number, name: string, factor: number): MapBallChanger {
        return new MapBallChanger(pos.x, pos.y, level, {
            name, mapId: mapId++,
            changerType: {
                type: sc.BALL_CHANGER_TYPE.CHANGE_SPEED,
                options: { factor }
            }
        })
    }

    static newResetSpeed(pos: EntityPoint, level: number, name: string): MapBallChanger {
        return new MapBallChanger(pos.x, pos.y, level, {
            name, mapId: mapId++,
            changerType: {
                type: sc.BALL_CHANGER_TYPE.RESET_SPEED,
                options: { }
            }
        })
    }

    static newChangeElement(pos: EntityPoint, level: number, name: string, element: sc.ELEMENT): MapBallChanger {
        return new MapBallChanger(pos.x, pos.y, level, {
            name, mapId: mapId++,
            changerType: {
                type: sc.BALL_CHANGER_TYPE.CHANGE_ELEMENT,
                options: { element }
            }
        })
    }
}

export class MapCompressor implements MapEntity {
    type: string = 'Compressor'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.WaveTeleport.Settings) { }

    static new(pos: EntityPoint, level: number, name: string): MapCompressor {
        return new MapCompressor(pos.x, pos.y, level, {
            name, mapId: mapId++,
        })
    }
}

export class MapAntiCompressor implements MapEntity {
    type: string = 'AntiCompressor'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.AntiCompressor.Settings) { }

    static new(pos: EntityPoint, level: number, name: string): MapAntiCompressor {
        return new MapAntiCompressor(pos.x, pos.y, level, {
            name,
            mapId: mapId++,
        })
    }
}

export class MapMagnet implements MapEntity {
    type: string = 'Magnet'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.Magnet.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, dir: Dir, altDirs?: string[]): MapMagnet {
        return new MapMagnet(pos.x, pos.y, level, {
            name, mapId: mapId++,
            dir: DirUtil.convertToString(dir), altDirs
        })
    }
}

export class MapTeslaCoil implements MapEntity {
    type: string = 'TeslaCoil'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.TeslaCoil.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, coilType: keyof typeof sc.TESLA_COIL_TYPE): MapTeslaCoil {
        return new MapTeslaCoil(pos.x, pos.y, level, {
            name, mapId: mapId++,
            coilType
        })
    }
}

export class MapEnemySpawner implements MapEntity {
    type: string = 'EnemySpawner'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.EnemySpawner.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, size: EntityPoint, enemyTypes: ig.ENTITY.EnemySpawner.Entry[], onActiveClear: boolean): MapEnemySpawner {
        return new MapEnemySpawner(pos.x, pos.y, level, {
            name, mapId: mapId++,
            size, enemyTypes, onActiveClear,
        })
    }
}

export class MapMarker implements MapEntity {
    type: string = 'Marker'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.Marker.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, dir: ig.ActorEntity.FACE8): MapMarker {
        return new MapMarker(pos.x, pos.y, level, {
            name, mapId: mapId++,
            dir: DirUtil.convertToStringFace8(dir)
        })
    }
}

export class MapEventTrigger implements MapEntity {
    type: string = 'EventTrigger'

    constructor(
        public x: number, 
        public y: number, 
        public level: number, 
        public settings: ig.ENTITY.EventTrigger.Settings) { }

    static new(pos: EntityPoint, level: number, name: string, 
        eventType?: keyof typeof ig.EVENT_TYPE,
        startCondition?: string,
        triggerType?: keyof typeof ig.EVENT_TRIGGER_TYPE,
        loadCondition?: string,
        event?: ig.Event.Settings): MapEventTrigger {
        return new MapEventTrigger(pos.x, pos.y, level, {
            name, mapId: mapId++,
            eventType, startCondition, triggerType, loadCondition, event
        })
    }
}


// boldPntMarker name: 'boldPnt' + index, 
/*

static function enemySpawner(rect, level, group, enemies) {
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

static function getSpawnerEnemyCountAndSetGroup(spawner, enemyGroup) {
    let enemyCount = 0
    for (const enemyType of spawner.settings.enemyTypes) {
        enemyCount += enemyType.count
        enemyType.info.group = enemyGroup
    }
    return enemyCount
}
*/
