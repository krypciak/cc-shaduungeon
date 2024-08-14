import { expect, Test, TestCase, TestSuite } from 'testyts'
import { MapArrangeData, TprArrange, MapArrange } from '../rooms/map-arrange'
import { simpleRoomArrange } from '../rooms/simple'
import { Dir } from '../util/geometry'
import { BuildQueue } from './build-queue'
import { drawQueue } from './builder'
import { RoomChooser } from './room-choosers/simple'
import { assert, setRandomSeed } from '../util/util'

@TestSuite()
export class Test_DungeonBuilder {
    @Test()
    simpleRooms() {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = (id, accesor) => {
            const lastTpr: TprArrange =
                id == -1
                    ? {
                          dir: Dir.NORTH,
                          x: 0,
                          y: 0,
                      }
                    : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
            const roomGen = simpleRoomArrange(roomChooser, lastTpr, 2, false, id >= 5)
            return roomGen
        }
        queue.begin(roomChooser(-1, queue))
        const res = drawQueue(queue)
        const expected = `55\n55\n44\n44\n33\n33\n22\n22\n11\n11\n00\n00`
        expect.toBeEqual(res, expected)
    }

    @Test()
    @TestCase('seed: hello', 'hello', `00112233\n00112233\n    5544\n    5544`)
    simpleRoomsSeed(seed: string, expected: string) {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = (id, accesor) => {
            const lastTpr: TprArrange =
                id == -1
                    ? {
                          dir: Dir.NORTH,
                          x: 0,
                          y: 0,
                      }
                    : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
            const roomGen = simpleRoomArrange(roomChooser, lastTpr, 2, true, id >= 5)
            return roomGen
        }
        setRandomSeed(seed)
        queue.begin(roomChooser(-1, queue))
        const res = drawQueue(queue)
        expect.toBeEqual(res, expected)
    }

    @Test()
    samePlaceFail() {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = (id, _accesor) => {
            if (id == -1) return simpleRoomArrange(roomChooser, { x: 0, y: 0, dir: Dir.NORTH}, 2, false, false, Dir.EAST)
            if (id == 0) return simpleRoomArrange(roomChooser, { x: 0, y: 0, dir: Dir.NORTH}, 2, false, true, Dir.EAST)
            assert(false)
        }
        const res = queue.begin(roomChooser(-1, queue))
        expect.toBeEqual(res, null)
    }
}
