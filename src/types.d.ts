import { Mod } from 'ultimate-crosscode-typedefs/modloader/mod'

export {}

declare global {
    type Mod1 = {
        -readonly [K in keyof Mod]: Mod[K]
    } & ({
        isCCL3: true
        id: string
        findAllAssets(): void
    } | {
        isCCL3: false
        name: string
        filemanager: {
            findFiles(dir: string, exts: string[]): Promise<string[]>
        }
        getAsset(path: string): string
        runtimeAssets: Record<string, string>
    })

    namespace sc {
        interface NEW_GAME_OPTIONS {
            dnggen: sc.NewGameOption;
        }
    }
    namespace ig {
        interface Game {
            preloadLevel(this: this, mapName: string): void
        }
    }
}
