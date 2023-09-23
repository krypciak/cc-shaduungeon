import { AreaPoint } from '@root/util/pos'
import { AreaBuilder, AreaInfo } from '@root/area/area-builder'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { DungeonArranger, DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { MapBuilder } from '@root/room/map-builder'
import { ArmRuntime, ArmRuntimeEntry, flatOutArmTopDown } from '@root/dungeon/dungeon-arm'
import { DungeonConfigMainFactory } from '@root/dungeon/configs/main'
import { DungeonConfigSimpleFactory } from '@root/dungeon/configs/simple'

export interface DungeonConfigFactory {
    get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig>
}

export class DungeonBuilder {
    async build(id: string, seed: string,
        // configFactory: DungeonConfigFactory = new DungeonConfigSimpleFactory()
        configFactory: DungeonConfigFactory = new DungeonConfigMainFactory()
        ) {
        const dngPaths = new DungeonPaths(id)
        dngPaths.registerSelections()
        dngPaths.clearDir()

        const areaInfo: AreaInfo = new AreaInfo(dngPaths, 'Generated Dungeon', 'generic description, ' + dngPaths.nameAndId, 'DUNGEON', Vec2.createC(150, 70))
        
        const dngGenConfig: DungeonGenerateConfig = await configFactory.get(areaInfo, seed)
        console.log('dngGenConfig:', dngGenConfig)
 
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

        const flatEntries: (ArmRuntimeEntry & { arm: ArmRuntime })[] = flatOutArmTopDown(dngConfig.arm)

        await MapBuilder.placeBuilders(flatEntries)

        dngPaths.saveConfig()

        blitzkrieg.puzzleSelections.save()
        blitzkrieg.battleSelections.save()

        dngPaths.registerFiles()

        ig.game.varsChangedDeferred()

        const firstBuilder = flatEntries[dnggen.debug.roomTp].builder
        ig.game.teleport(firstBuilder.path!, ig.TeleportPosition.createFromJson({
            marker: firstBuilder.entarenceRoom.primaryEntarence.getTpr().name,
            level: 0,
            baseZPos: 0,
            size: {x: 0, y: 0}
        }))
        // AreaBuilder.openAreaViewerGui(areaInfo.name, flatEntries[0].builder.name!, 0)
    }
}

