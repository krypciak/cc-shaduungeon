import { AreaPoint, DirUtil } from '@root/util/pos'
import { AreaBuilder, AreaInfo } from '@root/area/area-builder'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { ArmEnd, ArmItemType, DungeonArranger, DungeonGenerateConfig, ExclusiveMapBuilder } from '@root/dungeon/dungeon-arrange'
import { SimpleDoubleExitMapBuilder, SimpleSingleTunnelMapBuilder } from '@root/room/simple-map-builder'

export class DungeonBuilder {
    private getExampleConfig(areaInfo: AreaInfo): DungeonGenerateConfig {
        let armBuilders: Set<ExclusiveMapBuilder> = new Set()
        DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => {
            try {
                armBuilders.add(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: false }))
            } catch (err) {}
        })})

        let armEndBuilders: Set<ExclusiveMapBuilder> = new Set()
        DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => { DirUtil.forEachDir(dir3 => {
            try {
                armEndBuilders.add(Object.assign(new SimpleDoubleExitMapBuilder(areaInfo, dir1, dir2, dir3), { exclusive: false }))
            } catch (err) { }
        })})})

        const endBuilders: Set<ExclusiveMapBuilder> = armBuilders
        const dngGenConfig: DungeonGenerateConfig = {
            seed: 'obama',
            areaInfo,
            arm: {
                length: 2,
                builders: armBuilders,
                endBuilders: armEndBuilders,
                end: ArmEnd.Arm,
                arms: [{
                    length: 1,
                    builders: armBuilders,
                    endBuilders: endBuilders,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 1,
                    builders: armBuilders,
                    endBuilders: endBuilders,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }]
            },
        }
        console.log('dngGenConfig:', dngGenConfig)
        return dngGenConfig
    }

    async build(id: string) {
        const dngPaths = new DungeonPaths(id)
        dngPaths.registerSelections()
        dngPaths.clearDir()

        const areaInfo: AreaInfo = new AreaInfo(dngPaths, 'Generated Dungeon', 'generic description, ' + dngPaths.nameAndId, 'DUNGEON', Vec2.createC(150, 70))
        
        const dngGenConfig: DungeonGenerateConfig = this.getExampleConfig(areaInfo)
 
        const arranger: DungeonArranger = new DungeonArranger(dngGenConfig)
        let dngConfig = await arranger.arrangeDungeon()
        console.log(dngConfig)
        if (! dngConfig.arm) {
            console.log('build failed')
            return
        }

        const obj1 = AreaBuilder.trimArm(dngConfig.arm)
        const size: AreaPoint = obj1.size

        const areaBuilder: AreaBuilder = new AreaBuilder(areaInfo, dngConfig.arm, size)
        await areaBuilder.build()
        console.log(areaBuilder.builtArea)
        areaBuilder.createDbEntry()
        areaBuilder.saveToFile()

        dnggen.areaDrawer.drawArea(dngConfig, size)
        dnggen.areaDrawer.copyToClipboard()


        // const usedBuilders: MapBuilder[] = obj.stack.array.map(e => e.builder!)
        // await MapBuilder.placeBuilders(usedBuilders)

        // dngPaths.saveConfig()

        // blitzkrieg.puzzleSelections.save()
        // blitzkrieg.battleSelections.save()

        // dngPaths.registerFiles()

        // ig.game.varsChangedDeferred()
        // ig.game.teleport(usedBuilders[dnggen.debug.roomTp].path!, ig.TeleportPosition.createFromJson({
        //     marker: usedBuilders[dnggen.debug.roomTp].entarenceRoom.primaryEntarence.getTpr().name,
        //     level: 0,
        //     baseZPos: 0,
        //     size: {x: 0, y: 0}
        // }))
        // AreaBuilder.openAreaViewerGui(areaInfo.name, obj.stack.array[0].builder!.name!, 0)
    }
}

