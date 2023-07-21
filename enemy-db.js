let mainseed

export class EnemyDb {
    constructor() {
        this.preset = {
            seed: 'obama',
            origLevelDistance: [15, 10],
            levelDiffRatio: 2,
            difficultyDiffRatio: 2,
            difficultyOffset: 0,
            enemyTypeCount: [1, 3],
            weightRatio: 7,
            difficultyDistance: [2, 2],
            elementCompatibility: true,
        }
        mainseed = { seed: ig.copy(this.preset.seed) }
    }

    loadDatabase() {
        let dbPath = ig.rouge.mod.baseDirectory + 'enemydb.json'
        let json = require('fs').readFileSync(dbPath, 'utf8')
        this.db = JSON.parse(json)

        for (let eName in this.db.regularEnemies) {
            // game database entry
            let gde = ig.database.data.enemies[eName]
            // db entry
            let dbE = this.db.regularEnemies[eName]
            dbE.params = gde.params
            dbE.level = gde.level
            // console.log(gde, dbE)
        }
        this.dbKeys = {
            regularEnemies: Object.keys(ig.rouge.enemyDb.db.regularEnemies)
        }
    }
    
    generateRoomSeed(avg) {
        let minStatPrec = 80
        let maxStatPrec = 120
        let attack = Math.floor(avg * ig.blitzkrieg.util.seedrandom(minStatPrec, maxStatPrec, mainseed)/100)
        let defense = Math.floor(avg * ig.blitzkrieg.util.seedrandom(minStatPrec, maxStatPrec, mainseed)/100)
        let focus = Math.floor(avg * ig.blitzkrieg.util.seedrandom(minStatPrec, maxStatPrec, mainseed)/100)

        let statLen = 3
        let randEndLen = 16 - statLen*3 - 2
        let randEnd = ig.blitzkrieg.util.seedrandom(0, Math.pow(10, randEndLen+1)-1, mainseed)
        let roomseed = '7' + '' +
            attack.toString().padStart(statLen, '0') + '' +
            defense.toString().padStart(statLen, '0') + '' +
            focus.toString().padStart(statLen, '0') + '' +
            randEnd.toString().padStart(randEndLen, '0')
        
        return { seed: roomseed }
    }

    calculateNumberDistance(num1, num2, multi) {
        let tmp1 = Math.pow(Math.abs(num1 - num2), multi)
        if (tmp1 == 0) { tmp1 = 0.8 }
        return (Math.abs(num1 + num2)/2*multi) / tmp1
    }

    generateSpawner(rect, group, difficulty, level, elements) {
        let bp = ig.game.playerEntity.params.baseParams
        let avg = Math.floor((bp.attack + bp.focus + bp.defense)/3)
        let roomseed = this.generateRoomSeed(avg)
        // console.log('roomseed: ', roomseed.seed)

        difficulty += this.preset.difficultyOffset

        // let weightAv = level / this.preset.weightRatio

        let minDiff = difficulty - this.preset.difficultyDistance[0]
        let maxDiff = difficulty + this.preset.difficultyDistance[1]
        
        let minLevel = level - this.preset.origLevelDistance[0]
        let maxLevel = level + this.preset.origLevelDistance[1]

        let enemyChancePool = {}
        let sum = 0
        for (let name of this.dbKeys.regularEnemies) {
            let e = this.db.regularEnemies[name]

            if (this.preset.elementCompatibility) {
                // check for element compatibility
                // check if any elements are available
                if (e.elements[0] == -1) {
                    let elementsOk = false
                    for (let i = 0; i < e.elements.length; i++) {
                        if (elements[i]) {
                            elementsOk = true 
                            break
                        }
                    }
                    if (! elementsOk) { continue }
                } else {
                    for (let i = 0; i < e.elements.length; i++) {
                        if (e.elements[i] && !elements[i]) { continue }
                    }
                }
            }

            if (! (e.difficulty >= minDiff && e.difficulty <= maxDiff &&
                e.level >= minLevel && e.level <= maxLevel)) {
                continue 
            }
            
            // let levelDiff = Math.exp(this.preset.levelDiffRatio * Math.abs(e.level - level)/10)
            let levelDiff = this.calculateNumberDistance(e.level, level, this.preset.levelDiffRatio)
            let difficultyDiff = this.calculateNumberDistance(e.difficulty, difficulty, this.preset.difficultyDiffRatio)

            let totalChance = this.calculateNumberDistance(levelDiff, difficultyDiff, 1)
            // console.log(name, levelDiff.toFixed(2), difficultyDiff.toFixed(2), totalChance)

            enemyChancePool[name] = totalChance
            sum += totalChance
        }
        enemyChancePool = Object.entries(enemyChancePool).sort((a, b) => a[1] - b[1])
        // console.log(weightAv)

        for (let i = 0; i < enemyChancePool.length; i++) {
            enemyChancePool[i][1] = enemyChancePool[i][1]/sum*100
        }
        enemyChancePool.sort((a, b) => b[1] - a[1])
        // console.log(ig.copy(enemyChancePool))
        

        // let enemyCount = ig.blitzkrieg.util.seedrandom(this.preset.enemyTypeCount[0], this.preset.enemyTypeCount[1], roomseed)
        let enemyCount = 1
        let types = []
        for (let i = 0; i < enemyCount; i++) {
            let rand = ig.blitzkrieg.util.seedrandom(0, 100, roomseed)
            let acc = 0
            for (let obj of enemyChancePool) {
                let chance = obj[1]
                if (rand - acc <= chance) {
                    types.push(obj[0])
                    break
                }
                acc += chance
            }

        }
        // console.log(ig.copy(types))

        let enemies = []
        for (let enemyType of types) {
            enemies.push({ count: 1, type: enemyType })
        }
        // enemies = [ 
        //     { count: 1, type: 'heat.moth' },
        //     { count: 1, type: 'jungle.chicken' },
        //     { count: 1, type: 'jungle.ghost' },
        //     { count: 1, type: 'jungle.blueray' },
        //     { count: 1, type: 'jungle.octopus' },
        //     { count: 1, type: 'heat.heat-golem' },
        // ]
        // console.log(ig.copy(enemies))

        return { spawner: ig.rouge.entitySpawn.enemySpawner(rect, -1, group, enemies), enemies }
    }

