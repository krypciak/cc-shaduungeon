import { MapEntity } from '@root/util/entity'
import { AreaInfo } from '@root/area/area-builder'
import { RoomTheme, RoomThemeConfig } from '@root/room/themes'
import { CCMap, MapLayer } from '@root/util/map'
import { Dir, MapPoint, MapRect, PosDir } from '@root/util/pos'
import { assert, assertBool, deepCopy } from '@root/util/misc'
import { Room, RoomIO, RoomIOTpr, Tpr } from '@root/room/room'
import { getPosDirFromRoomIO } from '@root/room/tunnel-room'
import { ArmRuntime, ArmRuntimeEntry } from '@root/dungeon/dungeon-arm'

export namespace RoomPlaceVars {
    export function fromRawMap(map: sc.MapModel.Map, theme: RoomTheme, areaInfo: AreaInfo): RoomPlaceVars {
        let background: number[][] | undefined
        let shadow: number[][] | undefined
        let light: number[][] | undefined
        const colls: number[][][] = []
        const navs: number[][][] = []

        for (let i = 0; i < map.layer.length; i++) {
            const layer: sc.MapModel.MapLayer = map.layer[i]
            if (layer.level == map.masterLevel && layer.type == 'Background') {
                if (layer.name == 'NEW_BACKGROUND') {
                    background = layer.data
                } else if (layer.name == 'NEW_SHADOW') {
                    shadow = layer.data
                }
            }
            switch (layer.type) {
                case 'Collision': colls.push(layer.data); break
                case 'Navigation': navs.push(layer.data); break
                case 'Light': light = layer.data; break
             }
        }
        assert(background)
        assert(light)

        return {
            map: new CCMap(map.name, map.levels, map.mapWidth, map.mapHeight,
                map.masterLevel, map.attributes, map.entities, MapLayer.convertArray(map.layer)),
            background, shadow, light, colls, navs,
            entities: map.entities,
            theme, tc: theme.config,
            masterLevel: map.masterLevel,
            areaInfo,
        }
    }
}

export interface RoomPlaceVars {
    map: CCMap
    background: number[][]
    shadow?: number[][]
    light: number[][]
    colls: number[][][]
    navs: number[][][]
    entities: MapEntity[]
    theme: RoomTheme
    tc: RoomThemeConfig
    masterLevel: number
    areaInfo: AreaInfo
}

export abstract class MapBuilder {
    static async placeBuilders(entries: { entry: ArmRuntimeEntry, arm: ArmRuntime }[]): Promise<void[]> {
        let roomPreplaceFunctions = (entries.flatMap(e => {
            const builder = e.entry.builder
            assertBool(e.arm.stack.findIndex(e1 => e1.builder === builder) != -1)
            const isArmEnd: boolean = e.arm.stack.last().builder === builder
            return builder.rooms.flatMap(r => {
                r.isArmEnd = isArmEnd
                r.preplaceFunctions.forEach(e1 => {
                    e1.func = e1.func.bind(r, e.arm, builder)
                })
                return r.preplaceFunctions
            })}) as ({ order: number, func: () => void }[]))
            .sort((e1, e2) => e1.order - e2.order)
        roomPreplaceFunctions.forEach(o => o.func())

        entries.forEach(e => e.entry.builder.preplace(e.arm))

        return new Promise<void[]>(async (resolve) => {
            const promises: Promise<void>[] = []
            for (const e of entries) {
                const b = e.entry.builder
                promises.push(new Promise<void>((resolve) => {
                    b.place(e.arm).then(() => {
                        b.save().then(() => {
                            resolve()
                        })
                    })
                }))
            }
            resolve(Promise.all(promises))
        })
    }

    /* pre place vars */
    rooms: Room[] = []

    abstract entarenceRoom: Room

    abstract exitCount: number

    entarenceOnWall!: PosDir<MapPoint> | null
    mapIOs: { io: RoomIO; room: Room, toDelete?: boolean }[] = []
    mapIOsOnWall!: (PosDir<MapPoint> | null)[]

    /* place vars */
    size?: MapPoint
    trimOffset?: MapPoint
    rpv?: RoomPlaceVars
    pathParent?: string
    name?: string
    path?: string
    displayName?: string

