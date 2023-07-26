const fs = require('fs')

export class Area {
    constructor(name, displayName, displayDesc, areaType, x, y) {
        this.name = name
        this.displayName = displayName
        this.displayDesc = displayDesc
        this.areaType = areaType
        this.x = x
        this.y = y
    }

    allLanguages(text) {
        return {
            en_US: text, 
            de_DE: text, 
            ja_JP: text, 
            zh_CN: text, 
            ko_KR: text, 
            zh_TW: text, 
            langUid: 0,
        }
    }

    addToDatabase() {
        const dbEntry = {
            name: this.allLanguages(this.displayName),
            description: this.allLanguages(this.displayDesc),
            areaType: this.areaType,
            order: 1001,
            track: true,
            chests: 0,
            position: { x: this.x, y: this.y },
        }
        
        ig.database.data.areas[this.name] = dbEntry
    }

    generateTiles(s) {
        let xOffset = 5
        let yOffset = 5
        const tilesize = 32
        const tiles = ig.blitzkrieg.util.emptyArray2d(s.width, s.height)
        for (let i = 0; i < s.maps.length; i++) {
            const obj = s.maps[i]
            const rects = obj.rects
            for (const rect of rects) {
                let x1 = Math.floor(rect.x / tilesize) + xOffset
                let y1 = Math.floor(rect.y / tilesize) + yOffset
                let x2 = Math.ceil(rect.width / tilesize) + x1
                let y2 = Math.ceil(rect.height / tilesize) + y1
                for (let y = y1; y < y2; y++) {
                    for (let x = x1; x < x2; x++) {
                        tiles[y][x] = i+1
                    }
                }
            }
            xOffset += Math.floor(obj.map.mapWidth/(tilesize/16)) + 2
        }
        return tiles
    }

    generateArea(s) {
        const tiles = this.generateTiles(s)

        const maps = []
        let i = 0
        for (const obj of s.maps) {
            maps.push({
                path: obj.map.name.split('/').join('.'),
                name: this.allLanguages('index ' + i),
                dungeon: 'DUNGEON',
                offset: { x: 0, y: 0 }
            })
            i++
        }

        const areaObject = {
            DOCTYPE: "AREAS_MAP",
            name: this.allLanguages(this.name),
            width: s.width, height: s.height,
            chests: s.chestCount || 0,
            defaultFloor: 0,
            floors: [
                {
                    level: 0,
                    tiles,
                    icons: [],
                    maps, 
                    connections: s.connections || [],
                    landmarks: s.landmarks || [],
                }
            ]
        }
        return areaObject
    }

    saveToFile(areaObj) {
        fs.writeFileSync(ig.rouge.mod.baseDirectory + 'assets/data/areas/' + this.name + '.json', JSON.stringify(areaObj))
    }
}
