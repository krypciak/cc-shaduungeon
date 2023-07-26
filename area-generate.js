const fs = require('fs')
const tilesize = 16

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

    generateTilesAndStamps(s) {
        let xOffset = 5
        let yOffset = 5
        const tilesize = 64
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
            for (const stamp of obj.map.stamps) {
                console.log(stamp)
                const x = stamp.x + xOffset*8
                const y = stamp.y + yOffset*8
                const z = 0
                console.log(x, y, z)
                sc.menu.addMapStamp(stamp.area, stamp.type, x, y, z)
            }
            xOffset += Math.floor(obj.map.mapWidth/(tilesize/16)) + 2
        }
        return tiles
    }

    generateArea(s) {
        const tiles = this.generateTilesAndStamps(s)

        const maps = []
        let i = 0
        for (const obj of s.maps) {
            const map = obj.map
            maps.push({
                path: map.name.split('/').join('.'),
                name: this.allLanguages(map.displayName),
                dungeon: map.type,
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

export function getMapStamp(area, pos, dir) {
    let type
    if (typeof dir == 'number') {
        switch (dir) {
        case 0: type = 'ARROW_UP'; break
        case 1: type = 'ARROW_RIGHT'; break
        case 2: type = 'ARROW_DOWN'; break
        case 3: type = 'ARROW_LEFT'; break
        }
    } else {
        type = dir
    }
    return { area, type, x: Math.floor(pos.x/8), y: Math.floor(pos.y/8), z: 0 }
}
