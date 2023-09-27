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
        DirUtil.forEachUniqueDir2((d1, d2) => {
            const b = Object.assign(new SimpleSingleTunnelEndMapBuilder(areaInfo, d1, d2), { exclusive: true })
            _sb.arr.push(b, b, b)
        })
        bPool.push(_sb)
        
        const _db: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachUniqueDir4((d1, d2, d3, d4) => {
            const b = Object.assign(new SimpleMultipleExitMapBuilder(areaInfo, d1, d2, d3, d4), { exclusive: true })
            _db.arr.push(b)
        })
        bPool.push(_db)
        
        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            arm: {
                bPool,
                length: 3,
                builderPool: _sb.index,
                endBuilderPool: _db.index,
                end: ArmEnd.Arm,
                arms: [{
                    length: 3,
                    builderPool: _sb.index,
                    endBuilderPool: _db.index,
                    end: ArmEnd.Arm,
                    arms: [{
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }]
                }, {
                    length: 3,
                    builderPool: _sb.index,
                    endBuilderPool: _db.index,
                    end: ArmEnd.Arm,
                    arms: [{
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }]
                }, {
                    length: 3,
                    builderPool: _sb.index,
                    endBuilderPool: _db.index,
                    end: ArmEnd.Arm,
                    arms: [{
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 1,
                        builderPool: _sb.index,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }]
                }]
                //arms: [{
                //    length: 1,
                //    builderPool: _sb.index,
                //    endBuilderPool: _sb.index,
                //    end: ArmEnd.Item,
                //    itemType: ArmItemType.DungeonKey,
                //}, {
                //    length: 1,
                //    builderPool: _sb.index,
                //    endBuilderPool: _db.index,
                //    end: ArmEnd.Arm,
                //    arms: [{
                //        length: 0,
                //        builderPool: _sb.index,
                //        endBuilderPool: _sb.index,
                //        end: ArmEnd.Item,
                //        itemType: ArmItemType.DungeonKey,
                //    }, {
                //        length: 0,
                //        builderPool: _sb.index,
                //        endBuilderPool: _sb.index,
                //        end: ArmEnd.Item,
                //        itemType: ArmItemType.DungeonKey,
                //    }, {
                //        length: 0,
                //        builderPool: _sb.index,
                //        endBuilderPool: _sb.index,
                //        end: ArmEnd.Item,
                //        itemType: ArmItemType.DungeonKey,
                //    }]
                //}, {
                //    length: 1,
                //    builderPool: _sb.index,
                //    endBuilderPool: _db.index,
                //    end: ArmEnd.Arm,
                //    arms: [{
                //        length: 0,
                //        builderPool: _sb.index,
                //        endBuilderPool: _sb.index,
                //        end: ArmEnd.Item,
                //        itemType: ArmItemType.DungeonKey,
                //    }, {
                //        length: 0,
                //        builderPool: _sb.index,
                //        endBuilderPool: _sb.index,
                //        end: ArmEnd.Item,
                //        itemType: ArmItemType.DungeonKey,
                //    }, {
                //        length: 0,
                //        builderPool: _sb.index,
                //        endBuilderPool: _sb.index,
                //        end: ArmEnd.Item,
                //        itemType: ArmItemType.DungeonKey,
                //    }]
                //}]
            },
        }
        return Promise.resolve(dngGenConfig)
    }
}
