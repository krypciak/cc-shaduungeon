import DngGen from './plugin.js'
import { Selection, SelectionMapEntry } from './util.js'
// import { AreaInfo, AreaBuilder, getMapDisplayName } from './area-builder.js'
// import { DungeonMapBuilder } from './room-generate.js'
// const fs = require('fs')

declare const blitzkrieg: any
declare const dnggen: DngGen

export class DungeonBuilder {
    static puzzleMap?: Map<string, Selection[]>
    static puzzleList?: Selection[]

    async preloadPuzzleList() {
        if (! DungeonBuilder.puzzleMap) {
            DungeonBuilder.puzzleMap = new Map<string, Selection[]>()
            DungeonBuilder.puzzleList = []
            for (const mapName in blitzkrieg.puzzleSelections.selHashMap) {
                const entry: SelectionMapEntry = blitzkrieg.puzzleSelections.selHashMap[mapName]
                // entry is from blitzkrieg puzzle list
                if (entry.fileIndex == 0 && entry.sels.length > 0) {
                    const filtered = entry.sels.filter((sel) => sel.data.type != 'dis')
                    DungeonBuilder.puzzleMap.set(mapName, filtered)
                    for (const sel of filtered) { DungeonBuilder.puzzleList.push(sel) }
                }
            }
        }
    }

}
