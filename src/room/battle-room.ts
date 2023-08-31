import { Blitzkrieg } from '../util/blitzkrieg'
import { MapPoint, MapRect } from '../util/pos'
import { Room } from './room'

declare const blitzkrieg: Blitzkrieg

export class BattleRoom extends Room {
    constructor(pos: MapPoint, size: MapPoint,
        public startCondition: string,
        public doneCondition: string,
    ) {
        super('battle', MapRect.fromTwoPoints(pos, size), [true, true, true, true])
    }
}
