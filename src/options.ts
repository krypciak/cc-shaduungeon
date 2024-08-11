import type { Options } from 'ccmodmanager/types/mod-options'
import DngGen from './plugin'

export let Opts: ReturnType<typeof modmanager.registerAndGetModOptions<ReturnType<typeof registerOpts>>>

export function registerOpts() {
    const opts = {
        general: {
            settings: {
                title: 'General',
                tabIcon: 'general',
            },
            headers: {
                general: {},
            },
        },
    } as const satisfies Options

    Opts = modmanager.registerAndGetModOptions(
        {
            modId: DngGen.manifset.id,
            title: DngGen.manifset.title,
        },
        opts
    )
    return opts
}
