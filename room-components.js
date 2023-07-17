let tilesize
export class RoomComponents {
    constructor() {
        tilesize = ig.blitzkrieg.tilesize
        this.themes = {
            rhombusDng: {
                bgm: 'puzzle',
                tileset: 'media/map/rhombus-dungeon2.png',
                mapStyle: 'rhombus-puzzle',
                floor: 34,
                wallUp: [0, 0, 169, 137, 105, 137, 105, 105, 38],
                wallUpShadow: [168, 200, 168, 97, 81, 65, 49, 33, 17],
                // wallRight: [0, 0, 79],
                wallRight: [0, 0, 6],
                wallRightShadow: [185, 217, 0],
                wallDown: [0, 0, 296],
                wallDownShadow: [184, 216, 0],
                // wallLeft: [70, 0, 0],
                wallLeft: [6, 0, 0],
                wallLeftShadow: [0, 201, 169],
                shadowCorner01: [
                    [200, 200],
                    [171, 217]],
                shadowCorner03: [
                    [200, 200],
                    [201, 170]],
                shadowCorner21: [ 
                    [187, 217],
                    [216, 216]],
                shadowCorner23: [ 
                    [201, 186],
                    [216, 216]],

                shadowEdge01: [
                    [185, 198],
                    [166, 168]],
                shadowEdge21: [
                    [182, 184],
                    [185, 214]],
                shadowEdge03: [
                    [197, 169],
                    [168, 165]],
                shadowEdge23: [
                    [184, 181],
                    [213, 169]],
            }
        }
    }
    
    getEmptyRoom(width, height, levels, theme) {
        let emptyData = ig.blitzkrieg.util.emptyArray2d(width, height)
        let layerTemplate = {
            width,
            height,
            visible: 1,
            repeat: false,
            distance: 1,
            yDistance: 0,
            tilesize,
            moveSpeed: { x: 0, y: 0 },
            data: ig.copy(emptyData),
        }
        let layers = []
        let levelsArr = []

        for (let i = 0; i < levels; i++) {
            levelsArr[i] = { height: i*32 }
            let background = ig.copy(layerTemplate)
            background.type = 'Background'
            background.name = 'NEW_BACKGROUND'
            background.tilesetName = theme.tileset
            background.level = i
            layers.push(background)

            if (i == 0) {
                let shadow = ig.copy(layerTemplate)
                shadow.type = 'Background'
                shadow.name = 'NEW_SHADOW'
                shadow.tilesetName = 'media/map/dungeon-shadow.png'
                shadow.level = i
                layers.push(shadow)
            }

            let collision = ig.copy(layerTemplate)
            collision.type = 'Collision'
            collision.name = 'NEW_COLLISION'
            collision.tilesetName = 'media/map/collisiontiles-16x16.png',
            collision.level = i
            layers.push(collision)

            let navigation = ig.copy(layerTemplate)
            navigation.type = 'Navigation'
            navigation.name = 'NEW_NAV'
            navigation.tilesetName = 'media/map/pathmap-tiles.png',
            navigation.level = i
            layers.push(navigation)
        }
        let light = ig.copy(layerTemplate)
        light.type = 'Light'
        light.name = 'NEW_LIGHT'
        light.tilesetName = 'media/map/lightmap-tiles.png'
        light.level = 'last'
        layers.push(light)

        let map = {
            name: 'empty',
            levels: levelsArr,
            mapWidth: width,
            mapHeight: height,
            masterLevel: 0,
            attributes: { 
                saveMode: 'ENABLED', 
                bgm: theme.bgm,
                cameraInBounds: false,
                'map-sounds': '',
                mapStyle: theme.mapStyle,
                weather: '',
                area: 'rhombus-dng' 
            },
            // screen is not used? setting just to be safe
            screen: { x: 0, y: 0 },
            entities: [],
            layer: layers,
        }

        return map
    }

    getRoomSidePos(side, floorX1, floorY1, floorX2, floorY2, prefX, prefY) {
        let x, y
        switch (side) {
        case 0: y = floorY1 - 1; break
        case 1: x = floorX2 + 1; break
        case 2: y = floorY2 + 1; break
        case 3: x = floorX1 - 1; break
        }
        if (side == 0 || side == 2) {
            x = floorX1 + (floorX2 - floorX1)/2
            if (prefX) { x = prefX/tilesize }
        } else {
            y = floorY1 + (floorY2 - floorY1)/2
            if (prefY) { y = prefY/tilesize }
        }
        x *= tilesize
        y *= tilesize

        return { x, y }
    }

