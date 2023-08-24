// import DngGen from './plugin.js'
import { Selection, SelectionMapEntry, Blitzkrieg, Dir, DirUtil, assert, AreaPoint, Stack, AreaRect } from './util.js'
import { AreaInfo, AreaBuilder, ABStackEntry, IndexedBuilder } from './area-builder.js'
import { DungeonMapBuilder } from './dungeon-room.js'
import DngGen from './plugin.js'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen

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
    
    async build(roomTp: number) {
        await this.preloadPuzzleList()

        const puzzles: Selection[] = []
        // DungeonBuilder.puzzleList.length
        let puzzleList = ig.copy(DungeonBuilder.puzzleList)
        // puzzleList = puzzleList.sort(() => Math.random() - 0.5)
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }

        console.log('puzzles:', puzzles)

        const areaInfo: AreaInfo = new AreaInfo('gendng', 'Generated Dungeon', 'generic description', 'DUNGEON', { x: 150, y: 70})
        const areaBuilder: AreaBuilder = new AreaBuilder(areaInfo)
        // areaBuilder.beginBuild()

        // const fileWritePromises: Promise<void>[] = []
        // let lastSide: Dir = await areaBuilder.placeStartingMap()
        

        const builders: IndexedBuilder[] = []
        // add starting map as a builder?

        for (let builderIndex = builders.length, i = 0; i < puzzles.length; builderIndex++, i++) {
            const sel = puzzles[builderIndex]
            const builder: IndexedBuilder = new DungeonMapBuilder(areaInfo, sel) as IndexedBuilder
            builder.index = builderIndex
            await builder.loadPuzzleMap()
            builder.calculatePositions()
            builders.push(builder)
        }

        
        type RecReturn = undefined | { stack: Stack<ABStackEntry>, leftBuilders: Set<IndexedBuilder> }

        let highestRecReturn: { stack: Stack<ABStackEntry>, leftBuilders: Set<IndexedBuilder> } = { stack: new Stack(), leftBuilders: new Set() }
        const countTarget: number = 1000

        
        function recursiveTryPlaceMaps(stack: Stack<ABStackEntry>, availableBuilders: Set<IndexedBuilder>): RecReturn {
            for (const possibleBuilder of availableBuilders) {
                const possibleObj = recursiveTryPlaceMap(possibleBuilder, stack, availableBuilders)
                if (possibleObj && possibleObj.stack.length() >= countTarget) { return possibleObj }
            }
        }
 
        const fallbackEntry = {
            exit: new AreaPoint(0, 0),
            exitDir: Dir.NORTH,
            rects: [],
        }

        function recursiveTryPlaceMap(builder: IndexedBuilder, stack: Stack<ABStackEntry>,
            availableBuilders: Set<IndexedBuilder>): RecReturn {

            let lastEntry: ABStackEntry = stack.peek()
            if (! lastEntry) {
                lastEntry = fallbackEntry
            }
            if (lastEntry && ! builder.calculateBattleTunnel(lastEntry.exitDir)) { return }

            const obj = AreaBuilder.tryGetAreaRects(builder, lastEntry.exit, stack.array)
            if (! obj) { /* map overlaps */ return
            }
            assert(builder.puzzle); assert(builder.puzzle.end)
            // shallow copy
            stack = new Stack(stack.array)
            stack.push({
                builder, 
                exit: obj.exit,
                exitDir: DirUtil.flip(builder.puzzle.end.dir),
                rects: obj.rects,
            })
            // shallow copy
            availableBuilders = new Set(availableBuilders)
            availableBuilders.delete(builder)

            // console.log(stack.length(), 'path:', stack.array.map(e => e.builder!.index))
            if (stack.length() >= countTarget) {
                return { stack, leftBuilders: availableBuilders }
            }
            if (highestRecReturn.stack.length() < stack.length()) {
                highestRecReturn = { stack, leftBuilders: availableBuilders }
            }

            return recursiveTryPlaceMaps(stack, availableBuilders)
        }

        let obj: RecReturn = recursiveTryPlaceMaps(new Stack(), new Set(builders))
        if (! obj) {
            console.log('didnt hit target. highest achived:', highestRecReturn?.stack.length())
            obj = highestRecReturn
        }
        console.log('leftovers:', obj.leftBuilders)

        dnggen.areaDrawer.drawArea(obj.stack)
        dnggen.areaDrawer.copyToClipboard()
        return

        areaBuilder.addToDatabase()
        areaBuilder.finalizeBuild()
        areaBuilder.saveToFile()

        ig.game.varsChangedDeferred()

        blitzkrieg.puzzleSelections.save()
        blitzkrieg.battleSelections.save()
        await Promise.all(fileWritePromises)

        if (roomTp != -1) {
            ig.game.teleport('rouge.gen.' + roomTp, ig.TeleportPosition.createFromJson({
                marker: DungeonMapBuilder.roomEntarenceMarker,
                level: 0,
                baseZPos: 0,
                size: {x: 0, y: 0}
            }))
        }
    }
}
