import { TestSuite, Test, expect, TestCase } from 'testyts/build/testyCore'
import { BuildQueue } from '../dungeon/build-queue'
import { Dir } from '../util/geometry'
import { assert, setRandomSeed, sha256 } from '../util/util'
import { MapArrangeData, TprArrange, MapArrange } from './map-arrange'
import { simpleMapRoomArrange, simpleMapRoomTunnelArrange } from './simple'
import { drawQueue } from '../dungeon/queue-drawer'
import { RoomChooser } from '../dungeon/room-choosers/configurable'

@TestSuite()
export class Test_DungeonBuilder {
    @Test()
    simpleRooms() {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = (id, accesor) => {
            const lastTpr: TprArrange =
                id == -1
                    ? { x: 0, y: 0, dir: Dir.NORTH, destId: 0 }
                    : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
            const roomGen = simpleMapRoomArrange({
                roomChooser,
                exitTpr: lastTpr,
                size: { x: 2, y: 2 },
                randomizeDirTryOrder: false,
                finishedWhole: id >= 5,
            })
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
                    ? { x: 0, y: 0, dir: Dir.NORTH, destId: 0 }
                    : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
            const roomGen = simpleMapRoomArrange({
                roomChooser,
                exitTpr: lastTpr,
                size: { x: 2, y: 2 },
                randomizeDirTryOrder: true,
                finishedWhole: id >= 5,
            })
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
            if (id == -1)
                return simpleMapRoomArrange({
                    roomChooser,
                    exitTpr: { x: 0, y: 0, dir: Dir.NORTH, destId: 0 },
                    size: { x: 2, y: 2 },
                    randomizeDirTryOrder: false,
                    finishedWhole: false,
                    forceExit: Dir.EAST,
                })
            if (id == 0)
                return simpleMapRoomArrange({
                    roomChooser,
                    exitTpr: { x: 0, y: 0, dir: Dir.NORTH, destId: 0 },
                    size: { x: 2, y: 2 },
                    randomizeDirTryOrder: false,
                    finishedWhole: true,
                    forceExit: Dir.EAST,
                })
            assert(false)
        }
        const res = queue.begin(roomChooser(-1, queue))
        expect.toBeEqual(res, null)
    }

    @Test()
    @TestCase('seed: crosscode', 'crosscode', `3cd737c2092526f4acf4d2dad5eba393d6e49e3e4bb317957d505ddfdc767218`)
    simpleTunnelRoomsSeed(seed: string, expected: string) {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = (id, accesor) => {
            const lastTpr: TprArrange =
                id == -1
                    ? { dir: Dir.NORTH, x: 0, y: 0, destId: 0 }
                    : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
            const roomGen = simpleMapRoomTunnelArrange({
                roomChooser,
                exitTpr: lastTpr,
                roomSize: { x: 5, y: 3 },
                tunnelSize: { x: 1, y: 2 },
                randomizeDirTryOrder: true,
                finishedWhole: id >= 5,
            })
            return roomGen
        }
        setRandomSeed(seed)
        queue.begin(roomChooser(-1, queue))
        const res = drawQueue(queue)
        const hash = sha256(res)
        expect.toBeEqual(hash, expected)
    }
}