    rectRoom(map, rect, theme, addSpace, drawSides, ds, ts) {
        let rectX1 = Math.floor(rect.x / tilesize)
        let rectY1 = Math.floor(rect.y / tilesize)
        let rectX2 = rectX1 + Math.floor(rect.width / tilesize)
        let rectY2 = rectY1 + Math.floor(rect.height / tilesize)

        let addWalls = true
        if (addSpace == -1) {
            addWalls = false
            addSpace = 0
        }
        let floorX1 = rectX1 - Math.floor(addSpace / tilesize)
        let floorY1 = rectY1 - Math.floor(addSpace / tilesize)
        let floorX2 = rectX2 + Math.floor(addSpace / tilesize) 
        let floorY2 = rectY2 + Math.floor(addSpace / tilesize)

        if (addWalls) {
            let layer, shadow, colls = [], light, navs = []
            // find layers
            for (let l of map.layer) {
                if (! layer && l.type == 'Background' && l.name == 'NEW_BACKGROUND' && l.level == 0) { layer = l.data }
                if (! shadow && l.type == 'Background' && l.name == 'NEW_SHADOW' && l.level == 0) { shadow = l.data }
                if (l.type == 'Collision' && l.name == 'NEW_COLLISION') { colls.push(l.data) }
                if (l.type == 'Navigation' && l.name == 'NEW_NAV') { navs.push(l.data) }
                if (! light && l.type == 'Light' && l.name == 'NEW_LIGHT') { light = l.data }
            }

            // draw floor
            for (let y = floorY1; y < floorY2; y++) {
                for (let x = floorX1; x < floorX2; x++) {
                    layer[y][x] = theme.floor
                    shadow[y][x] = 0
                    for (let coll of colls) { coll[y][x] = 0 }
                    light[y][x] = 0
                    if (! ds || ! ds.noNavMap) { 
                        for (let nav of navs) { 
                            nav[y][x] = 1 
                        }
                    }
                }
            }

            if (drawSides[0]) {
                for (let x = floorX1; x < floorX2; x++) {
                    for (let i = 0; i < theme.wallUp.length; i++) {
                        let y = floorY1 - i + 1
                        if (theme.wallUp[i]) {
                            layer[y][x] = theme.wallUp[i]
                        }
                        if (theme.wallUpShadow[i]) {
                            shadow[y][x] = theme.wallUpShadow[i]
                        }
                    }
                    for (let coll of colls) { 
                        coll[floorY1 - 1][x] = 2
                        coll[floorY1 - 2][x] = 2
                    }
                }
            } else {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge23, floorX1, floorY1 - 2)
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge21, floorX2 - 2, floorY1 - 2)
                for (let x = floorX1 + 2; x < floorX2 - 2; x++) {
                    for (let y = floorY1 - 2; y < floorY1; y++) {
                        shadow[y][x] = 0
                    }
                }
            }