    spawnEntityMapObjects(map, rect, entranceSide, exitSide, enemies, elements) {
        exitSide = (exitSide+2)%4
        let debugIgnoreElements = false

        rect.x2 = rect.x + rect.width
        rect.y2 = rect.y + rect.height
        let objectsIncluded = new Set()
        for (let obj of enemies) {
            let type = obj.type
            let mapObjects = this.db.regularEnemies[type].mapElements
            if (mapObjects && ! objectsIncluded.has(mapObjects)) {
                let mx = rect.x + rect.width/2
                let my = rect.y + rect.height/2
                objectsIncluded.add(mapObjects)

                let es = ig.rouge.entitySpawn
                switch (mapObjects) {
                case 'pole': {
                    let pole = es.elementPole(mx - 8, my + 64)
                    map.entities.push(pole)
                    break
                }
                case 'magnet': {
                    let side = 0
                    let x, y 
                    while(entranceSide == side || exitSide == side) { side++ }
                    switch (side) {
                    case 0: x = mx - 8; y = rect.y + 24; break
                    case 1: x = rect.x2 - 24; y = my - 8; break
                    case 2: x = mx - 8; y = rect.y2 - 24; break
                    case 3: x = rect.x + 24; y = my - 8; break
                    }
                    let magnet = es.magnet(x, y, side)
                    map.entities.push(magnet)
                    break
                }
                case 'teslaCoil': {
                    let source = es.teslaCoil(rect.x + 4, rect.y + 4, 'SOURCE')
                    let antiCompressor = es.antiCompressor(rect.x + 24, rect.y + 4)
                    let ground = es.teslaCoil(rect.x + 32, rect.y + 96, 'GROUND_DISCHARGE')
                    map.entities.push(source)
                    map.entities.push(antiCompressor)
                    map.entities.push(ground)

                    if (objectsIncluded.has('compressor')) { break }
                    mapObjects = 'compressor'
                }
                // eslint-disable-next-line no-fallthrough
                case 'compressor': {
                    let boldPntMarker1 = es.boldPntMarker(mx - 16, my - 16, 1)
                    let compressor = es.compressor(rect.x + 80, rect.y2 - 80)
                    map.entities.push(boldPntMarker1)
                    map.entities.push(compressor)
                    break
                }
                case 'waveTeleport': {
                    let tp1 = es.waveTeleport(rect.x + 32, rect.y + 32)
                    let tp2 = es.waveTeleport(rect.x2 - 32, rect.y2 - 32)
                    map.entities.push(tp1)
                    map.entities.push(tp2)
                    // if player is missing wave
                    if (! elements[3] || debugIgnoreElements) {
                        let ballChangerWave1 = es.ballChangerElement(rect.x + 32, rect.y2 - 48, 'WAVE', 0)
                        let ballChangerWave2 = es.ballChangerElement(rect.x2 - 48, rect.y + 32, 'WAVE', 0)
                        map.entities.push(ballChangerWave1)
                        map.entities.push(ballChangerWave2)
                    }
                    break
                }
                case 'waterBubblePanel': {
                    let waterBubblePanel = es.waterBubblePanel(mx + 56, my + 56)
                    map.entities.push(waterBubblePanel)
                }
                }
            }
        }
    }
}
