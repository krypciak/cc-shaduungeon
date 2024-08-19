import { Rect, Dir } from '../util/geometry'
import { assert } from '../util/util'

export {}

const tilesize = 8
interface AreaRendererColorScheme {
    empty: ig.SimpleColor
    border: ig.SimpleColor
    shadow: ig.SimpleColor
}

const addPxSpace: number = 0
sc.MapAreaContainer.inject({
    findMap(mx: number, my: number, gamepad: boolean, wait?: number): boolean | undefined {
        if (sc.menu.mapMapFocus) return
        const area = sc.map.getCurrentArea()
        if (!area.shaduungeonCustom) return this.parent(mx, my, gamepad, wait)

        let pos: Vec2
        if (gamepad) {
            pos = Vec2.create(this.area.hook.pos)
        } else {
            pos = Vec2.createC(
                mx - sc.menu.mapCamera.x - this.area.hook.pos.x + 1,
                my - sc.menu.mapCamera.y - this.area.hook.pos.y + 1
            )
        }
        Vec2.subC(pos, addPxSpace)

        if (this.area.hook.children.length == 0) return

        const mapGuis = this.area.hook.children[sc.map.getCurrentFloorIndex()].children as GuiHookMapRoomList[]
        for (const hook of mapGuis) {
            if (!hook.gui.room || !hook.gui.unlocked) continue

            if (gamepad) {
                this.mapNameGui.setPos(sc.menu.mapCursor.x + 5, sc.menu.mapCursor.y - this.mapNameGui.hook.size.y - 4)
            } else {
                this.mapNameGui.setPos(
                    mx - sc.menu.mapCamera.x,
                    my - sc.menu.mapCamera.y - this.mapNameGui.hook.size.y - 1
                )
            }
            const map = hook.gui.floor.maps[hook.gui.room.index!] as sc.AreaLoadable.SDCustom.Map
            for (const r of map.rects) {
                const rect = (r.areaRect ??= {
                    x: (r.x + map.min.x) * tilesize,
                    y: (r.y + map.min.y) * tilesize,
                    width: r.width * tilesize,
                    height: r.height * tilesize,
                })
                if (
                    pos.x >= rect.x &&
                    pos.x <= rect.x + rect.width &&
                    pos.y >= rect.y &&
                    pos.y <= rect.y + rect.height
                ) {
                    if (this.hoverRoom != hook.gui.room) {
                        this.hoverRoom = hook.gui.room
                        this.mapNameGui.setText(hook.gui.room.text, wait)
                    }
                    return true
                }
            }
        }

        this.hoverRoom = null
        this.mapNameGui.setText('')
        return false
    },
})

declare global {
    namespace sc {
        interface AreaRoomBounds {
            index: number
        }
        interface AreaRoomBoundsConstructor {
            new (
                map: sc.AreaLoadable.Map,
                id: number,
                sx: number,
                sy: number,
                tiles: number[][],
                max?: Vec2
            ): AreaRoomBounds
        }
    }
}
sc.MapFloor.inject({
    init(_floor, callback) {
        const floor = _floor as unknown as sc.AreaLoadable.SDCustom.Floor
        if (floor.shaduungeonCustom) {
            /* Prevent crash */
            if (!_floor.tiles) _floor.tiles = [[]]

            let i = 0
            for (const room of floor.rooms!) {
                room.index = i
                i++
            }
        }
        this.parent(_floor, callback)
        if (floor.shaduungeonCustom) {
            assert(floor.size)
            this.setSize(floor.size.x * tilesize, floor.size.y * tilesize)
        }
    },
})

sc.AreaLoadable.inject({
    _createRooms() {
        if (!this.data!.shaduungeonCustom) return this.parent()

        for (const floor of this.data!.floors as unknown as sc.AreaLoadable.SDCustom.Floor[]) {
            assert(floor.shaduungeonCustom)

            const bounds: sc.AreaRoomBounds[] = []
            for (const map of floor.maps) {
                bounds.push(new sc.AreaRoomBounds(map, map.id + 1, map.min.x, map.min.y, [], map.max))
            }
            floor.rooms = bounds
        }
    },
})

