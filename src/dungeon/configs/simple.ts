import { DirUtil } from '@root/util/pos'
import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { SimpleMultipleExitMapBuilder, SimpleSingleTunnelEndMapBuilder } from '@root/room/simple-map-builder'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'
import { DungeonConfigFactory } from '@root/dungeon/dungeon-builder'

export class DungeonConfigSimpleFactory implements DungeonConfigFactory {
    get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig> {
        let index = 0
        const bPool = []
        const _sb: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => {
            try {
                const b = Object.assign(new SimpleSingleTunnelEndMapBuilder(areaInfo, dir1, dir2), { exclusive: true })
                // _sb.arr!.push(b, b, b, b, b, b, b, b, b)
                // _sb.arr!.push(b, b, b, b, b)
                _sb.arr!.push(b, b)
            } catch (err) {}
        })})
        bPool.push(_sb)
        
        const _db: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => { DirUtil.forEachDir(dir3 => { // DirUtil.forEachDir(dir4 => {
            try {
                _db.arr.push(Object.assign(new SimpleMultipleExitMapBuilder(areaInfo, dir1, dir2, dir3), { exclusive: true }))
            } catch (err) { }
        })})})// })
        bPool.push(_db)
        
        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            arm: {
                bPool,
                length: 1,
                builderPool: _sb.index,
                endBuilderPool: _db.index,
                end: ArmEnd.Arm,
                arms: [{
                    length: 2,
                    builderPool: _sb.index,
                    endBuilderPool: _sb.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 2,
                    builderPool: _sb.index,
                    endBuilderPool: _db.index,
                    end: ArmEnd.Arm,
                    arms: [{
                        length: 2,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 2,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }]
                }]
            },
        }
        return Promise.resolve(dngGenConfig)
    }
}
