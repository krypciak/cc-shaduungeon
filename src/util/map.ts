import { Dir } from './pos.js'

const tilesize: number = 16

//export enum CollisionTile {
//    Empty,
//    Floor, // green
//    Wall,  // red
//    Hole,  // blue
//}
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
