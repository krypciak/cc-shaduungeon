import { RoomType } from '../room/room'
import { bareRect } from '../util/pos'

export {}

declare global {
    namespace sc {
        namespace AreaLoadable {
            interface Data {
                type?: 'grid' | 'roomList'
            }
            interface Floor {
                type?: 'grid' | 'roomList'
                size?: Vec2

                rooms?: sc.AreaRoomBounds[]
            }
            interface Map {
                // unused??
                minZ?: number
                maxZ?: number
            }
            interface MapRoomList extends sc.AreaLoadable.Map {
                // arearect is calculated at runtime and cached here
                rects: (bareRect & {
                    roomType: RoomType
                    wallSides: boolean[]
                    arearect?: bareRect
                })[]
                id: number
                min: Vec2 
                max: Vec2
            }
        }

        /* AreaLoadable */
        interface AreaLoadable {
            _createRooms(this: this): void
        }
        /* AreaLoadable end */
        /* AreaRoomBounds */
        interface AreaRoomBounds extends ig.Class {
            zMin: number
            zMax: number
            min: Vec2
            max: Vec2
            offset: Vec2
            name: string
            text: string
            id: number
            // custom
            index?: number
        }
        interface AreaRoomBoundsConstructor extends ImpactClass<AreaRoomBounds> {
            new (map: sc.AreaLoadable.Map, id: number, minX: number, minY: number, tiles: number[][], max?: Vec2): AreaRoomBounds
        }
        var AreaRoomBounds: AreaRoomBoundsConstructor
        /* AreaRoomBounds end */
        /* MapFloor */
        interface MapFloor extends ig.GuiElementBase {
            floor: sc.AreaLoadable.Floor
            name: string 
            nameGui: string
            rooms: sc.AreaRoomBounds[]
            activeRoom: null
            callback: any
            bounds: bareRect
            // custom
            type: 'grid' | 'roomList'

            setPos(this: this, x: number, y: number): void
            setSize(this: this, width: number, height: number): void
            doStateTransition(this: this, type: string, bool: boolean): void
            _createRooms(this: this): void
        }
        interface MapFloorConstructor extends ImpactClass<MapFloor> {
            new (floor: sc.AreaLoadable.Floor, callback: any): MapFloor
        }
        var MapFloor: MapFloorConstructor
        /* MapFloor end */
        /* MapArea */
        interface MapArea extends ig.GuiElementBase { }
        interface MapAreaConstructor extends ImpactClass<MapArea> {
            new (): MapArea
        }
        var MapArea: MapAreaConstructor
        /* MapArea end */
        /* MapNameGui */
        interface MapNameGui extends ig.BoxGui {
            text: string
            
            setText(text: string, wait?: any, skip?: boolean): void
        }
        interface MapNameGuiConstructor extends ImpactClass<MapNameGui> {
            new (): MapNameGui
        }
        var MapNameGui: MapNameGuiConstructor
        /* MapNameGui end */
        /* MapAreaContainer */
        interface MapAreaContainer extends ig.GuiElementBase {
            area: sc.MapArea
            hoverRoom: sc.AreaRoomBounds | null
            mapNameGui: sc.MapNameGui

            findMap(this: this, a: any, b: any, c: any, d: any): boolean | undefined
        }
        /* MapAreaContainer end */
        /* MapModel */
        interface MapModel {
            currentPlayerArea: sc.AreaLoadable
            currentPlayerFloor: number
            currentMap: string

            getCurrentArea(): sc.AreaLoadable.Data
            getCurrentFloorIndex(): number
        }
        /* MapModel end */
        /* MapRoom */
        interface MapRoom extends ig.GuiElementBase {
            gfx: ig.Image
            room: sc.AreaRoomBounds
            buffer: ig.ImageAtlasFragment
            floor: sc.AreaLoadable.Floor
            name: string
            id: number
            roomAlpha: number
            tileWidth: number
            tileHeight: number
            active: boolean
            unlocked: boolean
            prerendered: boolean

            preRender(this: this): void
        }
        interface MapRoomConstructor extends ImpactClass<MapRoom> {
            new (room: sc.AreaRoomBounds, floor: sc.AreaLoadable.Floor, id: number): MapRoom
        }
        var MapRoom: MapRoomConstructor
        /* MapRoom end */
        /* MenuModel */
        interface MenuModel {
            mapMapFocus: any
            mapCamera: Vec2
            mapCursor: Vec2
        }
        /* MenuModel end */
    }

    namespace ig {
        interface Image {
            drawCheck(
                this: this,
                targetX: number,
                targetY: number,
                sourceX?: number,
                sourceY?: number,
                width?: number,
                height?: number,
                flipX?: boolean,
                flipY?: boolean,
                offsetY?: number,
                offsetHeight?: number,
                fragment?: unknown,
                fragmentAlpha?: number,
                filtered?: unknown
            ): void;
        }

    }
}

