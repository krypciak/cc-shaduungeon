import { RoomThemeConfig } from './room-builder.js'

const tilesize: number = 16
declare const blitzkrieg: any

export enum CollisionTile {
    Empty,
    Floor, // green
    Wall,  // red
    Hole,  // blue
}

export type Tileset = 'media/map/collisiontiles-16x16.png' | 'media/map/pathmap-tiles.png' | 'media/map/lightmap-tiles.png' | 'media/map/dungeon-shadow.png' | 'media/map/cold-dng.png' | 'media/map/rhombus-dungeon2.png'

export class MapLayer implements sc.MapModel.MapLayer {
    id: number
    visible: number = 1
    repeat: boolean = false
    distance: number = 1
    yDistance: number = 0
    tilesize: number = tilesize
    moveSpeed: Vec2 = { x: 0, y: 0 }
    data: number[][]
    lighter: boolean = false

    constructor(public width: number, public height: number, public name: string,
        public type: sc.MapModel.MapLayerType, public tilesetName: string, 
        public level: sc.MapModel.MapLayerLevelType, data?: number[][]) {

        this.data = data ?? []
        this.id = 0
    }

    fill(tile: number) {
        for (let y = 0; y < this.height; y++) {
            this.data[y] = []
            for (let x = 0; x < this.width; x++) {
                this.data[y][x] = tile
            }
        }
    }
}

export class CCMap implements sc.MapModel.Map {
    screen: Vec2 = { x: 0, y: 0 }

    constructor(public name: string,
        public levels: { height: number }[],
        public mapWidth: number,
        public mapHeight: number,
        public masterLevel: number,
        public attributes: sc.MapModel.MapAttributes,
        public entities: sc.MapModel.MapEntity[],
        public layer: MapLayer[]) {
    }

