const fs = require('fs')
import { AreaInfo, AreaBuilder } from './area-generate.js'
import { generateRoom } from './room-generate.js'

export class DungeonGenerator {
    constructor() { }

    async preloadPuzzleList() {
        if (! rouge.filteredPuzzleMap) {
            rouge.filteredPuzzleMap = Object.fromEntries(Object.entries(blitzkrieg.puzzleSelections.selHashMap)
                .filter((arr) => {
                    return arr[1].sels && arr[1].sels.length > 0 && ! arr[0].includes('rouge')
                }))

            rouge.puzzleList = []
            for (const mapName in rouge.filteredPuzzleMap) {
                const sels = rouge.filteredPuzzleMap[mapName]
                for (const sel of sels.sels) {
                    if (sel.data.type == 'dis') { continue }
                    rouge.puzzleList.push(sel)
                }
            }
        }
    }


    async generate() {
        blitzkrieg.msg('rouge', 'generate')
        await this.preloadPuzzleList()
        // await blitzkrieg.util.loadAllMaps()

        //puzzles = [ puzzles[0], puzzles[1], puzzles[2], puzzles[3], puzzles[4], puzzles[5], puzzles[6] ]
        const puzzles = []
        for (let i = 0; i < 6; i++) {
            puzzles.push(rouge.puzzleList[i])
        }
        
        const areaInfo = new AreaInfo('rougeDng', 'Generated Dungeon', 'generic description', 'DUNGEON', 150, 70)
        const areaBuilder = new AreaBuilder(areaInfo)
        areaBuilder.beginBuild()

        const fileWritePromises = []
        let lastSide = 0
        for (let i = 0; i < puzzles.length; i++) {
            console.log('------------- ', i, puzzles[i])
            const obj = await generateRoom(puzzles[i], areaInfo.name, i, lastSide)
            
            lastSide = (obj.puzzleEndPosSide+2)%4
            // write map file
            fileWritePromises.push(new Promise(resolve => {
                const map = obj.map
                const path = rouge.mod.baseDirectory + 'assets/data/maps/' + map.name.split('.').join('/') + '.json'
                const json = JSON.stringify(map)
                fs.writeFileSync(path, json)
                resolve()
            }))
            ig.vars.storage.maps[obj.map.name] = {}

            areaBuilder.arrangeMap(obj)
            console.log('------------------------')
        }

        areaBuilder.addAreaToDatabase()
        areaBuilder.finalizeBuild()
        areaBuilder.saveToFile()


        ig.game.varsChangedDeferred()

        blitzkrieg.puzzleSelections.save()
        blitzkrieg.battleSelections.save()

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
