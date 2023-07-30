const fs = require('fs')
//const tilesize = 16

export class AreaInfo {
    constructor(name, displayName, displayDesc, areaType, x, y) {
        this.name = name
        this.displayName = displayName
        this.displayDesc = displayDesc
        this.areaType = areaType
        this.x = x
        this.y = y
    }
}

export class AreaBuilder {
    constructor(area) {
        this.initialWidth = 300
        this.initialHeight = 300
        this.area = area
        this.areaTilesize = 64
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

    addAreaToDatabase() {
        const dbEntry = {
            name: this.allLanguages(this.area.displayName),
            description: this.allLanguages(this.area.displayDesc),
            areaType: this.area.areaType,
            order: 1001,
            track: true,
            chests: 0,
            position: { x: this.area.x, y: this.area.y },
        }
        
        ig.database.data.areas[this.area.name] = dbEntry
    }

    addStampToMenu(stamp, offset) {
        const x = stamp.x + offset.x*8
        const y = stamp.y + offset.y*8
        const z = 0
        sc.menu.addMapStamp(stamp.area, stamp.type, x, y, z)
    }

    beginBuild() {
        this.width = this.initialWidth
        this.height = this.initialHeight
        this.chestCount = 0
        this.connections = []
        this.landmarks = []
        this.tiles = blitzkrieg.util.emptyArray2d(this.width, this.height)
        this.mapArray = []
        this.mapIndex = -1
        this.lastExit = { x: this.width/2, y: this.height/2 }
    }

    finalizeBuild() {
        this.trim()
        this.builtArea = {
            DOCTYPE: "AREAS_MAP",
            name: this.allLanguages(this.name),
            width: this.width, height: this.height,
            chests: this.chestCount,
            defaultFloor: 0,
            floors: [
                {
                    level: 0,
                    tiles: this.tiles,
                    icons: [],
                    maps: this.mapArray, 
                    connections: this.connections,
                    landmarks: this.landmarks,
                }
            ]
        }
    }

    trim() {

    }

    placeMapTiles(obj, offset) {
        const rects = obj.rects
        for (const rect of rects) {
            let x1 = Math.floor(rect.x / this.areaTilesize) + offset.x
            let y1 = Math.floor(rect.y / this.areaTilesize) + offset.y
            let x2 = Math.ceil(rect.width / this.areaTilesize) + x1
            let y2 = Math.ceil(rect.height / this.areaTilesize) + y1
            for (let y = y1; y < y2; y++) {
                for (let x = x1; x < x2; x++) {
                    this.tiles[y][x] = this.mapIndex+1
                }
            }
        }
        // return { 
        //     width: Math.floor(obj.map.mapWidth/(this.areaTilesize/16)),
        //     height: Math.floor(obj.map.mapHeight/(this.areaTilesize/16)),
        // }
    }

    arrangeMap(mapObj) {
        let ent, exit
        for (const entity of mapObj.map.entities) {
            if (entity.type == 'Door') {
                if (entity.dir !== undefined) {
                    switch (entity.settings.name) {
                    case 'start':
                        ent = { x: Math.floor(entity.x/this.areaTilesize), y: Math.floor(entity.y/this.areaTilesize), dir: entity.dir }; break
                    case 'end':
                        exit = { x: Math.floor(entity.x/this.areaTilesize), y: Math.floor(entity.y/this.areaTilesize), dir: entity.dir }; break
                    default:
                        debugger
                    }
                } else {
                    console.log(entity)
                    debugger
                }
            }
        }
        if (! ent || ! exit) { debugger; return }

        const offset = { x: this.lastExit.x - ent.x, y: this.lastExit.y - ent.y }
        
        exit.x += offset.x
        exit.y += offset.y
        this.lastExit = this.placeMap(mapObj, offset, exit, exit.dir)
    }

    placeMap(mapObj, offset, pos, side) {
        this.mapIndex++
        const map = mapObj.map
        this.mapArray.push({
            path: map.name.split('/').join('.'),
            name: this.allLanguages(map.displayName),
            dungeon: map.type,
            offset: { x: 0, y: 0 }
        })
        for (const stamp of map.stamps) {
            this.addStampToMenu(stamp, offset)
        }
        this.placeMapTiles(mapObj, offset)
        let xInc = 0, yInc = 0
        switch (side) {
            case 0: yInc = -1; break
            case 1: xInc = 1; break
            case 2: yInc = 1; break
            case 3: xInc = -1; break
        }
        for (let x = pos.x, y = pos.y, i = 0; i < 100; x += xInc, y += yInc, i++) {
            if (this.tiles[y][x] == 0) {
                return { x, y }
            }
        }
        debugger
    }

    saveToFile() {
        if (! this.builtArea) {
            console.log('area not build?')
            debugger
            return
        }
        fs.writeFileSync(rouge.mod.baseDirectory + 'assets/data/areas/' + this.area.name + '.json', JSON.stringify(this.builtArea))
    }
}

export function getMapStamp(area, pos, type, dir) {
    if (typeof type == 'number') {
        switch (type) {
        case 0: type = 'ARROW_UP'; break
        case 1: type = 'ARROW_RIGHT'; break
        case 2: type = 'ARROW_DOWN'; break
        case 3: type = 'ARROW_LEFT'; break
        }
    }
    return { area, type, dir, x: Math.floor(pos.x/8), y: Math.floor(pos.y/8), z: 0 }
}
