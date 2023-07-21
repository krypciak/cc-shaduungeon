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
            this.mapIndex = 0
        }
        
        let roomConfig = {
            size: { width: 150, height: 150 },
            levels: 4,
            theme: 'adaptive',
            puzzle: { x: 40*tilesize, y: 40*tilesize, spacing: 3*tilesize },
            puzzleTunnel: { width: 8*tilesize, height: 5*tilesize },
            battleStartCond: 'tmp.battle1',
            battleDoneCond: 'map.battle1done',
            enemyGroup: 'battle1',
            battle: { width: 21*tilesize, height: 21*tilesize, spacing: 2*tilesize },
            battleTunnel: { width: 5*tilesize, height: 5*tilesize },
        }

        // this.mapIndex == 1 ? this.puzzles['rhombus-dng/room-1-5'].sels[0] : this.puzzles['rhombus-dng/room-1-5'].sels[1],
        // randPuzzles = [ randPuzzles[13] ]
        // randPuzzles = [ randPuzzles[1] ]
        // randPuzzles = [ ig.blitzkrieg.puzzleSelections.selHashMap['rhombus-dng/entrance'].sels[0] ]
        let map
        for (let i = 0; i < /*2;*/ randPuzzles.length; i++) {
            map = await this.generateRoom(
                randPuzzles[i], roomConfig, this.mapIndex++)
            ig.vars.storage.maps[map.name] = {}
            console.log('------------- ', i, randPuzzles[i])
        }
        ig.game.varsChangedDeferred()
        
        ig.game.teleport('rouge.gen.0', ig.TeleportPosition.createFromJson({
            marker: 'start',
            pos: 0,
            face: null,
            level: 0,
            baseZPos: 0,
            size: {x:0, y:0}
        }))
        this.mapIndex = 0


        ig.blitzkrieg.puzzleSelections.save()
        ig.blitzkrieg.battleSelections.save()
    }

    async generateRoom(puzzleSel, rc, mapIndex) {
        rc = ig.copy(rc)
        if (rc.theme == 'adaptive') {
            rc.theme = ig.rouge.roomComponents.getThemeFromSel(puzzleSel)
        }

        //let baseMapName = 'rouge.300empty'
        let mapName = 'rouge/gen/' + mapIndex
        let nextMapName = 'rouge/gen/' + (mapIndex+1)
        let prevMapName = 'rouge/gen/' + (mapIndex-1)

        let condId = ig.blitzkrieg.util.generateUniqueID()
        rc.battleStartCond = rc.battleStartCond + '_' + condId
        rc.battleDoneCond = rc.battleDoneCond + '_' + condId

        let tunnelQueue = []
        let map = ig.rouge.roomComponents.getEmptyMap(rc.size.width, rc.size.height, rc.levels, rc.theme)
        map.name = mapName

        let puzzleUniqueId = ig.blitzkrieg.util.generateUniqueID()
        let puzzleUniqueSel = ig.blitzkrieg.selectionCopyManager
            .createUniquePuzzleSelection(puzzleSel, rc.puzzle.x, rc.puzzle.y, puzzleUniqueId)
        console.log(puzzleUniqueSel)

        let puzzleStartPosInRect = ig.copy(puzzleUniqueSel.data.startPos)
        let puzzleStartPosSide = puzzleSel.data.type == 'whole room' ?
            ig.blitzkrieg.util.setToClosestSelSide(puzzleStartPosInRect, puzzleUniqueSel) :
            ig.blitzkrieg.util.setToClosestRectSide(puzzleStartPosInRect, puzzleUniqueSel.size).side

        let puzzleEndPosInRect = ig.copy(puzzleUniqueSel.data.endPos)
        let puzzleEndPosSide = puzzleSel.data.type == 'whole room' ?
            ig.blitzkrieg.util.setToClosestSelSide(puzzleEndPosInRect, puzzleUniqueSel) :
            ig.blitzkrieg.util.setToClosestRectSide(puzzleEndPosInRect, puzzleUniqueSel.size).side

        
        let puzzleSolveCond, puzzleSolveCondUnique
        if (puzzleSel.data.completionType == 'normal') {
            puzzleSolveCond = ig.blitzkrieg.puzzleSelectionManager.getPuzzleSolveCondition(puzzleSel)
            console.log('puzzleSolution: ' + puzzleSolveCond)
        } else {
            puzzleSolveCond = 'map.puzzleSolution1'
        }
        puzzleSolveCondUnique = puzzleSolveCond
        if (! puzzleSolveCond.includes('_destroyed')) { puzzleSolveCondUnique += '_' + puzzleUniqueId }

        let puzzleMap = ig.copy(ig.blitzkrieg.allMaps[puzzleSel.map])
        let closestX, closestY, foundAnyDoor = false, closestDoor = 1000000
        if (puzzleSel.data.type == 'whole room') {
            for (let i = 0; i < puzzleMap.entities.length; i++) {
                let e = puzzleMap.entities[i]
                if (e.type == 'Door' || e.type == 'TeleportGround') {
                    let dist = Math.sqrt(Math.pow(e.x - puzzleSel.data.endPos.x, 2) + Math.pow(e.y - puzzleSel.data.endPos.y, 2))
                    if (dist < closestDoor) {
                        closestDoor = dist
                        closestX = e.x
                        closestY = e.y
                    }
                }
            }
        }
        console.log('closestDoor: ', closestDoor)
        for (let i = 0; i < puzzleMap.entities.length; i++) {
            let e = puzzleMap.entities[i]
            if (e.type == 'Door' || e.type == 'TeleportGround') {
                if (puzzleSel.data.type == 'whole room' && closestDoor < 20*tilesize && e.x == closestX && e.y == closestY) {
                    foundAnyDoor = true
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

        let puzzleTunnelSides = puzzleStartPosSide % 2 == 0 ? [0,1,0,1] : [1,0,1,0]
        let puzzleExitCond = rc.battleStartCond + ' && !' + rc.battleDoneCond

        let puzzleRoomRect
        if (puzzleSel.data.type == 'whole room') {
            let ds = foundAnyDoor ? null : {
                side: puzzleEndPosSide,
                prefX: puzzleEndPosInRect.x,
                prefY: puzzleEndPosInRect.y,
                marker: 'end',
                destMarker: 'start',
                destMap: nextMapName,
                cond: (puzzleSel.data.completionType == 'getTo' ? '' : puzzleSolveCondUnique)
            }
            puzzleRoomRect = ig.rouge.roomComponents
                .rectRoom(map, puzzleUniqueSel.size, rc.theme, -1, [1,1,1,1], ds, {
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
                    prefX: puzzleEndPosInRect.x,
                    prefY: puzzleEndPosInRect.y,
                    marker: 'end',
                    destMarker: 'start',
                    destMap: nextMapName,
                    cond: puzzleSolveCondUnique,
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


        // ig.blitzkrieg.msg('rouge', 'difficulty: ' + this.currentDifficulty, 1)
        // ig.blitzkrieg.msg('rouge', 'level: ' + this.currentLevel, 1)

        if (puzzleSel.data.completionType == 'getTo' && puzzleSel.data.type == 'add walls') {
            let endPos = puzzleSel.data.endPos
            puzzleMap.entities.push(ig.rouge.entitySpawn.floorSwitch(endPos.x, endPos.y, endPos.level, puzzleSolveCond))
        }

        let battleRoomX1, battleRoomY1
        if (puzzleStartPosSide % 2 == 0) {
            battleRoomX1 = puzzleStartPosInRect.x - rc.battle.width/2
        } else {
            battleRoomY1 = puzzleStartPosInRect.y - rc.battle.height/2
        }
        if (puzzleSel.data.type == 'whole room') {
            switch (puzzleStartPosSide) {
            case 0: battleRoomY1 = puzzleStartPosInRect.y - rc.puzzleTunnel.width - rc.battle.height + 16; break
            case 1: battleRoomX1 = puzzleStartPosInRect.x + rc.puzzleTunnel.width - 16; break
            case 2: battleRoomY1 = puzzleStartPosInRect.y + rc.puzzleTunnel.width - 16; break
            case 3: battleRoomX1 = puzzleStartPosInRect.x - rc.puzzleTunnel.width - rc.battle.width + 16; break
            }
        } else {
            switch (puzzleStartPosSide) {
            case 0: battleRoomY1 = puzzleRoomRect.y - rc.puzzleTunnel.width - rc.battle.height; break
            case 1: battleRoomX1 = puzzleRoomRect.x2 + rc.puzzleTunnel.width; break
            case 2: battleRoomY1 = puzzleRoomRect.y2 + rc.puzzleTunnel.width; break
            case 3: battleRoomX1 = puzzleRoomRect.x - rc.battle.width - rc.puzzleTunnel.width; break
            }
        }
        
        if (puzzleSel.data.type == 'whole room') {
            ig.rouge.roomComponents.addWallsInEmptySpace(map, rc.theme, puzzleUniqueSel)
        }

        let battleSel = ig.rouge.battleRoom.generateRoom(
            map, rc.theme, battleRoomX1, battleRoomY1, prevMapName, puzzleStartPosSide, rc, tunnelQueue)

        map = await ig.blitzkrieg.selectionCopyManager
            .copySelToMap(map, puzzleMap, puzzleSel, rc.puzzle.x, rc.puzzle.y, mapName, {
                disableEntities: false,
                mergeLayers: false,
                removeCutscenes: true,
                makePuzzlesUnique: true,
                uniqueId: puzzleUniqueId,
                uniqueSel: puzzleUniqueSel,
            })

        let obj = await ig.rouge.roomComponents.trimMap(map, rc.theme)
        map = obj.map

        ig.blitzkrieg.util.setSelPos(puzzleUniqueSel, puzzleUniqueSel.size.x - obj.xOffset, puzzleUniqueSel.size.y - obj.yOffset)
        ig.blitzkrieg.util.setSelPos(battleSel, battleSel.size.x - obj.xOffset, battleSel.size.y - obj.yOffset)

        ig.blitzkrieg.puzzleSelections.selHashMap[mapName] = {
            sels: [ puzzleUniqueSel ],
            tempSel: { bb: [], map: mapName, data: {} },
            fileIndex: ig.rouge.puzzleFileIndex,
        }

        ig.blitzkrieg.battleSelections.selHashMap[map.name] = {
            sels: [ battleSel ],
            tempSel: { bb: [], map: map.name, data: {} },
            fileIndex: ig.rouge.battleFileIndex,
        }

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
