import { RoomPlaceVars } from '../room/map-builder'
import { RoomTheme } from '../room/themes'
import { assert } from './misc'
import { Dir, MapPoint } from './pos'

const tilesize: number = 16

export enum Coll {
    None = 0,
    Hole = 1,
    Wall = 2,
    Floor = 3,
}
export type Tileset = 'media/map/collisiontiles-16x16.png' | 'media/map/pathmap-tiles.png' | 'media/map/lightmap-tiles.png'
                    | 'media/map/dungeon-shadow.png' | 'media/map/cold-dng.png' | 'media/map/rhombus-dungeon2.png'

export class MapLayer implements sc.MapModel.MapLayer {
    id: number
    visible: number = 1
    repeat: boolean = false
    distance: number = 1
    yDistance: number = 0
    tilesize: number = tilesize
    moveSpeed: Vec2 = { x: 0, y: 0 }
    data: number[][]
    lighter: boolean = false

    constructor(public width: number, public height: number, public name: string,
        public type: sc.MapModel.MapLayerType, public tilesetName: string, 
        public level: sc.MapModel.MapLayerLevelType, data?: number[][]) {

        this.data = data ?? []
        this.id = 0
    }

    fill(tile: number) {
        for (let y = 0; y < this.height; y++) {
            this.data[y] = []
            for (let x = 0; x < this.width; x++) {
                this.data[y][x] = tile
            }
        }
    }

    toJSON() { return this as sc.MapModel.MapLayer }

    static convertArray(arr: sc.MapModel.MapLayer[]): MapLayer[] {
        return arr.map((layer) => new MapLayer(layer.width, layer.height, layer.name, layer.type, layer.tilesetName, layer.level, layer.data))
    }
}

export class CCMap implements sc.MapModel.Map {
    screen: Vec2 = { x: 0, y: 0 }

    constructor(public name: string,
        public levels: { height: number }[],
        public mapWidth: number,
        public mapHeight: number,
        public masterLevel: number,
        public attributes: sc.MapModel.MapAttributes,
        public entities: sc.MapModel.MapEntity[],
        public layer: MapLayer[]) { }

    toJSON() { return this as sc.MapModel.Map }

    static getEmpty(size: MapPoint, levelCount: number, theme: RoomTheme, mapName: string, areaName: string): RoomPlaceVars  {
        const { x: width, y: height } = size
        const layers: MapLayer[] = []
        const levels: { height: number }[] = []

        let background: number[][] | undefined, shadow: number[][] | undefined, colls: number[][][] = [], navs: number[][][] = []

        for (let level = 0; level < levelCount; level++) {
            levels.push({ height: level * tilesize*2 })

            const backgroundLayer = new MapLayer(width, height, 'NEW_BACKGROUND', 'Background', theme.config.tileset, level)
            backgroundLayer.fill(level == 0 ? theme.config.blackTile : 0)
            if (level == 0) { background = backgroundLayer.data }
            layers.push(backgroundLayer)

            if (level == 0 && theme.config.addShadows) {
                const shadowLayer = new MapLayer(width, height, 'NEW_SHADOW', 'Background', theme.config.shadowTileset!, level)
                shadowLayer.fill(0)
                shadow = shadowLayer.data
                layers.push(shadowLayer)
            }
            const collisionLayer = new MapLayer(width, height, 'NEW_COLLISION', 'Collision', 'media/map/collisiontiles-16x16.png', level)
            collisionLayer.fill(Coll.Wall)
            colls.push(collisionLayer.data)
            layers.push(collisionLayer)

            const navigationLayer = new MapLayer(width, height, 'NEW_NAVIGATION', 'Navigation', 'media/map/pathmap-tiles.png', level)
            navigationLayer.fill(0)
            navs.push(navigationLayer.data)
            layers.push(navigationLayer)
        }


        const lightLayer = new MapLayer(width, height, 'NEW_LIGHT', 'Light', 'media/map/lightmap-tiles.png', 'last')
        lightLayer.fill(0)
        const light: number[][] = lightLayer.data
        layers.push(lightLayer)

        assert(background)

        const map: CCMap = new CCMap(mapName, levels, width, height, 0, theme.getMapAttributes(areaName), [], layers)
        return {
            map,
            background, shadow, light, colls, navs,
            entities: map.entities,
            theme, tc: theme.config,
            masterLevel: 0
        }
    }
}

export class Stamp {
    constructor(
        public area: string,
        public type: keyof typeof sc.MAP_STAMPS,
        public pos: Vec2,
        public level: number,
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
                case Dir.NORTH: type = 'ARROW_UP'; break
                case Dir.EAST: type = 'ARROW_RIGHT'; break
                case Dir.SOUTH: type = 'ARROW_DOWN'; break
                case Dir.WEST: type = 'ARROW_LEFT'; break
            }
        }
        return new Stamp(area, type, { x: pos.x/8, y: pos.y/8 }, level)
    }
}


const mapNameToMapDisplayName: Map<string, string> = new Map<string, string>()

export async function getMapDisplayName(map: sc.MapModel.Map): Promise<string> {
    return new Promise<string>(async (resolve) => {
        const mapName = map.name.split('.').join('/')
        if (mapNameToMapDisplayName.has(mapName)) {
            resolve(mapNameToMapDisplayName.get(mapName) ?? 'maploadingerror')
            return
        }
        const areaName: string = map.attributes.area
        const area: sc.AreaLoadable = await loadArea(areaName)

        for (const floor of area.data.floors) {
            for (const map of floor.maps) {
                const displayName = map.name.en_US!
                mapNameToMapDisplayName.set(map.path.split('.').join('/'), displayName)
            }
        }
        resolve(getMapDisplayName(map))
    })
}

export async function loadArea(areaName: string): Promise<sc.AreaLoadable> {
    return new Promise((resolve) => {
        const area: sc.AreaLoadable = new sc.AreaLoadable(areaName)
        area.load(() => {
            resolve(area)
        })
    })
}
