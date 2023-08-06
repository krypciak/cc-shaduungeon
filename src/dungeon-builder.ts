// import DngGen from './plugin.js'
import { Selection, SelectionMapEntry, Blitzkrieg, Dir, DirUtil } from './util.js'
import { AreaInfo, AreaBuilder } from './area-builder.js'
import { DungeonMapBuilder } from './dungeon-room.js'

declare const blitzkrieg: Blitzkrieg
// declare const dnggen: DngGen

export class DungeonBuilder {
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
        for (let i = 0; i < 1; i++) {
            puzzles.push(DungeonBuilder.puzzleList[i])
        }

        console.log('puzzles:', puzzles)

        const areaInfo: AreaInfo = new AreaInfo('gendng', 'Generated Dungeon', 'generic description', 'DUNGEON', { x: 150, y: 70})
        const areaBuilder: AreaBuilder = new AreaBuilder(areaInfo)
        areaBuilder.beginBuild()

        const mapStack: Selection[] = []
        const fileWritePromises: Promise<void>[] = []
        let lastSide: Dir = Dir.WEST
        
        for (let i = 0; i < puzzles.length; i++) {
            console.log('------------- ', i, puzzles[i])
            mapStack.push(puzzles[i])
            for (let h = 0; h < mapStack.length; h++) {
                const sel: Selection = mapStack[h]
                const mapBuilder: DungeonMapBuilder = new DungeonMapBuilder(areaInfo, sel)
                await mapBuilder.calculatePositions()
                mapBuilder.calculateBattleTunnel(lastSide)

                lastSide = DirUtil.flip(mapBuilder.puzzle!.end!.dir)

                const doesMapFit: boolean = await areaBuilder.tryArrangeMap(mapBuilder)
                if (doesMapFit) {
                    mapStack.splice(h, 1)
                }
            }
            // console.log('doesnt fit: ', ig.copy(mapStack))
            //console.log('------------------------')
        }

        console.log('leftovers:', mapStack)

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
