import { Blitzkrieg, Selection, SelectionMapEntry } from './util/blitzkrieg'
import { Stack, assert } from './util/misc'
import { AreaPoint, Dir, } from './util/pos'
import { AreaInfo, AreaBuilder, ABStackEntry, IndexedBuilder } from './area/area-builder'
import DngGen from './plugin'
import { MapBuilder } from './room/map-builder'
import { SimpleDoubleRoomMapBuilder, SimpleDoubleTunnelMapBuilder, SimpleRoomMapBuilder, SimpleSingleTunnelMapBuilder } from './room/simple-map-builder'
import { mkdirs, writeFile, writeFileSync } from './util/fsutil'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen

export class DungeonPaths {
    baseDir: string
    nameAndId: string
    mapsDirGame: string = 'data/maps'
    mapsDir: string
    areaDirGame: string = 'data/areas'
    areaFileGame: string
    areaFile: string

    private files: Record<string, string>= {}

    constructor(public id: string) {
        this.baseDir = `assets/mod-data/${dnggen.mod.name}/saves/${id}`
        this.nameAndId = `${DungeonBuilder.basePath}-${id}`

        this.mapsDir = `${this.baseDir}/assets/${this.mapsDirGame}`
        mkdirs(this.mapsDir)

        this.areaFileGame = `${this.areaDirGame}/${this.nameAndId}.json`
        const areaDir = `${this.baseDir}/assets/${this.areaDirGame}`
        mkdirs(areaDir)
        this.areaFile = `${areaDir}/${this.nameAndId}.json`
    }

    saveMap(builder: MapBuilder): Promise<void> {
        assert(builder.rpv)
        console.log('map: ', ig.copy(builder.rpv.map))
        mkdirs(`${this.mapsDir}/${builder.pathParent}`)
        const path = `${this.mapsDir}/${builder.path}.json`
        const gamePath = `${this.mapsDirGame}/${builder.path}.json`

        this.files[gamePath] = path
        return writeFile(path, builder.rpv.map)
    }

    saveArea(builder: AreaBuilder) {
        assert(builder.builtArea, 'called saveToFile() before finalizing build') 
    
        const path = this.areaFile
        this.files[this.areaFileGame] = path
        writeFileSync(path, builder.builtArea)
    }

    registerFiles() {
        if (dnggen.mod.isCCL3) {

        } else {
            dnggen.mod.runtimeAssets = this.files
        }
    }
}

export class DungeonBuilder {
    static puzzleMap: Map<string, Selection[]>
    static puzzleList: Selection[]
    
    static basePath: string = 'dnggen'

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

        const puzzles: Selection[] = []
        let puzzleList = ig.copy(DungeonBuilder.puzzleList)
        // puzzleList = puzzleList.sort(() => Math.random() - 0.5)
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }

        console.log('puzzles:', puzzles)

        const dngPaths = new DungeonPaths(id)

        const areaInfo: AreaInfo = new AreaInfo(dngPaths, 'Generated Dungeon', 'generic description, ' + dngPaths.nameAndId, 'DUNGEON', Vec2.createC(150, 70))
        
        const builders: IndexedBuilder[] = []
        // add starting map as a builder?

        // for (let builderIndex = builders.length, i = 0; i < puzzles.length; builderIndex++, i++) {
        //     const sel = puzzles[builderIndex]
        //     const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
        //     const builder: IndexedBuilder = IndexedBuilder.create(new BattlePuzzleMapBuilder(areaInfo, sel, puzzleMap), builderIndex)
        //     builders.push(builder)
        // }

        SimpleRoomMapBuilder.addRandom(builders, areaInfo, 10, [SimpleRoomMapBuilder, SimpleSingleTunnelMapBuilder, SimpleDoubleTunnelMapBuilder, SimpleDoubleRoomMapBuilder])
        // SimpleRoomMapBuilder.addRandom(builders, areaInfo, 100, [SimpleDoubleRoomMapBuilder])

        // SimpleSingleTunnelMapBuilder.addPreset(builders, areaInfo)
        // SimpleDoubleRoomMapBuilder.addPreset(builders, areaInfo)

        type RecReturn = undefined | { stack: Stack<ABStackEntry>, leftBuilders: Set<IndexedBuilder> }

        let highestRecReturn: { stack: Stack<ABStackEntry>, leftBuilders: Set<IndexedBuilder> } = { stack: new Stack(), leftBuilders: new Set() }
        const countTarget: number = Math.min(builders.length, 
            builders.length / 1
        )
        
        function recursiveTryPlaceMaps(stack: Stack<ABStackEntry>, availableBuilders: Set<IndexedBuilder>): RecReturn {
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

        function recursiveTryPlaceMap(builder: IndexedBuilder, stack: Stack<ABStackEntry>,
            availableBuilders: Set<IndexedBuilder>): RecReturn {

            let lastEntry: ABStackEntry = stack.peek()
            if (! lastEntry) {
                lastEntry = fallbackEntry
            }
            if (! builder.prepareToArrange(lastEntry.exitDir)) { return }

            assert(builder.exitRoom.primaryExit)

            const obj = AreaBuilder.tryGetAreaRects(builder, lastEntry.exit, stack.array)
            if (! obj) { /* map overlaps */ return }
        
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
        areaBuilder.saveToFile()
        areaBuilder.addToDatabase()

        // dnggen.areaDrawer.drawArea(obj.stack, size)
        // dnggen.areaDrawer.copyToClipboard()



        const usedBuilders: IndexedBuilder[] = obj.stack.array.map(e => e.builder!)
        await MapBuilder.placeBuilders(usedBuilders)

        dngPaths.registerFiles()

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
