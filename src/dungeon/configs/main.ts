import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'
import { DungeonConfigFactory } from '@root/dungeon/dungeon-builder'
import { PuzzleRoom } from '@root/room/puzzle-room'
import { Selection } from '@root/types'
import { MapBuilder } from '@root/room/map-builder'
import { BattlePuzzleMapBuilder } from '@root/room/dungeon-map-builder'

export class DungeonConfigMainFactory implements DungeonConfigFactory {
    async get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig> {
        await PuzzleRoom.preloadPuzzleList()
        const puzzleList = PuzzleRoom.puzzleList

        const puzzles: Readonly<Selection>[] = []
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }
        console.log('puzzles:', puzzles)

        const regularBuilders: Omit<MapBuilderArrayGenerate, 'inheritance'> = { arr: [], randomize: true }
        for (let i = 0; i < puzzles.length; i++) {
            const sel = puzzles[i]
            const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
            const builder: MapBuilder = new BattlePuzzleMapBuilder(areaInfo, sel, puzzleMap)
            regularBuilders.arr.push(Object.assign(builder, { exclusive: true }))
        }

        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            arm: {
                length: regularBuilders.arr.length / 2,
                builders: MapBuilderArrayGenerate.inheritNone(regularBuilders),
                endBuilders: MapBuilderArrayGenerate.inheritNone(regularBuilders),
                end: ArmEnd.Item,
                itemType: ArmItemType.Tresure,
            },
        }
        return dngGenConfig
    }
}
