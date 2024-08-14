import './setup'
import './util/modify-prototypes'

import { alea } from 'seedrandom'
Math.seedrandomSeed = (seed: string) => {
    Math.randomSeed = alea(seed)
}

import { Mod1 } from 'cc-blitzkrieg/src/types'
import DngGen from './plugin'

new DngGen({
    baseDirectory: 'assets/mods/cc-shaduungeon',
    findAllAssets: true as any,
} as unknown as Mod1)
