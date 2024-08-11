import type { Options } from 'ccmodmanager/types/mod-options'

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
            modId: dnggen.manifset.id,
            title: dnggen.manifset.title,
        },
        opts
    )
    return opts
}
