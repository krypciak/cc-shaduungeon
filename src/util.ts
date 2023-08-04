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

    static async trim(map: CCMap, theme: RoomThemeConfig): Promise<{ offset: Vec2, map: CCMap }> {
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
                .copySelToMap(emptyMap, this, newSel, 0, 0, map.name, {
                    makePuzzlesUnique: false,
                })

            resolve({ offset: { x: nx*tilesize, y: ny*tilesize }, map })
        })
    }
}

export enum Dir {
    NORTH,
    EAST,
    SOUTH,
    WEST,
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

export class Rect {
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

    static fromxy2(x: number, y: number, x2: number, y2: number): Rect {
        return new Rect(x, y, x2 - x, y2 - y)
    }

    static onAll(rect: Rect, func: (x: number) => number): Rect {
        return new Rect(func(rect.x), func(rect.y), func(rect.width), func(rect.height))
    }
}

export class MapRect extends Rect {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
    ) {
        super(x, y, width, height)
    }

    static fromRect(rect: Rect): MapRect {
        return Rect.onAll(rect, (x: number) => Math.floor(x / tilesize))
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
    battleSelections: Selections
    bossSelections: Selections
    mod: { baseDirectory: string }
    loaded: boolean
    msg: (title: string, text: string) => void
    selectionCopyManager: SelectionCopyManager
    util: B$Util
}

interface B$Util {
    generateUniqueId(): number
    setToClosestRectSide(pos: Vec2, rect: Rect): { side: Dir, distance: number }
    setToClosestSelSide(pos: Vec2, sel: Selection): Dir
    getMapObject(mapName: string): Promise<CCMap>
    parseArrayAt2d(arr1: number[][], arr2: number[][], x: number, y: number): void
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

interface B$Stack<T> {
    push(element: T): void
    pop(): T
    peek(): T
    shift(): T
    length(): number
}

interface Selections {
    name: string
    selHashMap: object
    mapSels: SelectionMapEntry
    newSelEvent: (sel: Selection) => void
    walkInEvent: (sel: Selection) => void
    walkOutEvent: (sel: Selection) => void
    selIndexes: number[]
    inSelStack: B$Stack<Selection>
    jsonfiles: string[]
    load(index: number): void

}

export interface Selection {
    bb: Rect[]
    map: string
    size: Rect
    data: {
        puzzleSpeed?: number
        elements?: boolean[]
        difficulty?: number
        timeLength?: number
        completionType?: 'normal' | 'getTo' | 'item'
        type?: 'whole room' | 'add walls' | 'dis'
        chapter?: number
        plotLine?: number
        startPos: Vec3
        endPos: Vec3
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
