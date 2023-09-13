import { Mod } from 'ultimate-crosscode-typedefs/modloader/mod'
import { RoomPlaceOrder, RoomType } from '@root/room/room'
import { Dir, bareRect } from '@root/util/pos'
import { AreaViewFloorTypes } from '@root/area/custom-MapAreaContainer'

export {}

declare global {
    type Mod1 = {
        -readonly [K in keyof Mod]: Mod[K]
    } & ({
        isCCL3: true
        id: string
        findAllAssets(): void
    } | {
        isCCL3: false
        name: string
        filemanager: {
            findFiles(dir: string, exts: string[]): Promise<string[]>
        }
        getAsset(path: string): string
        runtimeAssets: Record<string, string>
    })

    interface Math {
        randomSeed(): number
        seedrandomSeed(seed: string): void
    }

    namespace sc {
        interface NEW_GAME_OPTIONS {
            dnggen: sc.NewGameOption;
        }
    }
    namespace ig {
        interface Game {
            preloadLevel(this: this, mapName: string): void
        }
    }
}

/* custom area related */
export type GuiHookMapRoomList = ig.GuiHook & {
    gui: { floor: sc.AreaLoadable.Floor, room: sc.AreaRoomBounds, unlocked: boolean }
}

declare global {
    namespace sc {
        namespace AreaLoadable {
            interface Data {
                type?: AreaViewFloorTypes
                floors: FloorCustom[]
            }
            interface Floor {
                type?: AreaViewFloorTypes
            }
            type FloorCustom = ({
                type?: undefined | AreaViewFloorTypes.Grid
                level: number
                name: ig.LangLabel.Data
                tiles: number[][]
                maps: Map[]
                connections: Connection[]
                icons: Icon[]
                landmarks: Landmark[]
            } | {
                type: AreaViewFloorTypes.RoomList
                level: number
                name: ig.LangLabel.Data
                tiles: number[][]
                maps: sc.AreaLoadable.MapRoomList[]
                connections: sc.AreaLoadable.ConnectionRoomList[]
                icons: Icon[]
                landmarks: Landmark[]
                size?: Vec2
                rooms?: sc.AreaRoomBounds[]
                connections: sc.AreaLoadable.ConnectionRoomList[]
            })
            interface Map {
                // unused??
                minZ?: number
                maxZ?: number
            }
            type MapRoomListRect = bareRect & {
                roomType: RoomType
                placeOrder: RoomPlaceOrder
                wallSides: boolean[]
                areaRect?: bareRect /* cache */
                drawRect?: bareRect & { x2: number; y2: number } /* cache */
                drawEmptyRect?: bareRect /* cache */
            }
            interface MapRoomList extends sc.AreaLoadable.Map {
                rects: MapRoomListRect[]
                id: number
                min: Vec2 
                max: Vec2
            }
            interface ConnectionRoomList {
                tx: number
                ty: number
                size: number
                dir: Dir
                map1: number
                map2: number
            }
        }

        /* AreaLoadable */
        interface AreaLoadable {
            _createRooms(this: this): void
        }
        /* AreaLoadable end */
        /* AreaRoomBounds */
        interface AreaRoomBounds extends ig.Class {
            zMin: number
            zMax: number
            min: Vec2
            max: Vec2
            offset: Vec2
            name: string
            text: string
            id: number
            // custom
            index?: number
        }
        interface AreaRoomBoundsConstructor extends ImpactClass<AreaRoomBounds> {
            new (map: sc.AreaLoadable.Map, id: number, minX: number, minY: number, tiles: number[][], max?: Vec2): AreaRoomBounds
        }
        var AreaRoomBounds: AreaRoomBoundsConstructor
        /* AreaRoomBounds end */
        /* MapFloor */
        interface MapFloor extends ig.GuiElementBase {
            floor: sc.AreaLoadable.FloorCustom
            name: string 
            nameGui: string
            rooms: sc.AreaRoomBounds[]
            activeRoom: sc.AreaRoomBounds | null
            callback: any
            bounds: bareRect
            type: AreaViewFloorTypes /* my custom type */

            setPos(this: this, x: number, y: number): void
            setSize(this: this, width: number, height: number): void
            doStateTransition(this: this, type: string, bool: boolean): void
            _createRooms(this: this): void
        }
        interface MapFloorConstructor extends ImpactClass<MapFloor> {
            new (floor: sc.AreaLoadable.FloorCustom, callback: any): MapFloor
        }
        var MapFloor: MapFloorConstructor
        /* MapFloor end */
        /* MapArea */
        interface MapArea extends ig.GuiElementBase { }
        interface MapAreaConstructor extends ImpactClass<MapArea> {
            new (): MapArea
        }
        var MapArea: MapAreaConstructor
        /* MapArea end */
        /* MapNameGui */
        interface MapNameGui extends ig.BoxGui {
            text: string
            
            setText(text: string, wait?: any, skip?: boolean): void
        }
        interface MapNameGuiConstructor extends ImpactClass<MapNameGui> {
            new (): MapNameGui
        }
        var MapNameGui: MapNameGuiConstructor
        /* MapNameGui end */
        /* MapAreaContainer */
        interface MapAreaContainer extends ig.GuiElementBase {
            area: sc.MapArea
            hoverRoom: sc.AreaRoomBounds | null
            mapNameGui: sc.MapNameGui

            findMap(this: this, a: any, b: any, c: any, d: any): boolean | undefined
        }
        /* MapAreaContainer end */
        /* MapModel */
        interface MapModel {
            currentPlayerArea: sc.AreaLoadable
            currentPlayerFloor: number
            currentMap: string

            getCurrentArea(): sc.AreaLoadable.Data
            getCurrentFloorIndex(): number
        }
        /* MapModel end */
        /* MapRoom */
        interface MapRoom extends ig.GuiElementBase {
            gfx: ig.Image
            room: sc.AreaRoomBounds
            buffer: ig.ImageAtlasFragment
            floor: sc.AreaLoadable.FloorCustom
            name: string
            id: number
            roomAlpha: number
            tileWidth: number
            tileHeight: number
            active: boolean
            unlocked: boolean
            prerendered: boolean

            preRender(this: this): void
        }
        interface MapRoomConstructor extends ImpactClass<MapRoom> {
            new (room: sc.AreaRoomBounds, floor: sc.AreaLoadable.FloorCustom, id: number): MapRoom
        }
        var MapRoom: MapRoomConstructor
        /* MapRoom end */
        /* MenuModel */
        interface MenuModel {
            mapMapFocus: any
            mapCamera: Vec2
            mapCursor: Vec2
        }
        /* MenuModel end */
        /* MapCurrentRoomWrapper */
        interface MapCurrentRoomWrapper extends ig.GuiElementBase { }
        interface MapCurrentRoomWrapperConstructor extends ImpactClass<MapCurrentRoomWrapper> {
            new(hook: ig.GuiHook | { pos: Vec2, size: Vec2 }): MapCurrentRoomWrapper
        }
        var MapCurrentRoomWrapper: MapCurrentRoomWrapperConstructor

        interface AREA_CONNECTIONS_TYPE1 {
            x: number; y: number; w: number; h: number; ox: number; oy: number; w2: number; h2: number
        }
        interface AREA_CONNECTIONS_TYPE {
            first: sc.AREA_CONNECTIONS_TYPE1
            second: sc.AREA_CONNECTIONS_TYPE1
            step: { x: number; y: number; x2: number; y2: number }
        }
        interface AREA_CONNECTIONS {
            VERTICAL: sc.AREA_CONNECTIONS_TYPE
            HORIZONTAL: sc.AREA_CONNECTIONS_TYPE
        }
        var AREA_CONNECTIONS: AREA_CONNECTIONS = AREA_CONNECTIONS
    }

    namespace ig {
        interface Image {
            drawCheck(
                this: this,
                targetX: number,
                targetY: number,
                sourceX?: number,
                sourceY?: number,
                width?: number,
                height?: number,
                flipX?: boolean,
                flipY?: boolean,
                offsetY?: number,
                offsetHeight?: number,
                fragment?: unknown,
                fragmentAlpha?: number,
                filtered?: unknown
            ): void;
        }
    }
}
/* custom area related end */


