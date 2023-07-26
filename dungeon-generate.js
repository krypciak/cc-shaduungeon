const fs = require('fs')
import { Area } from './area-generate.js'
import { generateRoom } from './room-generate.js'

export class DungeonGenerator {
    constructor() { }

    async preloadPuzzleList() {
        if (! ig.rouge.filteredPuzzleMap) {
            ig.rouge.filteredPuzzleMap = Object.fromEntries(Object.entries(ig.blitzkrieg.puzzleSelections.selHashMap)
                .filter((arr) => arr[1].sels && arr[1].sels.length > 0 && ! arr[0].includes('rouge')))

            ig.rouge.puzzleList = []
            for (const mapName in ig.rouge.filteredPuzzleMap) {
                const sels = ig.rouge.filteredPuzzleMap[mapName]
                for (const sel of sels.sels) {
                    if (sel.data.type == 'dis') { continue }
                    ig.rouge.puzzleList.push(sel)
                }
            }
        }
    }


    async generate() {
        ig.blitzkrieg.msg('rouge', 'generate')
        await this.preloadPuzzleList()
        // await ig.blitzkrieg.util.loadAllMaps()

        let puzzles = ig.rouge.puzzleList
        puzzles = [ puzzles[0], puzzles[1], puzzles[2] ]

        const area = new Area('rougeDng', 'Generated Dungeon', 'generic description', 'DUNGEON', 150, 70)

        // this.mapIndex == 1 ? this.puzzles['rhombus-dng/room-1-5'].sels[0] : this.puzzles['rhombus-dng/room-1-5'].sels[1],
        // puzzles = [ randPuzzles[13] ]
        // puzzles = [ randPuzzles[1] ]
        // puzzles = [ ig.blitzkrieg.puzzleSelections.selHashMap['rhombus-dng/entrance'].sels[0] ]
        const maps = []
        for (let i = 0; i < puzzles.length; i++) {
            const obj = await generateRoom(puzzles[i], area.name, i)
            ig.vars.storage.maps[obj.map.name] = {}
            console.log('------------- ', i, puzzles[i])
            maps.push(obj)
        }


        // save map files
        const fileWritePromises = []
        for (let i = 0; i < maps.length; i++) {
            fileWritePromises.push(new Promise(resolve => {
                const map = maps[i].map
                const path = ig.rouge.mod.baseDirectory + 'assets/data/maps/' + map.name.split('.').join('/') + '.json'
                const json = JSON.stringify(map)
                fs.writeFileSync(path, json)
                resolve()
            }))
        }


        console.log(maps)
        area.addToDatabase()
        const areaSettings = {
            width: 300,
            height: 100,
            chestCount: 0,
            connections: [],
            landmarks: [],
            maps,
        }
        let areaObj = area.generateArea(areaSettings)
        area.saveToFile(areaObj)

        ig.game.varsChangedDeferred()

        ig.blitzkrieg.puzzleSelections.save()
        ig.blitzkrieg.battleSelections.save()

        Promise.all(fileWritePromises)
        ig.game.teleport('rouge.gen.0', ig.TeleportPosition.createFromJson({
            marker: 'start',
            pos: 0,
            face: null,
            level: 0,
            baseZPos: 0,
            size: {x:0, y:0}
        }))
    }
}