            if (drawSides[1]) {
                for (let y = floorY1; y < floorY2; y++) {
                    for (let i = 0; i < theme.wallRight.length; i++) {
                        let x = floorX2 - theme.wallRight.length + i + 1
                        if (theme.wallRight[i]) {
                            if (! layer[y][x]) { 
                                layer[y][x] = theme.wallRight[i]
                            }
                            for (let coll of colls) {
                                coll[y][x] = 2
                                coll[y][x + 1] = 2
                            }
                        }
                        if (theme.wallRightShadow[i]) shadow[y][x] = theme.wallRightShadow[i]
                    }
                }
            } else {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge03, floorX2, floorY1)
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge23, floorX2, floorY2 - 2)
                for (let y = floorY1 + 2; y < floorY2 - 2; y++) {
                    for (let x = floorX2; x < floorX2 + 2; x++) {
                        shadow[y][x] = 0
                    }
                }
            }


            if (drawSides[2]) {
                for (let x = floorX1; x < floorX2; x++) {
                    for (let i = 0; i < theme.wallDown.length; i++) {
                        let y = floorY2 - theme.wallDown.length + i + 1
                        if (theme.wallDown[i]) {
                            layer[y][x] = theme.wallDown[i]
                            for (let coll of colls) {
                                coll[y][x] = 2
                                coll[y + 1][x] = 2
                            }
                        }
                        if (theme.wallDownShadow[i]) {
                            shadow[y][x] = theme.wallDownShadow[i]
                        }
                    }
                }
            } else {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge03, floorX1, floorY2)
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge01, floorX2 - 2, floorY2)
                for (let x = floorX1 + 2; x < floorX2 - 2; x++) {
                    for (let y = floorY2; y < floorY2 + 2; y++) {
                        shadow[y][x] = 0
                    }
                }
            }

            
            if (drawSides[3]) {
                for (let y = floorY1; y < floorY2; y++) {
                    for (let i = 0; i < theme.wallLeft.length; i++) {
                        let x = floorX1 + i - 1
                        if (theme.wallLeft[i]) {
                            if (! layer[y][x]) { 
                                layer[y][x] = theme.wallLeft[i]
                            }
                            for (let coll of colls) {
                                coll[y][x] = 2
                                coll[y][x - 1] = 2
                            }
                        }
                        if (theme.wallLeftShadow[i]) shadow[y][x] = theme.wallLeftShadow[i]
                    }
                }
            } else {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge01, floorX1 - 2, floorY1)
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge21, floorX1 - 2, floorY2 - 2)
                for (let y = floorY1 + 2; y < floorY2 - 2; y++) {
                    for (let x = floorX1 - 2; x < floorX1; x++) {
                        shadow[y][x] = 0
                    }
                }
            }



            // fix shadow corners
            if (drawSides[0] && drawSides[3]) {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowCorner03, floorX1, floorY1)
            }
            if (drawSides[0] && drawSides[1]) {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowCorner01, floorX2 - 2, floorY1)
            }
            if (drawSides[2] && drawSides[3]) {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowCorner23, floorX1, floorY2 - 2)
            }
            if (drawSides[2] && drawSides[1]) {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowCorner21, floorX2 - 2, floorY2 - 2)
            }

            // add light wip
            for (let y = rectY1 - 2; y < rectY2 + 2; y += 6) {
                for (let x = rectX1 - 2; x < rectX2 + 2; x += 6) {
                    light[y][x] = 18
                    // layer[y][x] = 70
                }
            }
        }

        if (ds) {
            let doorX, doorY
            if (ds.pos) {
                ({ x: doorX, y: doorY } = ds.pos)
                ts.width += 16
            } else {
                ({ x: doorX, y: doorY } = this.getRoomSidePos(ds.side, floorX1, floorY1, floorX2, floorY2, ds.prefX, ds.prefY))
            }
            if (ds.side % 2 == 0) { 
                doorX -= 16
            } else { 
                doorY -= 16
            }
            // if (ds.side == 3) {
            //     doorX -= 8
            // }
            if (ds.side == 2) {
                doorY -= 16
            }
            if (ds.side == 1) {
                doorX -= 16
            }
            map.entities.push(ig.rouge.entitySpawn.door(doorX, doorY, ds))
        }
        if (ts) {
            let tunnelX, tunnelY
            if (ts.pos) {
                ({ x: tunnelX, y: tunnelY } = ts.pos)
            } else {
                ({ x: tunnelX, y: tunnelY } = this.getRoomSidePos(ts.side, floorX1, floorY1, floorX2, floorY2, ts.prefX, ts.prefY))
            }
            if (ts.side % 2 == 0) {
                [ts.width, ts.height] = [ts.height, ts.width]
                tunnelX -= ts.width/2
                tunnelY -= 16
            } else {
                tunnelY -= ts.height/2
                tunnelX -= 16
            }
            if (ts.side == 3) {
                tunnelX -= ts.width
                tunnelX += 32
            }
            if (ts.side == 0) {
                tunnelY -= ts.height
                tunnelY += 32
            }
            ts.queue.push({
                rect: {
                    x: tunnelX,
                    y: tunnelY,
                    width: ts.width,
                    height: ts.height,
                }, 
                theme,
                addSpace: 0,
                ts,
            })
        } 

        return { 
            x: floorX1*tilesize,
            y: floorY1*tilesize,
            x2: floorX2*tilesize,
            y2: floorY2*tilesize,
            width: (floorX2 - floorX1)*tilesize,
            height: (floorY2 - floorY1)*tilesize,
        }
    }

    executeTunnelQueue(map, queue) {
        let barrierMap = {}
        for (let tunnel of queue) {
            let ts = tunnel.ts
            let rect = tunnel.rect
            rect = this.rectRoom(map, rect, tunnel.theme, tunnel.addSpace, ts.drawSides, ts.door, null)
            
            rect.x2 -= 8
            rect.y2 -= 8
            let width, height
            let entryX, entryY
            let exitX, exitY
            if (ts.side % 2 == 0) {
                width = rect.width
                height = 8
                entryX = rect.x
                exitX = rect.x
            } else {
                width = 8
                height = rect.height
                entryY = rect.y
                exitY = rect.y
            }
            switch (ts.side) {
            case 0: entryY = rect.y2; exitY = rect.y; break
            case 1: entryX = rect.x; exitX = rect.x2; break
            case 2: entryY = rect.y; exitY = rect.y2; break
            case 3: entryX = rect.x2; exitX = rect.x; break
            }
            let entryRect = { x: entryX, y: entryY, width, height }
            let exitRect = { x: exitX, y: exitY, width, height }
            barrierMap[ts.name] = {
                rect,
                entarenceBarrier: ig.rouge.entitySpawn.barrier(entryRect, ts.entarenceCond, ts.side),
                entarenceWall:       ig.rouge.entitySpawn.wall(entryRect, ts.entarenceCond, ts.side),
                exitBarrier:      ig.rouge.entitySpawn.barrier(exitRect, ts.exitCond, ts.side),
                exitWall:            ig.rouge.entitySpawn.wall(exitRect, ts.exitCond, ts.side),
            }
        }
        return barrierMap
    }
}
