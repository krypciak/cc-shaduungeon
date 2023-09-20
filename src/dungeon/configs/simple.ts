import { DirUtil } from '@root/util/pos'
import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { SimpleMultipleExitMapBuilder, SimpleSingleTunnelMapBuilder } from '@root/room/simple-map-builder'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'

export function getSimpleConfig(areaInfo: AreaInfo, seed: string): DungeonGenerateConfig {
    const _sb: Omit<MapBuilderArrayGenerate, 'inheritance'> = { arr: [], randomize: true }
    DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => {
        try {
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
            _sb.arr!.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
        } catch (err) {}
    })})
    
    const _db: Omit<MapBuilderArrayGenerate, 'inheritance'> = { arr: [], randomize: true }
    DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => { DirUtil.forEachDir(dir3 => { DirUtil.forEachDir(dir4 => {
        try {
            _db.arr.push(Object.assign(new SimpleMultipleExitMapBuilder(areaInfo, true, dir1, dir2, dir3, dir4), { exclusive: true }))
        } catch (err) { }
    })})})})
    
    const dngGenConfig: DungeonGenerateConfig = {
        seed,
        areaInfo,
        arm: {
            length: 1,
            builders: MapBuilderArrayGenerate.inheritNone(_sb),
            endBuilders: MapBuilderArrayGenerate.inheritNone(_db),
            end: ArmEnd.Arm,
            arms: [{
                length: 3,
                builders: MapBuilderArrayGenerate.inheritOverride(false),
                endBuilders: MapBuilderArrayGenerate.inheritOverride(false),
                end: ArmEnd.Item,
                itemType: ArmItemType.DungeonKey,
            }, {
                length: 3,
                builders: MapBuilderArrayGenerate.inheritOverride(false),
                endBuilders: MapBuilderArrayGenerate.inheritOverride(false),
                end: ArmEnd.Item,
                itemType: ArmItemType.DungeonKey,
            }, {
                length: 6,
                builders: MapBuilderArrayGenerate.inheritOverride(false),
                endBuilders: MapBuilderArrayGenerate.inheritOverride(true),
                end: ArmEnd.Arm,
                arms: [{
                    length: 3,
                    builders: MapBuilderArrayGenerate.inheritOverride(false),
                    endBuilders: MapBuilderArrayGenerate.inheritOverride(false),
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 3,
                    builders: MapBuilderArrayGenerate.inheritOverride(false),
                    endBuilders: MapBuilderArrayGenerate.inheritOverride(false),
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 3,
                    builders: MapBuilderArrayGenerate.inheritOverride(false),
                    endBuilders: MapBuilderArrayGenerate.inheritOverride(false),
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }]
            }]
        },
    }
    console.log('dngGenConfig:', dngGenConfig)
    return dngGenConfig
}
