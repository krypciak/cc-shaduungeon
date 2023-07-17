const fs = require('fs')
let tilesize

export class RoomGenerator {
    constructor() {
        this.puzzles = Object.fromEntries(Object.entries(ig.blitzkrieg.puzzleSelections.selHashMap)
            .filter((arr) => arr[1].sels && arr[1].sels.length > 0 && ! arr[0].includes('rouge')))
        this.puzzleKeys = Object.keys(this.puzzles)

        this.spawners = ig.blitzkrieg.allSpawners
        this.spawnerKeys = Object.keys(this.spawners)

        tilesize = ig.blitzkrieg.tilesize
    }

    getRandomSpawners(count) {
        let items = []
        for (let i = 0; i < count; i++) {
            let mapName = this.spawnerKeys[Math.floor(Math.random() * this.spawnerKeys.length)]
            let arr = this.spawners[mapName]
            let randomIndex = Math.floor(Math.random() * arr.length)
            let item = arr[randomIndex]
            items.push({ spawner: item, map: mapName })
        }
        return items
    }

    getRandomPuzzles(count) {
        let items = []
        for (let i = 0; i < count; i++) {
            let mapName = this.puzzleKeys[Math.floor(Math.random() * this.puzzleKeys.length)]
            let obj = this.puzzles[mapName]
            let randomIndex = Math.floor(Math.random() * obj.sels.length)
            let item = obj.sels[randomIndex]
            items.push(item)
        }
        return items
    }

    async generate() {
        ig.blitzkrieg.msg('rouge', 'generate')

        let randPuzzles = []
        for (let mapName in this.puzzles) {
            let sels = this.puzzles[mapName]
            for (let sel of sels.sels) {
                if (sel.data.type == 'dis') { continue }
                randPuzzles.push(sel)
            }
        }
        if (! this.mapIndex) {
            this.mapIndex = 1
        }
        
        let roomConfig = {
            size: { width: 150, height: 150 },
            levels: 4,
            theme: ig.rouge.roomComponents.themes.rhombusDng,
            puzzle: { x: 40*tilesize, y: 40*tilesize, spacing: 3*tilesize },
            puzzleTunnel: { width: 8*tilesize, height: 5*tilesize },
            battleStartCond: 'tmp.battle1',
            battleDoneCond: 'map.battle1done',
            enemyGroup: 'battle1',
            battle: { width: 21*tilesize, height: 21*tilesize, spacing: 2*tilesize },
            battleTunnel: { width: 5*tilesize, height: 5*tilesize },
        }

        // this.mapIndex == 1 ? this.puzzles['rhombus-dng/room-1-5'].sels[0] : this.puzzles['rhombus-dng/room-1-5'].sels[1],
        // randPuzzles = [ this.puzzles['rhombus-dng/room-1-5'].sels[1], ]
        // console.log(randPuzzles)
        let map
        for (let i = 0; i < randPuzzles.length; i++) {
            map = await this.generateRoom(
                randPuzzles[i], roomConfig, this.mapIndex++)
            ig.vars.storage.maps[map.name] = {}
        }
        ig.game.varsChangedDeferred()
        
        ig.game.teleport('rouge.gen.1', ig.TeleportPosition.createFromJson({
            marker: 'start',
            pos: 0,
            face: null,
            level: 0,
            baseZPos: 0,
            size: {x:0, y:0}
        }))
        this.mapIndex = 1


        ig.blitzkrieg.puzzleSelections.save()
        ig.blitzkrieg.battleSelections.save()
    }