/* blitzkrieg bindings */
export interface Blitzkrieg extends Record<string, Selections> {
    puzzleSelections: Selections
    puzzleSelectionManager: PuzzleSelectionManager
    battleSelections: Selections
    bossSelections: Selections
    mod: { baseDirectory: string }
    loaded: boolean
    msg: (title: string, text: string) => void
    selectionCopyManager: SelectionCopyManager
    util: B$Util
}

interface B$Util {
    generateUniqueID(): number
    getMapObject(mapName: string): Promise<sc.MapModel.Map>
    parseArrayAt2d(arr1: number[][], arr2: number[][], x: number, y: number): void
    emptyArray2d(width: number, height: number): number[][]
    getTrimArrayPos2d(arr: number[][]): { x1: number; y1: number; x2: number; y2: number; }
    getSelFromRect(rect: EntityRect, mapName: string, z: number): Selection
    setSelPos(sel: Selection, x: number, y: number): void
}

interface SelectionCopyManager {
    copySelToMap(baseMap: sc.MapModel.Map, selMap: sc.MapModel.Map, sel: Selection,
        xOffset: number, yOffset: number, newName: string, options: {
            uniqueId?: number
            uniqueSel?: Selection
            disableEntities?: boolean
            mergeLayers?: boolean
            removeCutscenes?: boolean
            makePuzzlesUnique?: boolean
    }): Promise<sc.MapModel.Map>

    createUniquePuzzleSelection(puzzleSel: Selection, xOffset: number, yOffset: number, id: number): Selection
}

interface PuzzleSelectionManager {
    getPuzzleSolveCondition(puzzleSel: Selection): string
}

export interface Selections {
    name: string
    selIndexes: number[]
    selHashMap: Record<string, SelectionMapEntry>
    mapSels: SelectionMapEntry
    inSelStack: Stack<Selection>
    jsonfiles: string[]

    setSelHashMapEntry(mapName: string, entry: SelectionMapEntry): void
    newSelEvent: (sel: Selection) => void
    walkInEvent: (sel: Selection) => void
    walkOutEvent: (sel: Selection) => void
    load(index: number): void
    isSelInPos(sel: Selection, pos: Point): boolean
    save(): void
    load(): void
}

export interface Selection {
    bb: EntityRect[]
    map: string
    size: EntityRect
    data: {
        puzzleSpeed?: number
        elements?: boolean[]
        difficulty?: number
        timeLength?: number
        completionType?: 'normal' | 'getTo' | 'item'
        type?: 'whole room' | 'add walls' | 'dis'
        chapter?: number
        plotLine?: number
        startPos: Vec3 & { level: number }
        endPos: Vec3 & { level: number }
        recordLog: {
            log: any[]
        }
    }
}

export interface SelectionMapEntry {
    sels: Selection[]
    tempSel?: Selection
    fileIndex: number
}
/* blitzkrieg bindings end */
