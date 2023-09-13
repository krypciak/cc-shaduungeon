import { Blitzkrieg, Selection, SelectionMapEntry } from '@util/blitzkrieg'
import { Stack, assert, assertBool, setRandomSeed } from '@util/misc'
import { AreaPoint, Dir, } from '@util/pos'
import { AreaInfo, AreaBuilder, ABStackEntry } from '@area/area-builder'
import { MapBuilder } from '@room/map-builder'
import { SimpleDoubleRoomMapBuilder, SimpleDoubleTunnelMapBuilder, SimpleRoomMapBuilder, SimpleSingleTunnelMapBuilder } from '@room/simple-map-builder'
import { DungeonPaths } from '@dungeon/dungeon-paths'
import { BattlePuzzleMapBuilder } from '@room/dungeon-map-builder'

declare const blitzkrieg: Blitzkrieg

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

    async build(id: string, roomTp: number) {
        await this.preloadPuzzleList()
        console.log(blitzkrieg.puzzleSelections.selHashMap)

        const puzzles: Selection[] = []
        let puzzleList = ig.copy(DungeonBuilder.puzzleList)
        // puzzleList = puzzleList.sort(() => Math.random() - 0.5)
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }

        console.log('puzzles:', puzzles)

        const dngPaths = new DungeonPaths(id)
        dngPaths.registerSelections()
        dngPaths.clearDir()

        const areaInfo: AreaInfo = new AreaInfo(dngPaths, 'Generated Dungeon', 'generic description, ' + dngPaths.nameAndId, 'DUNGEON', Vec2.createC(150, 70))
        
        const builders: MapBuilder[] = []
        // add starting map as a builder?

        for (let builderIndex = builders.length, i = 0; i < puzzles.length; builderIndex++, i++) {
            const sel = puzzles[builderIndex]
            const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
            const builder: MapBuilder = new BattlePuzzleMapBuilder(areaInfo, sel, puzzleMap)
            builders.push(builder)
        }

        setRandomSeed('obama')
        // SimpleRoomMapBuilder.addRandom(builders, areaInfo, 100, [SimpleRoomMapBuilder, SimpleSingleTunnelMapBuilder, SimpleDoubleTunnelMapBuilder, SimpleDoubleRoomMapBuilder])
        // SimpleRoomMapBuilder.addRandom(builders, areaInfo, 100, [SimpleDoubleRoomMapBuilder])

        // SimpleSingleTunnelMapBuilder.addPreset(builders, areaInfo)
        // SimpleRoomMapBuilder.addPreset(builders, areaInfo)
        // SimpleDoubleRoomMapBuilder.addPreset(builders, areaInfo)


        // builders.push(new SimpleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        // builders.push(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        // builders.push(new SimpleDoubleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        // builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))

        type RecReturn = undefined | { stack: Stack<ABStackEntry>, leftBuilders: Set<MapBuilder> }

        let highestRecReturn: { stack: Stack<ABStackEntry>, leftBuilders: Set<MapBuilder> } = { stack: new Stack(), leftBuilders: new Set() }
        const countTarget: number = Math.min(builders.length, 
            builders.length < 10 ? builders.length : (builders.length / 1.5)
        )
        
        function recursiveTryPlaceMaps(stack: Stack<ABStackEntry>, availableBuilders: Set<MapBuilder>): RecReturn {
            for (const possibleBuilder of availableBuilders) {
                const possibleObj = recursiveTryPlaceMap(possibleBuilder, stack, availableBuilders)
                if (possibleObj && possibleObj.stack.length() >= countTarget) { return possibleObj }
            }
        }
 
        const fallbackEntry = {
            exit: new AreaPoint(0, 0),
            exitDir: Dir.NORTH,
            level: 0,
            rects: [],
            rooms: [],
        }

        function recursiveTryPlaceMap(builder: MapBuilder, stack: Stack<ABStackEntry>,
            availableBuilders: Set<MapBuilder>): RecReturn {

            let lastEntry: ABStackEntry = stack.peek()
            if (! lastEntry) {
                lastEntry = fallbackEntry
            }
            if (! builder.prepareToArrange(lastEntry.exitDir)) { return }

            assert(builder.exitRoom.primaryExit)

            const obj = AreaBuilder.tryGetAreaRects(builder, lastEntry.exit, stack.array)
            if (! obj) { /* map overlaps */ return }
            assertBool(obj.rooms.length == obj.rects.length)
        
            // areabuilder uses tpr pos insetad of edge p
            assert(builder.exitOnWall)
            const exit = builder.exitOnWall

            // shallow copy
            stack = new Stack(stack.array)
            stack.push({
                builder, 
                exit: obj.exit,
                exitDir: exit.dir,
                level: 0,
                rects: obj.rects,
                rooms: obj.rooms,
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
        console.log(obj.stack)

        const obj1 = AreaBuilder.trimBuilderStack(obj.stack.array)
        const size: AreaPoint = obj1.size

        const areaBuilder: AreaBuilder = new AreaBuilder(areaInfo, obj.stack, size)
        await areaBuilder.build()
        console.log(areaBuilder.builtArea)
        areaBuilder.createDbEntry()
        areaBuilder.saveToFile()

        // dnggen.areaDrawer.drawArea(obj.stack, size)
        // dnggen.areaDrawer.copyToClipboard()



        const usedBuilders: MapBuilder[] = obj.stack.array.map(e => e.builder!)
        await MapBuilder.placeBuilders(usedBuilders)

        dngPaths.saveConfig()
        dngPaths.registerFiles()

        blitzkrieg.puzzleSelections.save()
        blitzkrieg.battleSelections.save()

        if (roomTp) {}
        ig.game.varsChangedDeferred()
        ig.game.teleport(usedBuilders[0].path!, ig.TeleportPosition.createFromJson({
            marker: usedBuilders[0].entarenceRoom.primaryEntarence.getTpr().name,
            level: 0,
            baseZPos: 0,
            size: {x: 0, y: 0}
        }))
        // AreaBuilder.openAreaViewerGui(areaInfo.name, obj.stack.array[0].builder!.name!, 0)
    }
}
