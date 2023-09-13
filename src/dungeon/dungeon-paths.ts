import { AreaBuilder } from '@area/area-builder'
import DngGen from '@root/plugin'
import { MapBuilder } from '@room/map-builder'
import { Blitzkrieg, Selection, Selections } from '@root/types'
import { FsUtil } from '@util/fsutil'
import { assert } from '@util/misc'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen

export type SelectionPools = 'puzzle' | 'battle'

interface DungeonConfig {
    paths: Record<string, string>
    areaDbEntries: Record<string, sc.MapModel.Area>
    sels: Record<SelectionPools, string>
}

export class DungeonPaths {
    static baseName: string = 'dnggen'
    static registeredIds: Set<string> = new Set()

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
                    paths.register()
                } else {
                    return 'dnggen/limbo' /* set the loading map path to a fallback map */
                }
            }
        }
        return
    }

    baseDir: string
    nameAndId: string

    config: DungeonConfig
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
        FsUtil.mkdirsClear(this.baseDir)
    }

    saveMap(builder: MapBuilder): Promise<void> {
        assert(builder.rpv)
        console.log('map: ', ig.copy(builder.rpv.map))
        FsUtil.mkdirs(`${this.mapsDir}/${builder.pathParent}`)
        const path = `${this.mapsDir}/${builder.path}.json`
        const gamePath = `${this.mapsDirGame}/${builder.path}.json`

        this.config.paths[gamePath] = path
        return FsUtil.writeFile(path, builder.rpv.map)
    }

    saveArea(builder: AreaBuilder) {
        assert(builder.builtArea, 'called saveToFile() before finalizing build') 
        assert(builder.dbEntry, 'area db entry not generated')
    
        FsUtil.mkdirs(this.areaDir)
        const path = this.areaFile
        this.config.paths[this.areaFileGame] = path
        this.config.areaDbEntries[builder.areaInfo.name] = builder.dbEntry
        FsUtil.writeFileSync(path, builder.builtArea)
    }

    saveConfig() {
        FsUtil.writeFileSync(this.configFile, this.config)
    }

    loadConfig(): boolean {
        if (! FsUtil.doesFileExist(this.configFile)) { return false }
        this.config = JSON.parse(FsUtil.readFileSync(this.configFile))

        return true
    }

    register() {
        this.registerFiles()
        this.registerSelections()
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

    registerSelections() {
        for (const selEntry of Object.entries(this.config.sels)) {
            const [ poolName, path ] = selEntry
            const pool = (blitzkrieg[poolName + 'Selections'] as Selections)
            const index = this.selIndexes[poolName] = pool.jsonfiles.length
            pool.jsonfiles.push(path)
            pool.load(index)
        }
    }

    addSelectionToPool(poolName: SelectionPools, sel: Selection) {
        const index: number = this.selIndexes[poolName]
        if (index === undefined) { throw new Error('pool name doesnt exist: ' + poolName) }
        const pool: Selections = blitzkrieg[poolName + 'Selections'] as Selections
        pool.setSelHashMapEntry(sel.map, {
            sels: [ sel ],
            fileIndex: index,
        })
    }
}
