import { assert } from "../util/misc"

export function overrideMapAreaContainer() {
    sc.MapAreaContainer.inject({
        findMap(a: any, b: any, c: any, d: any) {
            return true
        }
    })

    sc.MapFloor.inject({
        init(floor: sc.AreaLoadable.Floor, callback: any) {
            floor.type = floor.type ?? 'grid'
            if (this.type == 'roomList') {
                assert(floor.size)
                this.callback = callback || null
                this.floor = floor
                this.name = floor.name ? ig.LangLabel.getText(floor.name) : ""
                this.rooms = this.floor.rooms!
                this.setPos(0, 0)
                this.setSize(floor.size.x * 8, floor.size.y * 8)
                this.doStateTransition("HIDDEN", true)
            } else {
                this.parent(floor, callback)
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
                this.parent()
            }
        }
    })

    sc.AreaRoomBounds.inject({
        init(map: sc.AreaLoadable.Map, id: number, minX: number, minY: number, tiles: number[][], max?: Vec2) {
            if (max) {
                this.name = map.path || "default_empty"
                this.text = map.name ? ig.LangLabel.getText(map.name) || "???" : "???"
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
}
