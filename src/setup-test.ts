Array.prototype.flat = undefined as any
Array.prototype.flatMap = undefined as any

import { Mod1 } from 'cc-blitzkrieg/src/types'
import DngGen from './plugin'

new DngGen({
    baseDirectory: 'assets/mods/cc-shaduungeon',
    findAllAssets: true as any,
} as unknown as Mod1)

// import { Test_DungeonQueue } from './dungeon/build-queue.spec'
// const a = new Test_DungeonQueue()
// a.dataMergeSomeFail()
// a.maze(
//     [
//         // prettier-ignore
//         '#########',
//         '#       #',
//         '### ## ##',
//         '#*#  #  #',
//         '#########',
//     ],
//     null
// )
