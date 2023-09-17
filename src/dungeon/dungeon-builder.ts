import { AreaPoint, DirUtil } from '@root/util/pos'
import { AreaBuilder, AreaInfo } from '@root/area/area-builder'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { ArmEnd, ArmItemType, DungeonArranger, DungeonGenerateConfig, MapBuilderArrayGenerate, flatOutArmTopDown } from '@root/dungeon/dungeon-arrange'
import { SimpleMultipleExitMapBuilder, SimpleSingleTunnelMapBuilder } from '@root/room/simple-map-builder'
import { MapBuilder } from '@root/room/map-builder'

export class DungeonBuilder {
    private getExampleConfig(areaInfo: AreaInfo, seed: string): DungeonGenerateConfig {
        function getSingleBuilders(): MapBuilderArrayGenerate {
            const obj: MapBuilderArrayGenerate = { arr: [], randomize: true }
            DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => {
                try {
                    obj.arr.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
                    obj.arr.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
                    obj.arr.push(Object.assign(new SimpleSingleTunnelMapBuilder(areaInfo, dir1, dir2), { exclusive: true }))
                } catch (err) {}
            })})
            return obj
        }

        function getDoubleBuilders(): MapBuilderArrayGenerate {
            const obj: MapBuilderArrayGenerate = { arr: [], randomize: true }
            DirUtil.forEachDir(dir1 => { DirUtil.forEachDir(dir2 => { DirUtil.forEachDir(dir3 => { DirUtil.forEachDir(dir4 => {
                try {
                    obj.arr.push(Object.assign(new SimpleMultipleExitMapBuilder(areaInfo, true, dir1, dir2, dir3, dir4), { exclusive: true }))
                } catch (err) { }
            })})})})
            return obj
        }

        const singleBuilders = getSingleBuilders()
        const doubleBuilders = getDoubleBuilders()

        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            arm: {
                length: 1,
                builders: singleBuilders,
                endBuilders: doubleBuilders,
                end: ArmEnd.Arm,
                arms: [{
                    length: 3,
                    builders: singleBuilders,
                    endBuilders: singleBuilders,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 3,
                    builders: singleBuilders,
                    endBuilders: singleBuilders,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 6,
                    builders: singleBuilders,
                    endBuilders: doubleBuilders,
                    end: ArmEnd.Arm,
                    arms: [{
                        length: 3,
                        builders: singleBuilders,
                        endBuilders: singleBuilders,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 3,
                        builders: singleBuilders,
                        endBuilders: singleBuilders,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 3,
                        builders: singleBuilders,
                        endBuilders: singleBuilders,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }]
                }]
            },
        }
        console.log('dngGenConfig:', dngGenConfig)
        return dngGenConfig
    }

    async build(id: string, seed: string) {
        const dngPaths = new DungeonPaths(id)
        dngPaths.registerSelections()
        dngPaths.clearDir()

        const areaInfo: AreaInfo = new AreaInfo(dngPaths, 'Generated Dungeon', 'generic description, ' + dngPaths.nameAndId, 'DUNGEON', Vec2.createC(150, 70))
        
        const dngGenConfig: DungeonGenerateConfig = this.getExampleConfig(areaInfo, seed)
 
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

        // dnggen.areaDrawer.drawArea(dngConfig, size)
        // dnggen.areaDrawer.copyToClipboard()

        const flatEntries = flatOutArmTopDown(dngConfig.arm)

        const usedBuilders: MapBuilder[] = flatEntries.flatMap(e => e.builder)
        await MapBuilder.placeBuilders(usedBuilders)

        dngPaths.saveConfig()

        blitzkrieg.puzzleSelections.save()
        blitzkrieg.battleSelections.save()

        dngPaths.registerFiles()

        ig.game.varsChangedDeferred()
        ig.game.teleport(usedBuilders[dnggen.debug.roomTp].path!, ig.TeleportPosition.createFromJson({
            marker: usedBuilders[dnggen.debug.roomTp].entarenceRoom.primaryEntarence.getTpr().name,
            level: 0,
            baseZPos: 0,
            size: {x: 0, y: 0}
        }))
        // AreaBuilder.openAreaViewerGui(areaInfo.name, flatEntries[0].builder.name!, 0)
    }
}

