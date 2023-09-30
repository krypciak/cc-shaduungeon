import { AreaInfo } from "@root/area/area-builder";
import { ArmItemType } from "@root/dungeon/dungeon-arm";
import { MapChest } from "@root/util/entity";
import { EntityPoint } from "@root/util/pos";

export enum Item {
    FajroKey = 146,
    FajroKeyMaster = 147,
    MineMasterKey = 153,
    ThiefsKey = 154,
    WhiteKey = 155,
    RadiantKey = 156,
    ZirvitarKey = 272,
    SonajizKey = 319,
    KryskajoKey = 349,
    KryskajoMasterKey = 350,
    KuleroKey = 560,
    KuleroMasterKey = 624,

    BlazingBun = 66,
}

export class ItemHandler {
    static get(areaInfo: AreaInfo, type: ArmItemType, name: string, pos: EntityPoint, level: number, spawnCondition: string | undefined): MapChest {
        let itemId: number
        let chestType: keyof typeof sc.CHEST_TYPE
        switch (type) {
            case ArmItemType.DungeonKey:
                chestType = 'Key'
                itemId = areaInfo.keyItem
                break
            case ArmItemType.DungeonMasterKey:
                chestType = 'MasterKey'
                itemId = areaInfo.masterKeyItem
                break
            case ArmItemType.Tresure:
                chestType = 'Default'
                itemId = Item.BlazingBun
                break
            default: throw new Error('not implemented')
        }
        return MapChest.new(pos, level, name, chestType, itemId, spawnCondition, 1)
    }
}
