import { MapArrangeData, TprArrange, MapArrange } from '../../map-arrange/map-arrange'
import { simpleMapRoomArrange, simpleMapRoomTunnelArrange, simpleMapRoomBranchTunnelArrange } from '../../map-arrange/simple'
import { Dir } from '../../util/geometry'
import { assert } from '../../util/util'
import { Id, BuildQueueAccesor, NextQueueEntryGenerator } from '../build-queue'

declare global {
    export namespace RoomChooserNodeConfigs {
        export interface All {}

        export interface All {
            Simple: Simple
        }
        export interface Simple {
            count: number
            size: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: RoomChooser.ConfigNode
        }

        export interface All {
            SimpleTunnel: SimpleTunnel
        }
        export interface SimpleTunnel {
            count: number
            roomSize: Vec2
            tunnelSize: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: RoomChooser.ConfigNode
        }

        export interface All {
            SimpleBranch: SimpleBranch
        }
        export interface SimpleBranch {
            roomSize: Vec2
            tunnelSize: Vec2
            branches:
                | [RoomChooser.ConfigNode]
                | [RoomChooser.ConfigNode, RoomChooser.ConfigNode]
                | [RoomChooser.ConfigNode, RoomChooser.ConfigNode, RoomChooser.ConfigNode]
            randomizeDirTryOrder?: boolean
        }
    }
}

export type RoomChooser = (
    id: Id,
    accesor: BuildQueueAccesor<MapArrangeData>,
    newId?: Id,
    nextBranch?: number
) => NextQueueEntryGenerator<MapArrangeData>

export namespace RoomChooser {
    export interface NodeCommon<T extends ConfigTypes> {
        type: T
    }

    type ExtractValues<T> = T[keyof T]
    export type ConfigNode = ExtractValues<{
        [key in keyof RoomChooserNodeConfigs.All]: RoomChooserNodeConfigs.All[key] & NodeCommon<key>
    }>

    export type ConfigTypes = ConfigNode['type']
    export type NodeBuilder<T extends ConfigTypes> = (
        data: RoomChooserNodeConfigs.All[T],
        buildtimeData: {
            roomChooser: RoomChooser
            exitTpr: TprArrange
            branchDone?: boolean
            finishedWhole?: boolean
            nodeId: number
            nodeProgress?: number
        }
    ) => NextQueueEntryGenerator<MapArrangeData>
    export type NodeBuilderRecord = { [key in ConfigTypes]: NodeBuilder<key> }

    export interface Config {
        root: ConfigNode
    }

    export type ConfigNodeBuildtime = ConfigNode & {
        nodeId: number
    }
    export interface ConfigBuildtime extends Config {
        root: ConfigNodeBuildtime
    }
}

const nodeConfigs: RoomChooser.NodeBuilderRecord = {} as any
export function registerRoomChooserNodeConfig<T extends RoomChooser.ConfigTypes>(
    type: T,
    builder: RoomChooser.NodeBuilderRecord[T]
) {
    assert(!nodeConfigs[type])
    nodeConfigs[type] = builder
}

let registered = false
function registerStuff() {
    if (registered) return
    registered = true
    registerRoomChooserNodeConfig('Simple', (data, buildtimeData) => {
        return simpleMapRoomArrange({ ...data, ...buildtimeData })
    })
    registerRoomChooserNodeConfig('SimpleTunnel', (data, buildtimeData) => {
        return simpleMapRoomTunnelArrange({ ...data, ...buildtimeData })
    })
    registerRoomChooserNodeConfig('SimpleBranch', (data, buildtimeData) => {
        return simpleMapRoomBranchTunnelArrange({ ...data, ...buildtimeData, branchCount: data.branches.length })
    })
}

