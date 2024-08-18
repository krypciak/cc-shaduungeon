import './setup-test'

import { DungeonBuilder } from './dungeon/builder'
import { initLibraries } from './library-providers'
;(async () => {
    await initLibraries()

    const b = new DungeonBuilder()
    b.build('das')
})()
// const b = new Test_DungeonBuilder()
// b.samePlaceFail()