sc.AreaRoomBounds.inject({
    init(map: sc.AreaLoadable.Map, id: number, minX: number, minY: number, tiles: number[][], max?: Vec2) {
        if (!max) return this.parent(map, id, minX, minY, tiles)

        this.name = map.path || 'default_empty'
        this.text = map.name ? ig.LangLabel.getText(map.name) || '???' : '???'
        this.id = id
        this.offset.x = map.offset?.x ?? 0
        this.offset.y = map.offset?.y ?? 0
        this.min.x = minX
        this.min.y = minY
        this.max = max
        // these values dont do anything i think
        this.zMin = map.minZ!
        this.zMax = map.maxZ!
    },
})

const inactiveColors: AreaRendererColorScheme = {
    empty: new ig.SimpleColor('#5e717fff'),
    border: new ig.SimpleColor('#7ac1d5ff'),
    shadow: new ig.SimpleColor('#47566cff'),
}
const activeColors: AreaRendererColorScheme = {
    empty: new ig.SimpleColor('#8c516e'),
    border: new ig.SimpleColor('#9f89aa'),
    shadow: new ig.SimpleColor('#7c3e61'),
}
const black = new ig.SimpleColor('#131313')
const tunnelClear: number = 4

type GuiHookMapRoomList = ig.GuiHook & {
    gui: { floor: sc.AreaLoadable.SDCustom.Floor; room: sc.AreaRoomBounds; unlocked: boolean }
}
sc.MapCurrentRoomWrapper.inject({
    init(hook: ig.GuiHook) {
        const floor = (hook as GuiHookMapRoomList).gui.floor
        if (!floor.shaduungeonCustom) return this.parent(hook)

        this.parent({
            pos: { x: hook.pos.x + addPxSpace, y: hook.pos.y + addPxSpace },
            size: { x: hook.size.x - addPxSpace * 2, y: hook.size.y - addPxSpace * 2 },
        } as ig.GuiHook)
    },
})

