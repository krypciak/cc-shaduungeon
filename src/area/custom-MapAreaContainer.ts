import { assert } from '../util/misc'

const tilesize = 8

export function overrideMapAreaContainer() {
    sc.MapAreaContainer.inject({
        findMap(a: any, b: any, c: any, d: any) {
            if (a || b || c || d) {}
            return true
        }
    })

    sc.MapFloor.inject({
        init(floor: sc.AreaLoadable.Floor, callback: any) {
            this.type = floor.type = floor.type ?? 'grid'
            if (floor.type == 'roomList') {
                if (floor.tiles.length == 0) {
                    floor.tiles = [[]]
                }
                let i = 0
                for (const room of floor.rooms!) {
                    room.index = i
                    i++
                }
            }
            this.parent(floor, callback)
            if (floor.type == 'roomList') {
                assert(floor.size)
                this.setSize(floor.size.x * tilesize, floor.size.y * tilesize)
            }
        }
    })

    sc.AreaLoadable.inject({
        _createRooms() {
            if (this.data!.type == 'roomList') {
                for (const floor of this.data!.floors) {
                    const bounds: sc.AreaRoomBounds[] = []
                    if (floor.type != 'roomList') { throw new Error('all area maps of type "roomList" must also have that type') }
                    for (const map of (floor.maps as sc.AreaLoadable.MapRoomList[])) {
                        bounds.push(new sc.AreaRoomBounds(map, map.id, map.min.x, map.min.y, [], map.max))
                    }
                    floor.rooms = bounds 
                }
            } else {
                return this.parent()
            }
        }
    })

    sc.AreaRoomBounds.inject({
        init(map: sc.AreaLoadable.Map, id: number, minX: number, minY: number, tiles: number[][], max?: Vec2) {
            if (max) {
                this.name = map.path || 'default_empty'
                this.text = map.name ? ig.LangLabel.getText(map.name) || '???' : '???'
                this.id = id
                this.offset.x = map.offset ? map.offset.x : 0
                this.offset.y = map.offset ? map.offset.y : 0
                this.min.x = minX
                this.min.y = minY
                this.max = max
                // these values dont do anything i think
                this.zMin = map.minZ!
                this.zMax = map.maxZ!
            } else {
                this.parent(map, id, minX, minY, tiles)
            }
        }
    })

    sc.MapRoom.inject({
        init(room, floor, id) {
            this.parent(room, floor, id)
        },
        preRender() {
            if (this.floor.type == 'roomList') {
                if (! this.prerendered && this.unlocked) {
                    const map = this.floor.maps[this.room.index!] as sc.AreaLoadable.MapRoomList
                    assert(map.rects)

                    const emptyTile = new ig.SimpleColor('#5e717f')
                    // const freeRule = { src: { x: 281, y: 411 }, }
                    const step = 8
                    this.buffer = ig.imageAtlas.getFragment(
                        this.hook.size.x,
                        this.hook.size.y,
                        () => {
                            for (const rect1 of map.rects) {
                                const rect = { x: rect1.x * tilesize, y: rect1.y * tilesize,
                                    width: rect1.width * tilesize, height: rect1.height * tilesize }
                                emptyTile.draw(rect.x, rect.y, rect.width, rect.height)
                                // const x2 = rect.x + rect.width
                                // const y2 = rect.y + rect.height
                                // for (let y = rect.y; y < y2; y += step) {
                                //     const sy = Math.min(tilesize, y2 - y)
                                //     for (let x = rect.x; x < x2; x += step) {
                                //         const sx = Math.min(tilesize, x2 - x)
                                //         this.gfx.drawCheck(
                                //             Math.floor(x),
                                //             Math.floor(y),
                                //             freeRule.src.x,
                                //             freeRule.src.y,
                                //             sx,
                                //             sy,
                                //         )
                                //     }
                                // }
                            }
                        })
                    this.prerendered = true
                }
            } else {
                this.parent()
            }
        }
    })
}