    async generateRoom(puzzleSel, rc, mapIndex) {
        rc = ig.copy(rc)
        //let baseMapName = 'rouge.300empty'
        let mapName = 'rouge/gen/' + mapIndex
        let nextMapName = 'rouge/gen/' + (mapIndex+1)
        let prevMapName = 'rouge/gen/' + (mapIndex-1)

        let condId = ig.blitzkrieg.util.generateUniqueID()
        rc.battleStartCond = rc.battleStartCond + '_' + condId
        rc.battleDoneCond = rc.battleDoneCond + '_' + condId

        let tunnelQueue = []
        let map = ig.rouge.roomComponents.getEmptyRoom(rc.size.width, rc.size.height, rc.levels, rc.theme)
        map.name = mapName

        let puzzleUniqueId = ig.blitzkrieg.util.generateUniqueID()
        let puzzleUniqueSel = ig.blitzkrieg.selectionCopyManager
            .createUniquePuzzleSelection(puzzleSel, rc.puzzle.x, rc.puzzle.y, puzzleUniqueId)

        ig.blitzkrieg.puzzleSelections.selHashMap[mapName] = {
            sels: [ puzzleUniqueSel ],
            tempSel: { bb: [], map: mapName, data: {} },
            fileIndex: ig.rouge.puzzleFileIndex,
        }

        let puzzleStartPosInRect = ig.copy(puzzleUniqueSel.data.startPos)
        let puzzleStartPosSide = puzzleSel.data.type == 'whole room' ?
            ig.blitzkrieg.util.setToClosestSelSide(puzzleStartPosInRect, puzzleUniqueSel) :
            ig.blitzkrieg.util.setToClosestRectSide(puzzleStartPosInRect, puzzleUniqueSel.size).side

        let puzzleEndPosInRect = ig.copy(puzzleUniqueSel.data.endPos)
        let puzzleEndPosSide = puzzleSel.data.type == 'whole room' ?
            ig.blitzkrieg.util.setToClosestSelSide(puzzleEndPosInRect, puzzleUniqueSel) :
            ig.blitzkrieg.util.setToClosestRectSide(puzzleEndPosInRect, puzzleUniqueSel.size).side

        
        let puzzleSolveCond
        if (puzzleSel.data.completionType == 'normal') {
            puzzleSolveCond = ig.blitzkrieg.puzzleRecordManager.getPuzzleSolveCondition(puzzleSel)
            console.log('puzzleSolution: ' + puzzleSolveCond)
            if (! puzzleSolveCond) {
                // console.err('puzzle type is ' + puzzleSel.data.type + ', solution not found')
            }
        } else {
            puzzleSolveCond = 'map.puzzleSolution1'
        }


        let puzzleTunnelSides = puzzleStartPosSide % 2 == 0 ? [0,1,0,1] : [1,0,1,0]
        let puzzleExitCond = rc.battleStartCond + ' && !' + rc.battleDoneCond

        let puzzleRoomRect
        if (puzzleSel.data.type == 'whole room') {
            puzzleRoomRect = ig.rouge.roomComponents
                .rectRoom(map, puzzleUniqueSel.size, rc.theme, -1, [1,1,1,1], null, {
                    name: 'puzzle',
                    side: puzzleStartPosSide,
                    pos: puzzleStartPosInRect,
                    drawSides: puzzleTunnelSides,
                    width: rc.puzzleTunnel.width,
                    height: rc.puzzleTunnel.height,
                    queue: tunnelQueue,
                    exitCond: puzzleExitCond, 
                    noNavMap: true,
                })
        } else if (puzzleSel.data.type == 'add walls') {
            puzzleRoomRect = ig.rouge.roomComponents
                .rectRoom(map, puzzleUniqueSel.size, rc.theme, rc.puzzle.spacing, [1,1,1,1], {
                    side: puzzleEndPosSide,
                    prefX: puzzleStartPosInRect.x,
                    prefY: puzzleStartPosInRect.y,
                    marker: 'end',
                    destMarker: 'start',
                    destMap: nextMapName,
                    cond: puzzleSolveCond + '_' + puzzleUniqueId,
                }, {
                    name: 'puzzle',
                    side: puzzleStartPosSide,
                    prefX: puzzleStartPosInRect.x,
                    prefY: puzzleStartPosInRect.y,
                    drawSides: puzzleTunnelSides,
                    width: rc.puzzleTunnel.width,
                    height: rc.puzzleTunnel.height,
                    queue: tunnelQueue,
                    exitCond: puzzleExitCond,
                    noNavMap: true,
                })
        }


        ig.blitzkrieg.msg('rouge', 'difficulty: ' + this.currentDifficulty, 1)
        ig.blitzkrieg.msg('rouge', 'level: ' + this.currentLevel, 1)

        let battleRoomX1, battleRoomY1
        if (puzzleStartPosSide % 2 == 0) {
            battleRoomX1 = puzzleStartPosInRect.x - rc.battle.width/2
        } else {
            battleRoomY1 = puzzleStartPosInRect.y - rc.battle.height/2
        }
        console.log(puzzleStartPosSide)
        if (puzzleSel.data.type == 'whole room') {
            switch (puzzleStartPosSide) {
            case 0: battleRoomY1 = puzzleStartPosInRect.y - rc.puzzleTunnel.width - rc.battle.height + 16; break
            case 1: battleRoomX1 = puzzleStartPosInRect.x + rc.puzzleTunnel.width - 16; break
            case 2: battleRoomY1 = puzzleStartPosInRect.y + rc.puzzleTunnel.width - 16; break
            case 3: battleRoomX1 = puzzleStartPosInRect.x + rc.puzzleTunnel.width; break
            }
        } else {
            switch (puzzleStartPosSide) {
            case 0: battleRoomY1 = puzzleRoomRect.y - rc.puzzleTunnel.width - rc.battle.height; break
            case 1: battleRoomX1 = puzzleRoomRect.x2 + rc.puzzleTunnel.width; break
            case 2: battleRoomY1 = puzzleRoomRect.y2 + rc.puzzleTunnel.width; break
            case 3: battleRoomX1 = puzzleRoomRect.x + rc.puzzleTunnel.width; break
            }
        }
        
        ig.rouge.battleRoom.generateRoom(
            map, rc.theme, battleRoomX1, battleRoomY1, prevMapName, puzzleStartPosSide, rc, tunnelQueue)

        let puzzleMap = ig.copy(ig.blitzkrieg.allMaps[puzzleSel.map])
        let closestX, closestY
        if (puzzleSel.data.type == 'whole room') {
            let closestDoor = 10000
            for (let i = 0; i < puzzleMap.entities.length; i++) {
                let e = puzzleMap.entities[i]
                if (e.type == 'Door') {
                    let dist = Math.sqrt(Math.pow(e.x - puzzleUniqueSel.data.endPos.x,2) + Math.pow(e.y - puzzleUniqueSel.data.endPos.y,2))
                    if (dist < closestDoor) {
                        dist = closestDoor
                        closestX = e.x
                        closestY = e.y
                    }
                }
            }
        }
        for (let i = 0; i < puzzleMap.entities.length; i++) {
            let e = puzzleMap.entities[i]
            if (e.type == 'Door') {
                if (puzzleSel.data.type == 'whole room' && e.x == closestX && e.y == closestY) {
                    e.settings.condition = (puzzleSel.data.completionType == 'getTo' ? '' : puzzleSolveCond)
                    e.settings.name = 'end'
                    e.settings.marker = 'start'
                    e.settings.map = nextMapName
                } else {
                    puzzleMap.entities.splice(i, 1)
                    i--
                }
            }
        }
        if (puzzleSel.data.completionType == 'getTo' && puzzleSel.data.type == 'add walls') {
            let endPos = puzzleSel.data.endPos
            puzzleMap.entities.push(ig.rouge.entitySpawn.floorSwitch(endPos.x, endPos.y, endPos.level, puzzleSolveCond))
        }
        map = await ig.blitzkrieg.selectionCopyManager
            .copySelToMap(map, puzzleMap, puzzleSel, rc.puzzle.x, rc.puzzle.y, mapName, false, false, true, puzzleUniqueId)
        

        let newMapPath = './assets/mods/cc-rouge/assets/data/maps/' + mapName + '.json'
        let newMapJson = JSON.stringify(map)
        fs.writeFileSync(newMapPath, newMapJson)
        // fs.writeFile(newMapPath, newMapJson, (err) => {
        //     if (err) {
        //         console.err(err)
        //     }
        // })
        return map
    }
}
