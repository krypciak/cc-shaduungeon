const tilesize = 16

export class RoomComponents {
    constructor() {
        this.themes = {
            rhombusDng: {
                bgm: 'puzzle',
                tileset: 'media/map/rhombus-dungeon2.png',
                shadowTileset: 'media/map/dungeon-shadow.png',
                mapStyle: 'rhombus-puzzle',
                mapSounds: '',
                weather: 'RHOMBUS_DUNGEON',
                floor: 34,
                black: 6,
                addShadows: true,
                addLight: true,
                floorLight: 18,
                lightStep: 6,
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
            },
            coldDng: {
                bgm: 'coldDungeon',
                tileset: 'media/map/cold-dng.png',
                mapStyle: 'cold-dng',
                mapSounds: 'COLD_DUNGEON',
                weather: 'COLD_DUNGEON',
                floor: 156,
                black: 135,
                addShadows: false,
                addLight: true,
                floorLight: 3,
                lightStep: 6,
                wallUp: [0, 0, 366, 334, 302, 334, 302, 275, 243],
                wallRight: [0, 0, 135],
                wallDown: [0, 0, 147],
                wallLeft: [135, 0, 0],
            }
        }
    }

    getThemeFromSel(sel) {
        const map = sel.map
        if (map.startsWith('rhombus-dng')) {
            return this.themes.rhombusDng
        } else if (map.startsWith('cold-dng')) {
            return this.themes.coldDng
        } else {
            return this.themes.rhombusDng
        }
    }
    
