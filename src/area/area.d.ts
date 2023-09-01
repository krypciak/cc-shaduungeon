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
                rects: AreaRect[]
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
        }
        interface MapFloorConstructor extends ImpactClass<MapFloor> {
            new (floor: sc.AreaLoadable.Floor, callback: any): MapFloor
        }
        var MapFloor: MapFloorConstructor
        /* MapFloor end */

        interface MapAreaContainer extends ig.GuiElementBase {
            findMap(this: this, a: any, b: any, c: any, d: any): boolean
        }
    }
}