    static async trim(map: CCMap, theme: RoomThemeConfig): Promise<{ offset: MapPoint, map: CCMap }> {
        const origW: number = map.mapWidth
        const origH: number = map.mapHeight

        let nx: number
        for (nx = 0; nx < origW; nx++) {
            let foundTile: boolean = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let y = 0; y < origH; y++) {
                    const val: number = layer.data[y][nx]
                    if (val != 0 && val != theme.blackTile) {
                        foundTile = true
                        break
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { break }
        }
        nx--

        let ny: number
        for (ny = 0; ny < origH; ny++) {
            let foundTile: boolean = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let x = 0; x < origW; x++) {
                    const val: number = layer.data[ny][x]
                    if (val != 0 && val != theme.blackTile) {
                        foundTile = true
                        break
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { break }
        }
        ny--

        let nw: number
        for (nw = origW - 1; nw >= 0; nw--) {
            let foundTile: boolean = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let y = 0; y < origH; y++) {
                    const val: number = layer.data[y][nw]
                    if (val != 0 && val != theme.blackTile) {
                        foundTile = true
                        break
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { nw += 2; break }
        }

        let nh: number
        for (nh = origH - 1; nh >= 0; nh--) {
            let foundTile: boolean = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let x = 0; x < origW; x++) {
                    const val: number = layer.data[nh][x]
                    if (val != 0 && val != theme.blackTile) {
                        foundTile = true
                        break 
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { nh += 2; break }
        }
        const newW: number = nw - nx + 1
        const newH: number = nh - ny + 1

        const emptyMap: CCMap = new CCMap('empty', [], newW, newH, 0, map.attributes, [], [])
        const newSel = blitzkrieg.util.getSelFromRect({ x: nx*tilesize, y: ny*tilesize, width: newW*tilesize, height: newH*tilesize }, map.name, 0)

        return new Promise(async (resolve) => {
            map = await blitzkrieg.selectionCopyManager
                .copySelToMap(emptyMap, map, newSel, 0, 0, map.name, {
                    makePuzzlesUnique: false,
                })

            resolve({ offset: new MapPoint(nx*tilesize, ny*tilesize), map })
        })
    }
}

export enum Dir {
    NORTH,
    EAST,
    SOUTH,
    WEST,
}

export enum Coll {
    None = 0,
    Hole = 1,
    Coll = 2,
    Floor = 3,
}

export class DirUtil {
    static flip(dir: Dir): Dir {
        return ((dir + 2) % 4) as Dir
    }

    static convertToDir(dir: keyof typeof Dir): Dir {
        return Dir[dir]
    }
    static convertToString(dir: Dir): keyof typeof Dir {
        return Dir[dir] as keyof typeof Dir
    }

    static convertToStringFace8(dir: ig.ActorEntity.FACE8): keyof typeof ig.ActorEntity.FACE8 {
        return ig.ActorEntity.FACE8[dir] as keyof typeof ig.ActorEntity.FACE8
    }
    static convertToDirFace8(dir: keyof typeof ig.ActorEntity.FACE8): ig.ActorEntity.FACE8 {
        return ig.ActorEntity.FACE8[dir]
    }

    static isVertical(dir: Dir): boolean {
        return dir == Dir.NORTH || dir == Dir.SOUTH
    }
}

type bareRect = { x: number; y: number; width: number; height: number }

export class Rect {
    static multiplier: number
    x2: number
    y2: number

    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
    ) {
        if (width < 0) {
            throw new Error('Width cannot be less than 0')
        }
        if (height < 0) {
            throw new Error('Height cannot be less than 0')
        }
        this.x2 = x + width
        this.y2 = y + height
    }

    to<T extends typeof Rect>(ins: T): InstanceType<T> {
        const multi = ins.multiplier / 
            // @ts-expect-error
            this.constructor['multiplier']

        return new ins(
            Math.floor(this.x * multi),
            Math.floor(this.y * multi),
            Math.floor(this.width * multi),
            Math.floor(this.height * multi),
        ) as InstanceType<T>
    }

    static new<T extends Rect>
        (init: new (x: number, y: number, width: number, height: number) => T, rect: bareRect): T {
        return new init(rect.x, rect.y, rect.width, rect.height)
    }
}

export class EntityRect extends Rect {
    static multiplier: number = 64
    private _entityrect: boolean = true

    static fromxy2(x: number, y: number, x2: number, y2: number): EntityRect {
        return new EntityRect(x, y, x2 - x, y2 - y)
    }
    static fromTwoPoints(pos: EntityPoint, size: EntityPoint): EntityRect {
        return new EntityRect(pos.x, pos.y, size.x, size.y)
    }
}

export class MapRect extends Rect {
    static multiplier: number = 4
    private _maprect: boolean = true
    
    static fromxy2(x: number, y: number, x2: number, y2: number): MapRect {
        return new MapRect(x, y, x2 - x, y2 - y)
    }

    static fromTwoPoints(pos: MapPoint, size: MapPoint): MapRect {
        return new MapRect(pos.x, pos.y, size.x, size.y)
    }
}

export class AreaRect extends Rect {
    private _arearect: boolean = true
    static multiplier: number = 1
    private static div: number = MapRect.multiplier / AreaRect.multiplier 

    static fromMapRect(rect: MapRect, offset: AreaPoint): AreaRect {
        return new AreaRect(
            Math.floor(rect.x / AreaRect.div + offset.x),
            Math.floor(rect.y / AreaRect.div + offset.y),
            Math.ceil(rect.width / AreaRect.div),
            Math.ceil(rect.height / AreaRect.div))
    }
}


export class Point {
    static multiplier: number

    public constructor(
        public x: number,
        public y: number) {}

    to<T extends typeof Point>(ins: T): InstanceType<T> {
        const multi = ins.multiplier / 
            // @ts-expect-error
            this.constructor['multiplier']

        return new ins(
            Math.floor(this.x * multi),
            Math.floor(this.y * multi),
        ) as InstanceType<T>
    }
}

export class EntityPoint extends Point {
    static multiplier: number = EntityRect.multiplier
    private _entityPoint: boolean = true

    static fromMapPoint(pos: MapPoint): Point {
        return new Point(pos.x * tilesize, pos.y * tilesize)
    }

    static fromVec(pos: Vec2): EntityPoint {
        return new EntityPoint(pos.x, pos.y)
    }
}

export class MapPoint extends Point {
    static multiplier: number = MapRect.multiplier
    private _mapPoint: boolean = true
}

export class AreaPoint extends Point {
    static multiplier: number = AreaRect.multiplier
    private _areaPoint: boolean = true
}


export class Stamp {
    constructor(
        public area: string,
        public type: keyof typeof sc.MAP_STAMPS,
        public pos: Vec2,
        public level: number,
    ) {}

    addToMenu() {
        sc.menu.addMapStamp(this.area, this.type, this.pos.x, this.pos.y, this.level)
    }

    static addStampsToMenu(stamps: Stamp[]) {
        for (const stamp of stamps) {
            stamp.addToMenu()
        }
    }

    /*
    static getPosBehind(posOrig: Vec2, dir: Dir, dist: number): Vec2 {
        const pos = ig.copy(posOrig)
        switch (dir) {
            case Dir.NORTH: pos.y += dist; break
            case Dir.EAST: pos.x -= dist; break
            case Dir.SOUTH: pos.y -= dist; break
            case Dir.WEST: pos.x += dist; break
        }
        return pos
    }
    */

    static new(area: string, pos: Vec2, level: number, type: Dir | keyof typeof sc.MAP_STAMPS): Stamp {
        if (typeof type === 'number') {
            switch (type) {
                case Dir.NORTH: type = 'ARROW_UP'; break
                case Dir.EAST: type = 'ARROW_RIGHT'; break
                case Dir.SOUTH: type = 'ARROW_DOWN'; break
                case Dir.WEST: type = 'ARROW_LEFT'; break
            }
        }
        return new Stamp(area, type, { x: pos.x/8, y: pos.y/8 }, level)
    }
}

export function allLangs(text: string): ig.LangLabel.Data {
    return {
        en_US: text,
        de_DE: text,
        ja_JP: text,
        zh_CN: text,
        ko_KR: text,
        zh_TW: text,
        langUid: 0,
    }
}

export function doRectsOverlapArray(array: number[][], rects: Rect[]) {
    for (const rect of rects) {
        if (doesRectOverlapArray(array, rect)) { return true }
    }
    return false
}

export function doesRectOverlapArray(array: number[][], rect: Rect) {
    for (let y = rect.y; y < rect.y2; y++) {
        for (let x = rect.x; x < rect.x2; x++) {
            if (array[y][x] != 0) { return true }
        }
    }
    return false
}

export function godlikeStats() {
    sc.model.player.setSpLevel(4)
    sc.model.player.setLevel(99)
    sc.model.player.equip = {head:657,leftArm:577,rightArm:607,torso:583,feet:596}
    for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 200 }
    for (let i = 0; i < 400; i++) { sc.model.player.learnSkill(i) }
    for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 0 }
    sc.model.player.updateStats()
}

// blizkrieg stuff

export interface Blitzkrieg {
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
    setToClosestRectSide(pos: Vec2, rect: Rect): { side: Dir, distance: number }
    setToClosestSelSide(pos: Vec2, sel: Selection): Dir
    getMapObject(mapName: string): Promise<CCMap>
    parseArrayAt2d(arr1: number[][], arr2: number[][], x: number, y: number): void
    emptyArray2d(width: number, height: number): number[][]
    getTrimArrayPos2d(arr: number[][]): { x1: number; y1: number; x2: number; y2: number; }
}

interface SelectionCopyManager {
    copySelToMap(baseMap: CCMap, selMap: CCMap, sel: Selection,
        xOffset: number, yOffset: number, newName: string, options: {
            uniqueId: number
            uniqueSel: Selection
            disableEntities: boolean
            mergeLayers: boolean
            removeCutscenes: boolean
            makePuzzlesUnique: boolean
        }): CCMap

    createUniquePuzzleSelection(puzzleSel: Selection, xOffset: number, yOffset: number, id: number): Selection
}

interface PuzzleSelectionManager {
    getPuzzleSolveCondition(puzzleSel: Selection): string
}

interface B$Stack<T> {
    push(element: T): void
    pop(): T
    peek(): T
    shift(): T
    length(): number
}

interface Selections {
    name: string
    selHashMap: [string: SelectionMapEntry]
    mapSels: SelectionMapEntry
    newSelEvent: (sel: Selection) => void
    walkInEvent: (sel: Selection) => void
    walkOutEvent: (sel: Selection) => void
    selIndexes: number[]
    inSelStack: B$Stack<Selection>
    jsonfiles: string[]
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
    tempSel: Selection
    fileIndex: number
}
