let mainseed

export class EnemyDb {
    constructor() {
        let es = ig.rouge.entitySpawn

        this.pole = { e: es.elementPole(0, 64) }
        this.waterBubblePanel = { e: es.waterBubblePanel(-64, 0) }
        this.waveTeleport = { e: es.waveTeleport(-64, 0) }
        this.compressor = { e: es.compressor(0, 64) }
        this.magnet = { e: es.magnet(0, -128), dirAdj: true }
        this.teslaCoil = { e: es.teslaCoil(0, 64, 'GROUND_DISCHARGE') }
        // let ballChangerHeat = es.ballChangerElement(0, -64, 'HEAT', 0)
        // let ballChangerCold = es.ballChangerElement(0, -64, 'COLD', 0)
        // let ballChangerWave = es.ballChangerElement(0, -64, 'WAVE', 0)
        // let ballChangerShock = es.ballChangerElement(0, -64, 'SHOCK', 0)
        

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
                    if (! elementsOk) { 
                        // console.log('rejected element -1: ', name)
                        continue
                    }
                } else {
                    for (let i = 0; i < e.elements.length; i++) {
                        if (e.elements[i] && !elements[i]) {
                            // console.log('rejected no element: ', name)
                            continue
                        }
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
        // console.log(ig.copy(enemies))

        return ig.rouge.entitySpawn.enemySpawner(rect, group, enemies)
    }
}
