import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'
import { DungeonConfigFactory } from '@root/dungeon/dungeon-builder'
import { PuzzleRoom } from '@root/room/puzzle-room'
import { Selection } from '@root/types'
import { MapBuilder } from '@root/room/map-builder'
import { PuzzleMapBuilder } from '@root/room/dungeon-map-builder'

export class DungeonConfigMainFactory implements DungeonConfigFactory {
    async get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig> {
        await PuzzleRoom.preloadPuzzleList()
        const puzzleList = PuzzleRoom.puzzleList

        const puzzles: Readonly<Selection>[] = []
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }
        console.log('puzzles:', puzzles)

        let index: number = 0
        const bPool = []
        const regularBuilders: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        for (let i = 0; i < puzzles.length; i++) {
            const sel = puzzles[i]
            const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
            const builder: MapBuilder = new PuzzleMapBuilder(areaInfo, sel, puzzleMap, true, '', true)
            regularBuilders.arr.push(Object.assign(builder, { exclusive: true }))
        }
        bPool.push(regularBuilders)

        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            arm: {
                bPool,
                length: regularBuilders.arr.length / 1.5,
                builderPool: 0,
                endBuilderPool: 0,
                end: ArmEnd.Item,
                itemType: ArmItemType.Tresure,
            },
        }
        return dngGenConfig
    }
}