sc.MapRoom.inject({
    init(room, _floor, id) {
        const floor = _floor as unknown as sc.AreaLoadable.SDCustom.Floor
        if (floor.shaduungeonCustom) {
            room.min.x = Math.floor(room.min.x * tilesize) / tilesize
            room.min.y = Math.floor(room.min.y * tilesize) / tilesize
            room.max.x = Math.ceil(room.max.x * tilesize) / tilesize
            room.max.y = Math.ceil(room.max.y * tilesize) / tilesize
        }
        this.parent(room, _floor, id)

        if (floor.shaduungeonCustom) {
            this.setSize(this.hook.size.x + addPxSpace * 2, this.hook.size.y + addPxSpace * 2)
        }
    },
    preRender() {
        const floor = this.floor as unknown as sc.AreaLoadable.SDCustom.Floor
        if (!floor.shaduungeonCustom) return this.parent()

        const map = this.floor.maps[this.room.index!] as sc.AreaLoadable.SDCustom.Map
        if (this.prerendered || !this.unlocked) return
        assert(map.rects)
        const c = this.active ? activeColors : inactiveColors

        /*
                function drawConnection(x: number, y: number, connection: sc.AreaLoadable.ConnectionRoomList) {
                    const h = 4
                    switch (connection.dir) {
                        case Dir.NORTH:
                            inactiveColors.empty.draw(x, y, connection.size, h)
                            inactiveColors.border.draw(x - 1, y + 1, 1, h - 1)
                            inactiveColors.border.draw(x + connection.size, y + 1, 1, h - 1)
                            break
                        case Dir.EAST:
                            inactiveColors.empty.draw(x, y, connection.size, h)
                            inactiveColors.border.draw(x, y - 1, connection.size, 1)
                            inactiveColors.border.draw(x, y + connection.size, connection.size, 1)
                            break
                        case Dir.SOUTH:
                            inactiveColors.empty.draw(x, y, connection.size, h)
                            inactiveColors.border.draw(x - 1, y, 1, h - 1)
                            inactiveColors.border.draw(x + connection.size, y, 1, h - 1)
                            break
                        case Dir.WEST:
                            inactiveColors.empty.draw(x, y, connection.size, h)
                            inactiveColors.border.draw(x, y - 1, connection.size, 1)
                            inactiveColors.border.draw(x, y + connection.size, connection.size, 1)
                            break
                    }
                }
                */

        this.buffer = ig.imageAtlas.getFragment(this.hook.size.x, this.hook.size.y, () => {
            /* draw black on south and east edges */
            for (const o of map.rects) {
                if (!o.drawRect) {
                    const rect = {
                        x: o.x * tilesize + addPxSpace,
                        y: o.y * tilesize + addPxSpace,
                        width: o.width * tilesize,
                        height: o.height * tilesize,
                        x2: 0,
                        y2: 0,
                    }
                    o.drawRect = rect
                    o.drawEmptyRect = Rect.copy(rect)
                    rect.x2 = rect.x + rect.width - 1
                    rect.y2 = rect.y + rect.height - 1
                }
                const rect = o.drawRect
                if (o.walls[Dir.SOUTH]) {
                    black.draw(rect.x, rect.y2, rect.width, 1)
                }
                if (o.walls[Dir.EAST]) {
                    black.draw(rect.x2, rect.y, 1, rect.height)
                }
            }
            /* draw borders */
            for (const o of map.rects) {
                const rect = o.drawRect!
                const eRect = o.drawEmptyRect!

                const borderIncGlobal = o.wallsFull ? 0 : 1
                const biPX = o.walls[Dir.EAST] ? 0 : borderIncGlobal
                const biNX = o.walls[Dir.WEST] ? 0 : borderIncGlobal
                const biPY = o.walls[Dir.SOUTH] ? 0 : borderIncGlobal
                const biNY = o.walls[Dir.NORTH] ? 0 : borderIncGlobal

                if (o.walls[Dir.NORTH]) {
                    c.border.draw(rect.x - biNX, rect.y, rect.width + biNX + biPX - 1, 1)
                    c.shadow.draw(eRect.x + 1, eRect.y + 1, eRect.width - 3, 1)
                } else {
                    eRect.y -= tunnelClear
                    eRect.height += tunnelClear
                }
                if (o.walls[Dir.SOUTH]) {
                    c.border.draw(rect.x - biNX, rect.y2 - 1, rect.width + biNX + biPX - 1, 1)
                } else {
                    eRect.height += tunnelClear
                }

                if (o.walls[Dir.EAST]) {
                    c.border.draw(rect.x2 - 1, rect.y - biNY, 1, rect.height + biNY + biPY - 1)
                } else {
                    eRect.width += tunnelClear
                }
                if (o.walls[Dir.WEST]) {
                    c.border.draw(rect.x, rect.y - biNY, 1, rect.height + biNY + biPY - 1)
                } else {
                    eRect.x -= tunnelClear
                    eRect.width += tunnelClear
                }
            }
            /* draw north shadow */
            for (const o of map.rects) {
                if (o.walls[Dir.NORTH]) {
                    const rect = o.drawEmptyRect!
                    c.shadow.draw(rect.x + 1, rect.y + 1, rect.width - 3, 1)
                }
            }
            /* fill the rooms */
            for (const o of map.rects) {
                const rect = o.drawEmptyRect!
                const shadowOffset = o.walls[Dir.NORTH] ? 1 : 0
                c.empty.draw(rect.x + 1, rect.y + shadowOffset + 1, rect.width - 3, rect.height - shadowOffset - 3)
            }

            /*
                        const connections: sc.AreaLoadable.ConnectionRoomList[] = this.floor.connections
                        let i = connections.length
                        while (i--) {
                            const connection = connections[i]
                            // apperently map connections can have a condition? didnt bother implementing that
                            if (connection.map1 + 1 == this.room.id || connection.map2 + 1 == this.room.id) {
                                const rect: bareRect =
                                    // @root/ts-ignore
                                    connection.rect
                                new ig.SimpleColor('#00ff0055').draw(
                                    (rect.x - this.room.min.x) * tilesize + addPxSpace,
                                    (rect.y - this.room.min.y) * tilesize + addPxSpace,
                                    rect.width * tilesize,
                                    rect.height * tilesize
                                )
                                drawConnection(
                                    (connection.tx - this.room.min.x) * tilesize + addPxSpace,
                                    (connection.ty - this.room.min.y) * tilesize + addPxSpace,
                                    connection,
                                )
                            }
                        }
                        */
            // activeColors.empty.draw(0, 0, addPxSpace, addPxSpace)
            // activeColors.empty.draw(this.hook.size.x - addPxSpace, 0, addPxSpace, addPxSpace)
            // activeColors.empty.draw(this.hook.size.x - addPxSpace, this.hook.size.y - addPxSpace, addPxSpace, addPxSpace)
            // activeColors.empty.draw(0, this.hook.size.y - addPxSpace, addPxSpace, addPxSpace)
        })
        this.prerendered = true
    },
})
