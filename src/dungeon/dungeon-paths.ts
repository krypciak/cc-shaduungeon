import { AreaBuilder } from '@root/area/area-builder'
import { MapBuilder } from '@root/room/map-builder'
import { Selection } from 'cc-blitzkrieg/src/selection'
import { assert } from 'cc-map-util/util'

interface DungeonSaveConfig {
    paths: Record<string, string>
    areaDbEntries: Record<string, sc.MapModel.Area>
    sels: Record<keyof typeof blitzkrieg.sels, string>
}

export class DungeonPaths {
    static baseName: string = 'dnggen'
    static registeredIds: Set<string> = new Set()


    static registerAutoLoadDungeon() {
        ig.Game.inject({
            preloadLevel(mapName: string) {
                this.parent(DungeonPaths.loadIfNeeded(mapName) ?? mapName)
            }
        })
    }
    /* example: getIdFromName('dnggen-0') -> '0' */
    static getIdFromName(name: string): string {
        return name.substring(DungeonPaths.baseName.length + 1)
    }

    static loadIfNeeded(mapName: string): string | undefined {
        if (mapName.startsWith(DungeonPaths.baseName)) {
            mapName = mapName.replace(/\//g, '.')
            const id: string = DungeonPaths.getIdFromName(mapName.substring(0, mapName.indexOf('.')))
            if (! DungeonPaths.registeredIds.has(id)) {
                const paths = new DungeonPaths(id)
                if (paths.loadConfig()) {
                    paths.register(true)
                } else {
                    return 'dnggen/limbo' /* set the loading map path to a fallback map */
                }
            }
        }
        return
    }

    baseDir: string
    nameAndId: string

    config: DungeonSaveConfig
    configFile: string

    mapsDirGame: string = 'data/maps'
    mapsDir: string

    areaDirGame: string = 'data/areas'
    areaFileGame: string
    areaDir: string
    areaFile: string

    selIndexes: Record<string, number> = {}

    constructor(public id: string) {
        const name = dnggen.mod.isCCL3 ? dnggen.mod.id : dnggen.mod.name
        this.baseDir = `assets/mod-data/${name}/saves/${id}`
        this.nameAndId = `${DungeonPaths.baseName}-${id}`

        this.configFile = `${this.baseDir}/config.json`

        this.mapsDir = `${this.baseDir}/assets/${this.mapsDirGame}`

        this.areaFileGame = `${this.areaDirGame}/${this.nameAndId}.json`
        this.areaDir = `${this.baseDir}/assets/${this.areaDirGame}`
        this.areaFile = `${this.areaDir}/${this.nameAndId}.json`

        this.config = {
            paths: {},
            areaDbEntries: {},
            sels: {
                puzzle: `${this.baseDir}/selPuzzle.json`,
                battle: `${this.baseDir}/selBattle.json`,
            }
        }
    }

    clearDir() {
        blitzkrieg.FsUtil.mkdirsClear(this.baseDir)
    }

    saveMap(builder: MapBuilder): Promise<void> {
        assert(builder.rpv)
        console.log('map: ', ig.copy(builder.rpv.map))
        blitzkrieg.FsUtil.mkdirs(`${this.mapsDir}/${builder.pathParent}`)
        const path = `${this.mapsDir}/${builder.path}.json`
        const gamePath = `${this.mapsDirGame}/${builder.path}.json`

        this.config.paths[gamePath] = path
        return blitzkrieg.FsUtil.writeFile(path, builder.rpv.map)
    }

    saveArea(builder: AreaBuilder) {
        assert(builder.builtArea, 'called saveToFile() before finalizing build') 
        assert(builder.dbEntry, 'area db entry not generated')
    
        blitzkrieg.FsUtil.mkdirs(this.areaDir)
        const path = this.areaFile
        this.config.paths[this.areaFileGame] = path
        this.config.areaDbEntries[builder.areaInfo.name] = builder.dbEntry
        blitzkrieg.FsUtil.writeFileSync(path, builder.builtArea)
    }

    saveConfig() {
        blitzkrieg.FsUtil.writeFileSync(this.configFile, this.config)
    }

    loadConfig(): boolean {
        if (! blitzkrieg.FsUtil.doesFileExist(this.configFile)) { return false }
        this.config = JSON.parse(blitzkrieg.FsUtil.readFileSync(this.configFile))

        return true
    }

    register(loadSelections: boolean = false) {
        this.registerFiles()
        this.registerSelections(loadSelections)
    }

    registerFiles() {
        if (dnggen.mod.isCCL3) {
            Object.entries(this.config.paths).forEach(e => {
                ccmod.resources.assetOverridesTable.set(e[0], e[1])
            })
        } else {
            dnggen.mod.runtimeAssets = this.config.paths
        }
        Object.entries(this.config.areaDbEntries).forEach(e => {
            ig.database.data.areas[e[0]] = e[1]
        })
        DungeonPaths.registeredIds.add(this.id)
    }

    registerSelections(load: boolean = false) {
        for (const selEntry of Object.entries(this.config.sels)) {
            const [ poolName, path ] = selEntry as [keyof typeof blitzkrieg.sels, string]
            const pool: SelectionManager = blitzkrieg.sels[poolName] as SelectionManager
            while (pool.jsonFiles.includes(path)) {
                const indexToDel: number = pool.jsonFiles.indexOf(path)
                Object.keys(pool.selMap).forEach(k => {
                    const val = pool.selMap[k]
                    if (val.fileIndex == indexToDel) {
                        delete pool.selMap[k]
                    }
                })
                pool.jsonFiles.splice(indexToDel)
            }
            const index = this.selIndexes[poolName] = pool.jsonFiles.length
            pool.jsonFiles.push(path)
            if (load) {
                pool.load(index)
            }
        }
    }

    addSelectionToPool(poolName: keyof typeof blitzkrieg.sels, sel: Selection) {
        const index: number = this.selIndexes[poolName]
        if (index === undefined) { throw new Error('pool name doesnt exist: ' + poolName) }
        const pool: SelectionManager = blitzkrieg.sels[poolName] as SelectionManager
        pool.setMapEntry(sel.mapName, new SelectionMapEntry([ sel ], index))
    }
}
