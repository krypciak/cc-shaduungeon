import { EntityRect } from './pos'

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

interface Selections {
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