    builtMap?: sc.MapModel.Map

    constructor(
        public levelCount: number,
        public areaInfo: AreaInfo,
        public theme: RoomTheme,
    ) { }

    addRoom(room: Room) {
        this.rooms.push(room)
    }

    setOnWallPositions() {
        this.entarenceOnWall = getPosDirFromRoomIO(this.entarenceRoom, this.entarenceRoom.primaryEntarence)
        this.mapIOsOnWall = []
        assertBool(this.mapIOs.length == this.exitCount)
        for (const io of this.mapIOs) {
            this.mapIOsOnWall.push(getPosDirFromRoomIO(io.room, io.io))
        }
    }

    copy(): MapBuilder {
        return deepCopy(this, new Set(['areaInfo', 'theme']))
    }

    getAllTeleportFields(): RoomIOTpr[] {
        const arr: RoomIOTpr[] = []
        this.rooms.forEach(r => {
            if (r.teleportFields) { arr.push(...r.teleportFields) }
        })
        return arr
    }

    abstract prepareToArrange(dir: Dir, isEnd: boolean, arm: ArmRuntime): boolean
    
    abstract decideDisplayName(index: number): Promise<string>

    preplace(arm: ArmRuntime) {
        if (arm.parentArm) {
            for (const obj1 of this.mapIOs) {
                const tpr: Tpr = obj1.io.getTpr()
                if (! tpr.backToArm) { continue }
                assert(arm.parentArmIndex)
                const parentArmEndEntry: ArmRuntimeEntry = arm.parentArm.stack.last()
                tpr.destMap = parentArmEndEntry.builder.path
                const tfs: RoomIOTpr[] = parentArmEndEntry.builder.getAllTeleportFields()
                const remoteTpr: Tpr = tfs[arm.parentArmIndex].getTpr()
                tpr.destMarker = remoteTpr.name

                remoteTpr.destMap = this.path
                remoteTpr.destMarker = tpr.name

                Tpr.replaceConditionTarget(tpr, remoteTpr)
                Tpr.replaceConditionTarget(remoteTpr, tpr)
            }
        }
    }

    /* place functions*/

    trimRoomPositions(additionalSpace: MapRect) {
        const newSize: MapRect = new MapRect(10000, 10000, 0, 0)

        for (const room of this.rooms) {
            const rect = room
            if (rect.x < newSize.x) { newSize.x = rect.x }
            if (rect.y < newSize.y) { newSize.y = rect.y }
            if (rect.x2() > newSize.width ) { newSize.width = rect.x2() }
            if (rect.y2() > newSize.height ) { newSize.height = rect.y2() }
        }

        const offset: MapPoint = MapPoint.fromVec(newSize)
        offset.x -= additionalSpace.x
        offset.y -= additionalSpace.y
        this.trimOffset = offset
        this.size = new MapPoint(
            Math.ceil(newSize.width - offset.x + additionalSpace.width),
            Math.ceil(newSize.height - offset.y + additionalSpace.height))

        Vec2.mulC(offset, -1)
        for (const room of this.rooms) {
            room.offsetBy(offset)
        }
    }

    createEmptyMap() {
        assert(this.theme); assert(this.path); assert(this.size)
        const rpv: RoomPlaceVars = CCMap.getEmpty(this.size, this.levelCount, this.theme, this.path, this.areaInfo)
        this.rpv = rpv
    }

    async place(arm: ArmRuntime) {
        assert(this.path)

        this.trimRoomPositions(new MapRect(3, 10, 4, 4))
        this.createEmptyMap()
        assert(this.rpv)
        for (const room of this.rooms.sort((a, b) => a.placeOrder - b.placeOrder)) {
            const rpv: RoomPlaceVars | void = await room.place(this.rpv, arm)
            if (rpv) {
                this.rpv = rpv
            }
        }

        if (! dnggen.debug.dontDiscoverAllMaps) {
            ig.vars.storage.maps[this.path] = {}
        }
    }

    save(): Promise<void> {
        return this.areaInfo.paths.saveMap(this)
    }
}
