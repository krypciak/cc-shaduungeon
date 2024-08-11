Array.prototype.flat = undefined as any
Array.prototype.flatMap = undefined as any

import { Mod1 } from 'cc-blitzkrieg/src/types'
import DngGen from '../plugin'

new DngGen({
    baseDirectory: 'assets/mods/cc-shaduungeon',
    findAllAssets: true as any,
} as unknown as Mod1)