export function roomChooserConfigurable(_config: RoomChooser.Config): RoomChooser {
    registerStuff()

    const config = _config as RoomChooser.ConfigBuildtime
    const idToNodeMap: Record<number, RoomChooser.ConfigNodeBuildtime> = {}
    let lastNodeId: number
    {
        let nodeId = 0
        function setNodeIdsRecursive(node: RoomChooser.ConfigNodeBuildtime) {
            node.nodeId = nodeId
            idToNodeMap[nodeId] = node
            nodeId++
            if ('followedBy' in node && node.followedBy) {
                setNodeIdsRecursive(node.followedBy as RoomChooser.ConfigNodeBuildtime)
            }
            if ('branches' in node && node.branches) {
                for (const branch of node.branches) {
                    setNodeIdsRecursive(branch as RoomChooser.ConfigNodeBuildtime)
                }
            }
        }
        setNodeIdsRecursive(config.root)
        lastNodeId = nodeId - 1
    }

    function findLastBranch(id: Id, accesor: BuildQueueAccesor<MapArrangeData>): MapArrangeData | undefined {
        for (let i = id - 1; i >= 0; i--) {
            const map = accesor.get(i)
            if (map.createNextBranch) return map
        }
    }

    const roomChooser = (
        id: Id,
        accesor: BuildQueueAccesor<MapArrangeData>,
        newId = id + 1,
        nextBranch?: number,
        nextConfig?: RoomChooser.ConfigNodeBuildtime
    ): NextQueueEntryGenerator<MapArrangeData> => {
        const last = id == -1 ? undefined : (accesor.get(id) as MapArrange)
        // {
        //     const push = accesor.globalPushCount
        //     const pop = accesor.globalPopCount
        //     const str = `push: ${push}, pop: ${pop}, len: ${accesor.queue.length}, ratio: ${(accesor.queue.length / pop).toPrecision(4)}`
        //     printQueue(accesor, true, undefined, true, true, str)
        // }

        const lastTpr = last
            ? (last.restTprs.find(t => t.destId == newId)! as TprArrange)
            : { x: 0, y: 0, dir: Dir.NORTH, destId: 0 }

        const nodeId = nextConfig?.nodeId ?? last?.nodeId ?? 0
        const nodeProgress = nextConfig ? 0 : (last?.nodeProgress ?? 0)
        const config = nextConfig ?? idToNodeMap[nodeId]

        if (nextBranch !== undefined && !('branches' in config)) {
            const lastBranch = findLastBranch(id, accesor) as MapArrange
            assert(lastBranch.createNextBranch)
            return lastBranch.createNextBranch
        }
        if (last?.branchDone) {
            const lastBranch = findLastBranch(id, accesor) as MapArrange
            assert(lastBranch)
            return lastBranch.createNextBranch!
        }

        if ('count' in config) {
            assert(config.count > 0, 'config.count cannot be 0')
            if (config.count == nodeProgress) {
                assert(config.followedBy)
                const nextConfig = config.followedBy as RoomChooser.ConfigNodeBuildtime

                return roomChooser(id, accesor, newId, undefined, nextConfig)
            } else {
                const branchDone = !config.followedBy && config.count - 1 <= nodeProgress
                const finishedWhole = branchDone && nodeId == lastNodeId
                if (finishedWhole) debugger

                const generator = nodeConfigs[config.type]
                return generator(config as any, {
                    exitTpr: lastTpr,
                    roomChooser,
                    branchDone,
                    nodeId,
                    nodeProgress: nodeProgress + 1,
                    finishedWhole,
                })
            }
        }

        if ('branches' in config) {
            if (nextBranch !== undefined) {
                assert(last?.createNextBranch)
                const nextConfig = config.branches[nextBranch] as RoomChooser.ConfigNodeBuildtime
                return roomChooser(id, accesor, newId, undefined, nextConfig)
            }
            const generator = nodeConfigs[config.type]
            return generator(config as any, { exitTpr: lastTpr, roomChooser, nodeId: nodeId })
        }

        assert(false)
    }
    return roomChooser
}

