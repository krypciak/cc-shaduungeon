import { off } from 'process'
import { RoomThemeConfig } from './room-builder.js'

const tilesize: number = 16
declare const blitzkrieg: Blitzkrieg

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

    toJSON() { return this as sc.MapModel.MapLayer }

    static convertArray(arr: sc.MapModel.MapLayer[]): MapLayer[] {
        return arr.map((layer) => new MapLayer(layer.width, layer.height, layer.name, layer.type, layer.tilesetName, layer.level, layer.data))
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
        public layer: MapLayer[]) { }

    static async trim(map: CCMap, theme: RoomThemeConfig, selections: Selection[] = []): Promise<{ offset: MapPoint, map: sc.MapModel.Map }> {
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
        
        const offset: MapPoint = new MapPoint(nx, ny)
        const newSize: MapPoint = new MapPoint(nw - nx + 1, nh - ny + 1)

        const emptyMap: CCMap = new CCMap('empty', [], newSize.x, newSize.y, 0, map.attributes, [], [])
        const newSel: Selection = blitzkrieg.util.getSelFromRect(MapRect.fromTwoPoints(offset, newSize).to(EntityRect), map.name, 0)

        const newMap: sc.MapModel.Map = await blitzkrieg.selectionCopyManager
            .copySelToMap(emptyMap, map, newSel, 0, 0, map.name, {
                makePuzzlesUnique: false,
        })
        
        const entityOffset: EntityPoint = offset.to(EntityPoint)

        for (const sel of selections) {
            blitzkrieg.util.setSelPos(sel, sel.size.x - entityOffset.x, sel.size.y - entityOffset.y)
        }

        return { offset, map: newMap }
    }

    toJSON() { return this as sc.MapModel.Map }
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

    static moveInDirection(pos: Vec2, dir: Dir) {
        switch (dir) {
            case Dir.NORTH: pos.y -= 1; break
            case Dir.EAST: pos.x += 1; break
            case Dir.SOUTH: pos.y += 1; break
            case Dir.WEST: pos.x -= 1; break
        }
    }
}

type bareRect = { x: number; y: number; width: number; height: number }

export class Rect {
    static multiplier: number

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
    }

    x2() {
        return this.x + this.width
    }
    y2() {
        return this.y + this.height
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

    toJSON(): bareRect {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
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
    static div: number = MapRect.multiplier / AreaRect.multiplier 

    static fromxy2(x: number, y: number, x2: number, y2: number): AreaRect {
        return new AreaRect(x, y, x2 - x, y2 - y)
    }
    static fromTwoPoints(pos: AreaPoint, size: AreaPoint): AreaRect {
        return new AreaRect(pos.x, pos.y, size.x, size.y)
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

    toJSON() {
        return {
            x: this.x,
            y: this.y,
        }
    }
}

export class EntityPoint extends Point {
    static multiplier: number = EntityRect.multiplier
    private _entityPoint: boolean = true

    copy(): EntityPoint {
        return new EntityPoint(this.x, this.y)
    }

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

    copy(): MapPoint {
        return new MapPoint(this.x, this.y)
    }

    static fromVec(pos: Vec2): MapPoint {
        return new MapPoint(pos.x, pos.y)
    }
}

export class AreaPoint extends Point {
    static multiplier: number = AreaRect.multiplier
    private _areaPoint: boolean = true

    copy(): AreaPoint {
        return new AreaPoint(this.x, this.y)
    }
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

let langUid = 30000

export function allLangs(text: string): ig.LangLabel.Data {
    return {
        en_US: text,
        de_DE: text,
        ja_JP: text,
        zh_CN: text,
        ko_KR: text,
        zh_TW: text,
        langUid: langUid++,
    }
}

export function doRectsOverlap<T extends Rect>(rect1: T, rect2: T): boolean {
  return (
    rect1.x < rect2.x2() &&
    rect1.x2() > rect2.x &&
    rect1.y < rect2.y2() &&
    rect1.y2() > rect2.y
  )
}

export function doRectsOverlapGrid(array: number[][], rects: Rect[]) {
    for (const rect of rects) {
        if (doesRectOverlapGrid(array, rect)) { return true }
    }
    return false
}

export function doesRectOverlapGrid(array: number[][], rect: Rect) {
    for (let y = rect.y; y < rect.y2(); y++) {
        for (let x = rect.x; x < rect.x2(); x++) {
            if (array[y][x] != 0) { return true }
        }
    }
    return false
}

export function assert(arg: any, msg: string = ''): asserts arg {
    if (arg != 0 && ! arg) {
        throw new Error(`Assertion failed: ${msg}`)
    }
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

interface B$Stack<T> {
    push(element: T): void
    pop(): T
    peek(): T
    shift(): T
    length(): number
}

interface Selections {
    name: string
    selIndexes: number[]
    selHashMap: { [key: string]: SelectionMapEntry }
    mapSels: SelectionMapEntry
    inSelStack: B$Stack<Selection>
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
