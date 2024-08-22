import { Id, BuildQueueAccesor, NextQueueEntryGenerator } from '../../build-queue/build-queue'
import { MapArrangeData, TprArrange, MapArrange } from '../../map-arrange/map-arrange'
import { Dir } from '../../util/geometry'
import { assert } from '../../util/util'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {}
    }
}

export type MapPickerData = {
    newId?: Id
    newIndex?: number
    nextBranch?: number
    nextConfig?: MapPicker.ConfigNodeBuildtime
}
export type MapPicker = (
    id: Id,
    accesor: BuildQueueAccesor<MapArrangeData>,
    data?: MapPickerData
) => NextQueueEntryGenerator<MapArrangeData>

export namespace MapPicker {
    export interface NodeCommon<T extends ConfigTypes> {
        type: T
    }

    type ExtractValues<T> = T[keyof T]
    export type ConfigNode = ExtractValues<{
        [key in keyof MapPickerNodeConfigs.All]: MapPickerNodeConfigs.All[key] & NodeCommon<key>
    }>

    export type ConfigTypes = ConfigNode['type']
    export type NodeBuilder<T extends ConfigTypes> = (
        data: MapPickerNodeConfigs.All[T],
        buildtimeData: {
            mapPicker: MapPicker
            exitTpr: TprArrange
            branchDone?: boolean
            finishedWhole?: boolean
            nodeId: number
            nodeProgress?: number
            destId: number
            destIndex: number
        }
    ) => NextQueueEntryGenerator<MapArrangeData>
    export type NodeBuilderRecord = { [key in ConfigTypes]: NodeBuilder<key> }

    export interface Config {
        root: ConfigNode
        startDir?: Dir
    }

    export type ConfigNodeBuildtime = ConfigNode & {
        nodeId: number
    }
    export interface ConfigBuildtime extends Config {
        root: ConfigNodeBuildtime
    }
}

const nodeConfigs: MapPicker.NodeBuilderRecord = {} as any
export function registerMapPickerNodeConfig<T extends MapPicker.ConfigTypes>(
    type: T,
    builder: MapPicker.NodeBuilderRecord[T]
) {
    assert(!nodeConfigs[type])
    nodeConfigs[type] = builder
}

export function mapPickerConfigurable(_config: MapPicker.Config): MapPicker {
    const config = _config as MapPicker.ConfigBuildtime
    const idToNodeMap: Record<number, MapPicker.ConfigNodeBuildtime> = {}
    let lastNodeId: number
    {
        let nodeId = 0
        function setNodeIdsRecursive(node: MapPicker.ConfigNodeBuildtime) {
            node.nodeId = nodeId
            idToNodeMap[nodeId] = node
            nodeId++
            if ('followedBy' in node && node.followedBy) {
                setNodeIdsRecursive(node.followedBy as MapPicker.ConfigNodeBuildtime)
            }
            if ('branches' in node && node.branches) {
                for (const branch of node.branches) {
                    setNodeIdsRecursive(branch as MapPicker.ConfigNodeBuildtime)
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

    const mapPicker = (
        id: Id,
        accesor: BuildQueueAccesor<MapArrangeData>,
        { newId = id + 1, newIndex = 0, nextBranch, nextConfig }: MapPickerData = {}
    ): NextQueueEntryGenerator<MapArrangeData> => {
        const last = id == -1 ? undefined : (accesor.get(id) as MapArrange)
        // {
        //     const push = accesor.globalPushCount
        //     const pop = accesor.globalPopCount
        //     const str = `push: ${push}, pop: ${pop}, len: ${accesor.queue.length}, ratio: ${(accesor.queue.length / pop).toPrecision(4)}`
        //     printMapArrangeQueue(accesor, 16, true, undefined, true, true, str)
        // }

        const lastTpr = last
            ? (last.restTprs.find(t => t.destId == newId)! as TprArrange)
            : { x: 0, y: 0, dir: _config.startDir ?? Dir.NORTH, destId: 0 }

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
                const nextConfig = config.followedBy as MapPicker.ConfigNodeBuildtime

                return mapPicker(id, accesor, { newId, nextConfig })
            } else {
                const branchDone = !config.followedBy && config.count - 1 <= nodeProgress
                const finishedWhole = branchDone && nodeId == lastNodeId

                const generator = nodeConfigs[config.type]
                return generator(config as any, {
                    exitTpr: lastTpr,
                    mapPicker,
                    branchDone,
                    nodeId,
                    nodeProgress: nodeProgress + 1,
                    finishedWhole,
                    destId: id,
                    destIndex: newIndex,
                })
            }
        }

        if ('branches' in config) {
            if (nextBranch !== undefined) {
                assert(last?.createNextBranch)
                const nextConfig = config.branches[nextBranch] as MapPicker.ConfigNodeBuildtime
                return mapPicker(id, accesor, { newId, nextConfig, newIndex })
            }
            const generator = nodeConfigs[config.type]
            return generator(config as any, {
                exitTpr: lastTpr,
                mapPicker,
                nodeId: nodeId,
                destId: id,
                destIndex: newIndex,
            })
        }

        assert(false)
    }
    return mapPicker
}
