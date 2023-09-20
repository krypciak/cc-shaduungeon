import { AreaPoint } from '@root/util/pos'
import { AreaBuilder, AreaInfo } from '@root/area/area-builder'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { DungeonArranger, DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { MapBuilder } from '@root/room/map-builder'
import { flatOutArmTopDown } from './dungeon-arm'
import { DungeonConfigSimpleFactory } from './configs/simple'

export interface DungeonConfigFactory {
    get(areaInfo: AreaInfo, seed: string): DungeonGenerateConfig
}

export class DungeonBuilder {
    async build(id: string, seed: string, configFactory: DungeonConfigFactory = new DungeonConfigSimpleFactory()) {
        const dngPaths = new DungeonPaths(id)
        dngPaths.registerSelections()
        dngPaths.clearDir()

        const areaInfo: AreaInfo = new AreaInfo(dngPaths, 'Generated Dungeon', 'generic description, ' + dngPaths.nameAndId, 'DUNGEON', Vec2.createC(150, 70))
        
        // const dngGenConfig: DungeonGenerateConfig = getSimpleConfig(areaInfo, seed)
        const dngGenConfig: DungeonGenerateConfig = configFactory.get(areaInfo, seed)
 
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

