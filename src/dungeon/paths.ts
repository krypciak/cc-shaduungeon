import { fs } from '../library-providers'
import DngGen from '../plugin'
import { ObjectEntriesT } from '../util/modify-prototypes'
import { RuntimeResources } from '../util/runtime-assets'

interface DungeonSaveConfig {
    paths: Record<string, string>
    areaDbEntries: Record<string, sc.MapModel.Area>
    // sels: Record<keyof typeof blitzkrieg.sels, string>
}

export class DungeonPaths {
    static paths: Record<string, DungeonPaths> = {}

    static async getLoaded(dungeonId: string): Promise<DungeonPaths | false> {
        let entry = DungeonPaths.paths[dungeonId]
        if (entry) return entry

        entry = new DungeonPaths(dungeonId)
        if (!(await entry.loadConfig())) return false
        return entry
    }

    static registerAutoLoadDungeon() {
        let ignore: boolean = false
        ig.Game.inject({
            preloadLevel(mapName: string) {
                if (ignore) {
                    ignore = false
                    return this.parent(mapName)
                }
                if (!mapName.startsWith('dnggen-')) return this.parent(mapName)

                const id = mapName.split('/')[0].split('-')[1]
                DungeonPaths.getLoaded(id).then(paths => {
                    if (paths) {
                        paths.register()
                        ignore = true
                        ig.game.preloadLevel(mapName)
                    } else {
                        ig.game.preloadLevel('dnggen/limbo')
                    }
                })
            },
        })
    }

    baseDir: string

    config: DungeonSaveConfig
    configFile: string
    configLoaded: boolean = false

    mapsDirGame: string = 'data/maps'
    mapsDir: string

    areaDirGame: string = 'data/areas'

    selIndexes: Record<string, number> = {}

    constructor(public dungeonId: string) {
        DungeonPaths.paths[dungeonId] = this

        this.baseDir = `assets/mod-data/${DngGen.manifset.id}/saves/${dungeonId}`

        this.configFile = `${this.baseDir}/config.json`

        this.mapsDir = `${this.baseDir}/assets/${this.mapsDirGame}`

        this.config = {
            paths: {},
            areaDbEntries: {},
            // sels: {
            //     puzzle: `${this.baseDir}/selPuzzle.json`,
            //     battle: `${this.baseDir}/selBattle.json`,
            // },
        }
    }

    async clearDir() {
        await clear(this.baseDir)
        async function clear(path: string) {
            for (const file of await fs.promises.readdir(path)) {
                const filePath = `${path}/${file}`

                if ((await fs.promises.lstat(filePath)).isDirectory()) {
                    await clear(filePath)
                    await fs.promises.rmdir(filePath)
                } else {
                    await fs.promises.unlink(filePath)
                }
            }
        }
    }

    async saveMap(map: sc.MapModel.Map): Promise<void> {
        await fs.promises.mkdir(`${this.mapsDir}/${map.name.split('/')[0]}`, { recursive: true })

        const path = `${this.mapsDir}/${map.name}.json`
        const gamePath = `${this.mapsDirGame}/${map.name}.json`

        this.config.paths[gamePath] = path

        await fs.promises.writeFile(path, JSON.stringify(map))
    }

    async saveArea(areaId: string, area: sc.AreaLoadable.SDCustom.Data, dbEntry: sc.MapModel.Area) {
        const fileName = `${areaId}.json`
        const areaFileGame = `${this.areaDirGame}/${fileName}`
        const areaDir = `${this.baseDir}/assets/${this.areaDirGame}`
        const areaFile = `${areaDir}/${fileName}`

        await fs.promises.mkdir(areaDir, { recursive: true })

        this.config.areaDbEntries[areaId] = dbEntry

        this.config.paths[areaFileGame] = areaFile
        fs.promises.writeFile(areaFile, JSON.stringify(area))
    }

    async saveConfig() {
        await fs.promises.writeFile(this.configFile, JSON.stringify(this.config))
    }

    async loadConfig(): Promise<boolean> {
        if (this.config) return true

        function exists(path: string): Promise<boolean> {
            return new Promise(resolve => {
                fs.promises
                    .stat(path)
                    .then(() => resolve(true))
                    .catch(_err => resolve(false))
            })
        }
        if (!(await exists(this.configFile))) return false
        const data = await fs.promises.readFile(this.configFile, 'utf8')
        this.config = JSON.parse(data)
        return true
    }

    async register() {
        for (const [k, v] of ObjectEntriesT(this.config.paths)) {
            RuntimeResources.add(k, v)
        }
        RuntimeResources.reload()

        Object.entries(this.config.areaDbEntries).forEach(e => {
            ig.database.data.areas[e[0]] = e[1]
        })
    }
}