    getEmptyMap(width, height, levels, theme, areaName) {
        const emptyData = ig.blitzkrieg.util.emptyArray2d(width, height)
        const blackData = ig.copy(emptyData)
        ig.blitzkrieg.util.fillArray2d(blackData, theme.black, 0, 0, blackData[0].length, blackData.length)
        const redCollData = ig.copy(emptyData)
        ig.blitzkrieg.util.fillArray2d(redCollData, 2, 0, 0, blackData[0].length, blackData.length)

        const layerTemplate = {
            width,
            height,
            visible: 1,
            repeat: false,
            distance: 1,
            yDistance: 0,
            tilesize,
            moveSpeed: { x: 0, y: 0 },
        }
        const layers = []
        const levelsArr = []

        for (let i = 0; i < levels; i++) {
            levelsArr[i] = { height: i*32 }
            const background = ig.copy(layerTemplate)
            background.type = 'Background'
            background.name = 'NEW_BACKGROUND'
            background.tilesetName = theme.tileset
            background.level = i
            background.data = i == 0 ? ig.copy(blackData) : ig.copy(emptyData)
            layers.push(background)

            if (i == 0 && theme.addShadows) {
                const shadow = ig.copy(layerTemplate)
                shadow.type = 'Background'
                shadow.name = 'NEW_SHADOW'
                shadow.tilesetName = theme.shadowTileset
                shadow.level = i
                shadow.data = ig.copy(emptyData)
                layers.push(shadow)
            }

            const collision = ig.copy(layerTemplate)
            collision.type = 'Collision'
            collision.name = 'NEW_COLLISION'
            collision.tilesetName = 'media/map/collisiontiles-16x16.png',
            collision.level = i
            collision.data = ig.copy(redCollData)
            layers.push(collision)

            const navigation = ig.copy(layerTemplate)
            navigation.type = 'Navigation'
            navigation.name = 'NEW_NAV'
            navigation.tilesetName = 'media/map/pathmap-tiles.png',
            navigation.level = i
            navigation.data = ig.copy(emptyData)
            layers.push(navigation)
        }
        const light = ig.copy(layerTemplate)
        light.type = 'Light'
        light.name = 'NEW_LIGHT'
        light.tilesetName = 'media/map/lightmap-tiles.png'
        light.level = 'last'
        light.data = ig.copy(emptyData)
        layers.push(light)

        const map = {
            name: 'empty',
            levels: levelsArr,
            mapWidth: width,
            mapHeight: height,
            masterLevel: 0,
            attributes: { 
                saveMode: 'ENABLED', 
                bgm: theme.bgm,
                cameraInBounds: false,
                'map-sounds': theme.mapSounds,
                mapStyle: theme.mapStyle,
                weather: theme.weather,
                area: areaName
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

    placeWall(layer, shadow, colls, theme, side, x1, y1) {
        switch (side) {
        case 0: {
            for (let i = 0; i < theme.wallUp.length; i++) {
                const y = y1 - i + 1
                if (theme.wallUp[i]) {
                    layer[y][x1] = theme.wallUp[i]
                }
                if (theme.addShadows && theme.wallUpShadow[i]) {
                    shadow[y][x1] = theme.wallUpShadow[i]
                }
            }
            for (let i = 0; i < colls.length; i++) {
                const coll = colls[i]
                if (i > 0) { coll[y1][x1] = 1 }
                coll[y1 - 1][x1] = 2
                coll[y1 - 2][x1] = 2
            }
            break
        }
        case 1: {
            for (let i = 0; i < theme.wallRight.length; i++) {
                const x = x1 - theme.wallRight.length + i + 1
                if (theme.wallRight[i]) {
                    if (! layer[y1][x]) { 
                        layer[y1][x] = theme.wallRight[i]
                    }

                    for (const coll of colls) {
                        coll[y1][x] = 2
                        coll[y1][x + 1] = 2
                    }
                }
                if (theme.addShadows && theme.wallRightShadow[i]) shadow[y1][x] = theme.wallRightShadow[i]
            }
            break
        }
        case 2: {
            for (let i = 0; i < theme.wallDown.length; i++) {
                const y = y1 - theme.wallDown.length + i + 1
                if (theme.wallDown[i]) {
                    layer[y][x1] = theme.wallDown[i]
                    for (let h = 0; h < colls.length; h++) {
                        const coll = colls[h]
                        if (h > 0) { 
                            coll[y - 1][x1] = 1
                            coll[y - 2][x1] = 1
                        }
                        coll[y][x1] = 2
                        coll[y + 1][x1] = 2
                    }
                }
                if (theme.addShadows && theme.wallDownShadow[i]) {
                    shadow[y][x1] = theme.wallDownShadow[i]
                }
            }
            break
        }
        case 3: {
            for (let i = 0; i < theme.wallLeft.length; i++) {
                const x = x1 + i - 1
                if (theme.wallLeft[i]) {
                    if (! layer[y1][x]) { 
                        layer[y1][x] = theme.wallLeft[i]
                    }
                    for (const coll of colls) {
                        coll[y1][x] = 2
                        coll[y1][x - 1] = 2
                    }
                }
                if (theme.addShadows && theme.wallLeftShadow[i]) {
                    shadow[y1][x] = theme.wallLeftShadow[i]
                }
            }
            break
        }
        }
    }

    rectRoom(map, rect, theme, addSpace, drawSides, ds, ts) {
        const rectX1 = Math.floor(rect.x / tilesize)
        const rectY1 = Math.floor(rect.y / tilesize)
        const rectX2 = rectX1 + Math.floor(rect.width / tilesize)
        const rectY2 = rectY1 + Math.floor(rect.height / tilesize)

        let addWalls = true
        if (addSpace == -1) {
            addWalls = false
            addSpace = 0
        }
        const floorX1 = rectX1 - Math.floor(addSpace / tilesize)
        const floorY1 = rectY1 - Math.floor(addSpace / tilesize)
        const floorX2 = rectX2 + Math.floor(addSpace / tilesize) 
        const floorY2 = rectY2 + Math.floor(addSpace / tilesize)

        if (addWalls) {
            let layer, shadow, colls = [], light, navs = []
            // find layers
            for (const l of map.layer) {
                if (! layer && l.type == 'Background' && l.name == 'NEW_BACKGROUND' && l.level == map.masterLevel) { layer = l.data }
                if (theme.addShadows && ! shadow && l.type == 'Background' && l.name == 'NEW_SHADOW' && l.level == map.masterLevel) { shadow = l.data }
                if (l.type == 'Collision' && l.name == 'NEW_COLLISION') { colls.push(l.data) }
                if (l.type == 'Navigation' && l.name == 'NEW_NAV') { navs.push(l.data) }
                if (! light && l.type == 'Light' && l.name == 'NEW_LIGHT') { light = l.data }
            }
            // draw floor
            for (let y = floorY1; y < floorY2; y++) {
                for (let x = floorX1; x < floorX2; x++) {
                    layer[y][x] = theme.floor
                    if (theme.addShadows) { shadow[y][x] = 0 }
                    for (const coll of colls) { coll[y][x] = 0 }
                    light[y][x] = 0
                    if (! ds || ! ds.noNavMap) { 
                        for (const nav of navs) { 
                            nav[y][x] = 1 
                        }
                    }
                }
            }

            if (drawSides[0]) {
                for (let x = floorX1; x < floorX2; x++) {
                    this.placeWall(layer, shadow, colls, theme, 0, x, floorY1)
                }
            } else if (theme.addShadows) {
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
                    this.placeWall(layer, shadow, colls, theme, 1, floorX2, y)
                }
            } else if (theme.addShadows) {
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
                    this.placeWall(layer, shadow, colls, theme, 2, x, floorY2)
                }
            } else if (theme.addShadows) {
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
                    this.placeWall(layer, shadow, colls, theme, 3, floorX1, y)
                }
            } else if (theme.addShadows) {
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge01, floorX1 - 2, floorY1)
                ig.blitzkrieg.util.parseArrayAt2d(shadow, theme.shadowEdge21, floorX1 - 2, floorY2 - 2)
                for (let y = floorY1 + 2; y < floorY2 - 2; y++) {
                    for (let x = floorX1 - 2; x < floorX1; x++) {
                        shadow[y][x] = 0
                    }
                }
            }


            if (theme.addShadows) {
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
            }
    

            if (theme.addLight) {
                const distFromWall = 5
                const lx1 = floorX1 + distFromWall - 1
                const ly1 = floorY1 + distFromWall - 1
                const lx2 = floorX2 - distFromWall
                const ly2 = floorY2 - distFromWall

                const mx = Math.floor(lx1 + (lx2 - lx1)/2)
                const my = Math.floor(ly1 + (ly2 - ly1)/2)
                light[my][mx] = theme.floorLight

                for (let x = lx1; x <= mx; x += theme.lightStep) {
                    for (let y = ly1; y <= my; y += theme.lightStep) { light[y][x] = theme.floorLight }
                    for (let y = ly2; y >= my; y -= theme.lightStep) { light[y][x] = theme.floorLight }
                    light[my][x] = theme.floorLight
                }
                for (let x = lx2; x >= mx; x -= theme.lightStep) {
                    for (let y = ly1; y <= my; y += theme.lightStep) { light[y][x] = theme.floorLight }
                    for (let y = ly2; y >= my; y -= theme.lightStep) { light[y][x] = theme.floorLight }
                    light[my][x] = theme.floorLight
                }

                for (let y = ly1; y <= ly2; y += theme.lightStep) { light[y][mx] = theme.floorLight }
                for (let y = ly2; y >= my; y -= theme.lightStep) { light[y][mx] = theme.floorLight }
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
            map.entities.push(ig.rouge.entitySpawn.door(doorX, doorY, map.masterLevel, ds))
        }
        if (ts) {
            const rect = { x: 0, y: 0, width: ts.width, height: ts.height }
            if (ts.pos) {
                ({ x: rect.x, y: rect.y } = ts.pos)
            } else {
                ({ x: rect.x, y: rect.y } = this.getRoomSidePos(ts.side, floorX1, floorY1, floorX2, floorY2, ts.prefX, ts.prefY))
            }
            if (ts.side % 2 == 0) {
                [rect.width, rect.height] = [rect.height, rect.width]
            }
            switch (ts.side) {
            case 0: 
                rect.x += -rect.width/2 + 32
                rect.y += -rect.height - 16; break
            case 1:
                rect.x += -16
                rect.y += -rect.height/2; break
            case 2:
                rect.x += -rect.width/2
                rect.y += -16; break
            case 3:
                rect.x += -rect.width + 16
                rect.y += -rect.height/2; break
            }
            const realRect = ig.copy(rect)
            ts.queue.push({
                rect,
                realRect,
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

    addWallsInEmptySpace(map, theme, sel) {
        let mcoll, layer, shadow, colls = []
        for (const l of map.layer) {
            if (! layer && l.type == 'Background' && l.name == 'NEW_BACKGROUND' && l.level == map.masterLevel) { layer = l.data }
            if (theme.addShadows && ! shadow && l.type == 'Background' && l.name == 'NEW_SHADOW' && l.level == map.masterLevel) { shadow = l.data }
            if (l.type == 'Collision') { 
                colls.push(l.data) 
                if (! mcoll && l.level == map.masterLevel) {
                    mcoll = l.data
                }
            }
        }
        const mcollCopy = ig.copy(mcoll)
        const additional = 0
        for (const bb of sel.bb) {
            const x1 = Math.floor(bb.x / tilesize), y1 = Math.floor(bb.y / tilesize)
            const x2 = x1 + Math.floor(bb.width / tilesize) - 1, y2 = y1 + Math.floor(bb.height / tilesize) - 1

            for (let y = y1; y < y2 + 1; y++) {
                if (mcollCopy[y][x1] == 0 || mcollCopy[y][x1] == 3) {
                    for (let y3 = y - additional; y3 < y + additional + 1; y3++) {
                        if (! ig.blitzkrieg.puzzleSelections.isSelInPos(sel, { x: x1*tilesize - 1, y: y3*tilesize })) {
                            this.placeWall(layer, shadow, colls, theme, 3, x1, y3)
                        }
                    }
                }
                if (mcollCopy[y][x2] == 0 || mcollCopy[y][x2] == 3) {
                    for (let y3 = y - additional; y3 < y + additional + 1; y3++) {
                        if (! ig.blitzkrieg.puzzleSelections.isSelInPos(sel, { x: (x2 + 1)*tilesize + 1, y: y3*tilesize })) {
                            this.placeWall(layer, shadow, colls, theme, 1, x2 + 1, y3)
                        }
                    }
                }
            }

            for (let x = x1; x < x2 + 1; x++) {
                if (mcollCopy[y1][x] == 0 || mcollCopy[y1][x] == 3) {
                    for (let x3 = x - additional; x3 < x + additional + 1; x3++) {
                        if (! ig.blitzkrieg.puzzleSelections.isSelInPos(sel, { x: x3*tilesize, y: y1*tilesize - 1 })) {
                            this.placeWall(layer, shadow, colls, theme, 0, x3, y1)
                        }
                    }
                }
                if (mcollCopy[y2][x] == 0 || mcollCopy[y2][x] == 3) {
                    for (let x3 = x - additional; x3 < x + additional + 1; x3++) {
                        if (! ig.blitzkrieg.puzzleSelections.isSelInPos(sel, { x: x3*tilesize, y: (y2+1)*tilesize + 1 })) {
                            this.placeWall(layer, shadow, colls, theme, 2, x3, y2 + 1)
                        }
                    }
                }
            }
        }
    }

    executeTunnelQueue(map, queue) {
        const barrierMap = {}
        for (const tunnel of queue) {
            const ts = tunnel.ts
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
            const entryRect = { x: entryX, y: entryY, width, height }
            const exitRect = { x: exitX, y: exitY, width, height }
            barrierMap[ts.name] = {
                rect,
                realRect: tunnel.realRect,
                entarenceBarrier: ig.rouge.entitySpawn.barrier(entryRect, map.masterLevel, ts.entarenceCond, ts.side),
                entarenceWall:       ig.rouge.entitySpawn.wall(entryRect, map.masterLevel, ts.entarenceCond, ts.side),
                exitBarrier:      ig.rouge.entitySpawn.barrier(exitRect, map.masterLevel,ts.exitCond, ts.side),
                exitWall:            ig.rouge.entitySpawn.wall(exitRect, map.masterLevel,ts.exitCond, ts.side),
            }
        }
        return barrierMap
    }

    async trimMap(map, theme) {
        const origW = map.mapWidth
        const origH = map.mapHeight
        let nx
        for (nx = 0; nx < origW; nx++) {
            let foundTile = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let y = 0; y < origH; y++) {
                    const val = layer.data[y][nx]
                    if (val != 0 && val != theme.black) {
                        foundTile = true
                        break
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { break }
        }
        nx--

        let ny
        for (ny = 0; ny < origH; ny++) {
            let foundTile = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let x = 0; x < origW; x++) {
                    const val = layer.data[ny][x]
                    if (val != 0 && val != theme.black) {
                        foundTile = true
                        break
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { break }
        }
        ny--
        // const nx = 0, ny = 0

        let nw
        for (nw = origW - 1; nw >= 0; nw--) {
            let foundTile = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let y = 0; y < origH; y++) {
                    const val = layer.data[y][nw]
                    if (val != 0 && val != theme.black) {
                        foundTile = true
                        break
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { nw += 2; break }
        }

        let nh
        for (nh = origH - 1; nh >= 0; nh--) {
            let foundTile = false
            for (const layer of map.layer) {
                if (layer.type != 'Background') { continue }
                for (let x = 0; x < origW; x++) {
                    const val = layer.data[nh][x]
                    if (val != 0 && val != theme.black) {
                        foundTile = true
                        break 
                    }
                }
                if (foundTile) { break }
            }
            if (foundTile) { nh += 2; break }
        }
        const newW = nw - nx + 1
        const newH = nh - ny + 1

        const emptyMap = this.getEmptyMap(newW, newH, 0, theme, map.attributes.area)
        const newSel = ig.blitzkrieg.util.getSelFromRect({ x: nx*tilesize, y: ny*tilesize, width: newW*tilesize, height: newH*tilesize }, map.name, 0)

        map = await ig.blitzkrieg.selectionCopyManager
            .copySelToMap(emptyMap, map, newSel, 0, 0, map.name, {
                makePuzzlesUnique: false,
            })

        return { xOffset: nx*tilesize, yOffset: ny*tilesize, map }
    }
}
