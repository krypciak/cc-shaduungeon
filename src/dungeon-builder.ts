// import DngGen from './plugin.js'
import { Selection, SelectionMapEntry, Blitzkrieg, Dir, DirUtil, assert } from './util.js'
import { AreaInfo, AreaBuilder } from './area-builder.js'
import { DungeonMapBuilder } from './dungeon-room.js'

declare const blitzkrieg: Blitzkrieg
// declare const dnggen: DngGen

export class DungeonBuilder {
    static initialMap = {
        path: 'rouge.start',
        exitMarker: 'exit',
        entarenceMarker: 'start'
    }

    static puzzleMap: Map<string, Selection[]>
    static puzzleList: Selection[]

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

    async build() {
        await this.preloadPuzzleList()

        const puzzles: Selection[] = []
        // DungeonBuilder.puzzleList.length
        const puzzleList = ig.copy(DungeonBuilder.puzzleList).sort(() => Math.random() - 0.5)
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }

        console.log('puzzles:', puzzles)

        const areaInfo: AreaInfo = new AreaInfo('gendng', 'Generated Dungeon', 'generic description', 'DUNGEON', { x: 150, y: 70})
        const areaBuilder: AreaBuilder = new AreaBuilder(areaInfo)
        areaBuilder.beginBuild()

        const fileWritePromises: Promise<void>[] = []
        let lastSide: Dir = await areaBuilder.placeStartingMap()
        
        const builders: DungeonMapBuilder[] = []
        for (const sel of puzzles) {
            const mapBuilder: DungeonMapBuilder = new DungeonMapBuilder(areaInfo, sel)
            await mapBuilder.loadPuzzleMap()
            mapBuilder.calculatePositions()
            builders.push(mapBuilder)
        }
        const builderStack: DungeonMapBuilder[] = []

        for (let i = 0; i < puzzles.length; i++) {
            builderStack.push(builders[i])
            for (let h = 0; h < builderStack.length; h++) {
                const mapBuilder: DungeonMapBuilder = builderStack[h]
                if (! mapBuilder.calculateBattleTunnel(lastSide)) {
                    continue
                }

                const doesMapFit: boolean = await areaBuilder.tryArrangeMap(mapBuilder)
                if (doesMapFit) {
                    assert(mapBuilder.puzzle); assert(mapBuilder.puzzle.end)
                    lastSide = DirUtil.flip(mapBuilder.puzzle.end.dir)
                    builderStack.splice(h, 1)
                    fileWritePromises.push(mapBuilder.save())
                }
            }
        }

        console.log('leftovers:', builderStack.map(b => b.puzzle.unique!.sel))

        areaBuilder.addToDatabase()
        areaBuilder.finalizeBuild()
        areaBuilder.saveToFile()

        ig.game.varsChangedDeferred()

        blitzkrieg.puzzleSelections.save()
        blitzkrieg.battleSelections.save()
        Promise.all(fileWritePromises)

        // ig.game.teleport('rouge.gen.0', ig.TeleportPosition.createFromJson({
        //     marker: 'start',
        //     level: 0,
        //     baseZPos: 0,
        //     size: {x: 0, y: 0}
        // }))
    }
}
