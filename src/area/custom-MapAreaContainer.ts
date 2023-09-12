import { RoomType } from '../room/room'
import { assert, assertBool } from '../util/misc'
import { Dir, bareRect } from '../util/pos'
import { GuiHookMapRoomList } from './area'

export enum AreaViewFloorTypes {
    Grid, /* default */
    RoomList,
}

const tilesize = 8
interface AreaRendererColorScheme {
    empty: ig.SimpleColor
    border: ig.SimpleColor
    shadow: ig.SimpleColor
}

export function overrideMapAreaContainer() {
    const addPxSpace: number = 0
    sc.MapAreaContainer.inject({
        findMap(mx: number, my: number, gamepad: boolean, wait: number): boolean | undefined {
            if (sc.menu.mapMapFocus) { return }
            const area = sc.map.getCurrentArea()
            if (area && area.type == AreaViewFloorTypes.RoomList) {
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
                
                if (this.area.hook.children.length == 0) { return }

                const mapGuis: GuiHookMapRoomList[] = this.area.hook.children[sc.map.getCurrentFloorIndex()].children as GuiHookMapRoomList[]
                for (const hook of mapGuis) {
                    if (! hook.gui.room || ! hook.gui.unlocked) { continue }

                    if (gamepad) {
                        this.mapNameGui.setPos(
                            sc.menu.mapCursor.x + 5,
                            sc.menu.mapCursor.y - this.mapNameGui.hook.size.y - 4,
                        )
                    } else {
                        this.mapNameGui.setPos(
                            mx - sc.menu.mapCamera.x,
                            my - sc.menu.mapCamera.y - this.mapNameGui.hook.size.y - 1,
                        )
                    }
                    const map: sc.AreaLoadable.MapRoomList = hook.gui.floor.maps[hook.gui.room.index!] as sc.AreaLoadable.MapRoomList
                    for (const r of map.rects) {
                        if (! r.areaRect) {
                            r.areaRect = {
                                x: (r.x + map.min.x) * tilesize,
                                y: (r.y + map.min.y) * tilesize,
                                width: r.width * tilesize,
                                height: r.height * tilesize,
                            }
                        }
                        const rect = r.areaRect
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
                this.mapNameGui.setText("")
                return false
            } else {
                this.parent(mx, my, gamepad, wait)
            }
            return true
        }
    })

    sc.MapFloor.inject({
        init(floor: sc.AreaLoadable.FloorCustom, callback: any) {
            this.type = floor.type = floor.type ?? AreaViewFloorTypes.Grid
            if (floor.type == AreaViewFloorTypes.RoomList) {
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
            if (floor.type == AreaViewFloorTypes.RoomList) {
                assert(floor.size)
                this.setSize(floor.size.x * tilesize, floor.size.y * tilesize)
            }
        }
    })

    sc.AreaLoadable.inject({
        _createRooms() {
            if (this.data!.type == AreaViewFloorTypes.RoomList) {
                for (const floor of this.data!.floors) {
                    const bounds: sc.AreaRoomBounds[] = []
                    if (floor.type != AreaViewFloorTypes.RoomList) { throw new Error('all area maps of type "roomList" must also have that type') }
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

    sc.MapCurrentRoomWrapper.inject({
        init(hook: ig.GuiHook | { pos: Vec2, size: Vec2 }) {
            /* here hook is always ig.GuiHook */
            if ((hook as GuiHookMapRoomList).gui.floor?.type == AreaViewFloorTypes.RoomList) {
                this.parent({
                    pos: {
                        x: hook.pos.x + addPxSpace,
                        y: hook.pos.y + addPxSpace,
                    },
                    size: {
                        x: hook.size.x - addPxSpace*2,
                        y: hook.size.y - addPxSpace*2,
                    },
                })
            } else {
                this.parent(hook)
            }
        }
    })

    sc.MapRoom.inject({
        init(room, floor, id) {
            if (floor.type == AreaViewFloorTypes.RoomList) {
                room.min.x = Math.floor(room.min.x * tilesize)/tilesize
                room.min.y = Math.floor(room.min.y * tilesize)/tilesize
                room.max.x = Math.ceil(room.max.x * tilesize)/tilesize
                room.max.y = Math.ceil(room.max.y * tilesize)/tilesize
            }
            this.parent(room, floor, id)
            if (floor.type == AreaViewFloorTypes.RoomList) {
                this.setSize(this.hook.size.x + addPxSpace*2, this.hook.size.y + addPxSpace*2)
            }
        },
        preRender() {
            if (this.floor.type == AreaViewFloorTypes.RoomList) {
                if (! this.prerendered && this.unlocked) {
                    const map = this.floor.maps[this.room.index!] as sc.AreaLoadable.MapRoomList
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

                    this.buffer = ig.imageAtlas.getFragment(
                        this.hook.size.x,
                        this.hook.size.y,
                        () => {
                            assertBool(this.floor.type == AreaViewFloorTypes.RoomList)
                            /* draw black on south and east edges */
                            map.rects.forEach(o => {
                                if (! o.drawRect) {
                                    o.drawRect = {
                                        x: o.x * tilesize + addPxSpace,
                                        y: o.y * tilesize + addPxSpace,
                                        width: o.width * tilesize,
                                        height: o.height * tilesize,
                                    } as (bareRect & { x2: number; y2: number })
                                    o.drawEmptyRect = { ...o.drawRect }
                                    o.drawRect.x2 = o.drawRect.x + o.drawRect.width - 1
                                    o.drawRect.y2 = o.drawRect.y + o.drawRect.height - 1
                                }
                                const rect = o.drawRect
                                if (o.wallSides[Dir.SOUTH]) {
                                    black.draw(rect.x, rect.y2, rect.width, 1)
                                }
                                if (o.wallSides[Dir.EAST]) {
                                    black.draw(rect.x2, rect.y, 1, rect.height)
                                }
                            })
                            /* draw borders */
                            map.rects.forEach(o => {
                                const rect = o.drawRect!
                                const eRect = o.drawEmptyRect!

                                const borderIncGlobal = o.roomType == RoomType.Tunnel ? 1 : 0
                                const biPX = o.wallSides[Dir.EAST] ? 0 : borderIncGlobal
                                const biNX = o.wallSides[Dir.WEST] ? 0 : borderIncGlobal
                                const biPY = o.wallSides[Dir.SOUTH] ? 0 : borderIncGlobal
                                const biNY = o.wallSides[Dir.NORTH] ? 0 : borderIncGlobal

                                if (o.wallSides[Dir.NORTH]) {
                                    c.border.draw(rect.x - biNX, rect.y, rect.width + biNX + biPX - 1, 1)
                                    c.shadow.draw(eRect.x + 1, eRect.y + 1, eRect.width - 3, 1)
                                } else {
                                    eRect.y -= tunnelClear
                                    eRect.height += tunnelClear
                                }
                                if (o.wallSides[Dir.SOUTH]) {
                                    c.border.draw(rect.x - biNX, rect.y2 - 1, rect.width + biNX + biPX - 1, 1)
                                } else {
                                    eRect.height += tunnelClear
                                }

                                if (o.wallSides[Dir.EAST]) {
                                    c.border.draw(rect.x2 - 1, rect.y - biNY, 1, rect.height + biNY + biPY - 1)
                                } else {
                                    eRect.width += tunnelClear
                                }
                                if (o.wallSides[Dir.WEST]) {
                                    c.border.draw(rect.x, rect.y - biNY, 1, rect.height + biNY + biPY - 1)
                                } else {
                                    eRect.x -= tunnelClear
                                    eRect.width += tunnelClear
                                }
                            })
                            /* draw north shadow */
                            map.rects.forEach(o => {
                                if (o.wallSides[Dir.NORTH]) {
                                    const rect = o.drawEmptyRect!
                                    c.shadow.draw(rect.x + 1, rect.y + 1, rect.width - 3, 1)
                                }
                            })
                            /* fill the rooms */
                            map.rects.forEach(o => {
                                const rect = o.drawEmptyRect!
                                const shadowOffset = o.wallSides[Dir.NORTH] ? 1 : 0
                                c.empty.draw(rect.x + 1, rect.y + shadowOffset + 1, rect.width - 3, rect.height - shadowOffset - 3)
                            })

                            /*
                            const connections: sc.AreaLoadable.ConnectionRoomList[] = this.floor.connections
                            let i = connections.length
                            while (i--) {
                                const connection = connections[i]
                                // apperently map connections can have a condition? didnt bother implementing that
                                if (connection.map1 + 1 == this.room.id || connection.map2 + 1 == this.room.id) {
                                    const rect: bareRect = 
                                        // @ts-ignore
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
                }
            } else {
                this.parent()
            }
        }
    },
    )
}
