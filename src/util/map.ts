import { Dir, MapPoint } from 'cc-map-util/pos'
import { MapLayer, Coll } from 'cc-map-util/map'
import { assert } from 'cc-map-util/util'
import { RoomTheme } from '@root/room/themes'
import { AreaInfo } from '@root/area/area-builder'
import { RoomPlaceVars } from '@root/room/map-builder'

const tilesize = 16

export class CCMap implements sc.MapModel.Map {
    screen: Vec2 = { x: 0, y: 0 }

    constructor(
        public name: string,
        public levels: { height: number }[],
        public mapWidth: number,
        public mapHeight: number,
        public masterLevel: number,
        public attributes: sc.MapModel.MapAttributes,
        public entities: sc.MapModel.MapEntity[],
        public layer: MapLayer[]
    ) {}

    toJSON() {
        return this as sc.MapModel.Map
    }

    static getEmpty(
        size: MapPoint,
        levelCount: number,
        theme: RoomTheme,
        mapName: string,
        areaInfo: AreaInfo
    ): RoomPlaceVars {
        const { x: width, y: height } = size
        const layers: MapLayer[] = []
        const levels: { height: number }[] = []

        let background: number[][] | undefined,
            shadow: number[][] | undefined,
            colls: number[][][] = [],
            navs: number[][][] = []

        for (let level = 0; level < levelCount; level++) {
            levels.push({ height: level * tilesize * 2 })

            const backgroundLayer = new MapLayer(
                width,
                height,
                'NEW_BACKGROUND',
                'Background',
                theme.config.tileset,
                level,
                -10
            )
            backgroundLayer.fill(level == 0 ? theme.config.blackTile : 0)
            if (level == 0) {
                background = backgroundLayer.data
            }
            layers.push(backgroundLayer)

            if (level == 0 && theme.config.addShadows) {
                const shadowLayer = new MapLayer(
                    width,
                    height,
                    'NEW_SHADOW',
                    'Background',
                    theme.config.shadowTileset!,
                    level,
                    -10
                )
                shadowLayer.fill(0)
                shadow = shadowLayer.data
                layers.push(shadowLayer)
            }
            const collisionLayer = new MapLayer(
                width,
                height,
                'NEW_COLLISION',
                'Collision',
                'media/map/collisiontiles-16x16.png',
                level,
                -10
            )
            collisionLayer.fill(Coll.Wall)
            colls.push(collisionLayer.data)
            layers.push(collisionLayer)

            const navigationLayer = new MapLayer(
                width,
                height,
                'NEW_NAVIGATION',
                'Navigation',
                'media/map/pathmap-tiles.png',
                level,
                -10
            )
            navigationLayer.fill(0)
            navs.push(navigationLayer.data)
            layers.push(navigationLayer)
        }

        const lightLayer = new MapLayer(
            width,
            height,
            'NEW_LIGHT',
            'Light',
            'media/map/lightmap-tiles.png',
            'last',
            -10
        )
        lightLayer.fill(0)
        const light: number[][] = lightLayer.data
        layers.push(lightLayer)

        assert(background)

        const map: CCMap = new CCMap(
            mapName,
            levels,
            width,
            height,
            0,
            theme.getMapAttributes(areaInfo.name),
            [],
            layers
        )
        return {
            map,
            background,
            shadow,
            light,
            colls,
            navs,
            entities: map.entities,
            theme,
            tc: theme.config,
            masterLevel: 0,
            areaInfo,
        }
    }
}

export class Stamp {
    constructor(
        public area: string,
        public type: keyof typeof sc.MAP_STAMPS,
        public pos: Vec2,
        public level: number
    ) {}

    addToMenu() {
        sc.menu.addMapStamp(this.area, this.type, this.pos.x, this.pos.y, this.level)
    }

    static addStampsToMenu(stamps: Stamp[]) {
        for (const stamp of stamps) {
            stamp.addToMenu()
        }
    }

    static new(area: string, pos: Vec2, level: number, type: Dir | keyof typeof sc.MAP_STAMPS): Stamp {
        if (typeof type === 'number') {
            switch (type) {
                case Dir.NORTH:
                    type = 'ARROW_UP'
                    break
                case Dir.EAST:
                    type = 'ARROW_RIGHT'
                    break
                case Dir.SOUTH:
                    type = 'ARROW_DOWN'
                    break
                case Dir.WEST:
                    type = 'ARROW_LEFT'
                    break
            }
        }
        return new Stamp(area, type, { x: pos.x / 8, y: pos.y / 8 }, level)
    }
}
