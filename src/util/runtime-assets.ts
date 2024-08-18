import DngGen from '../plugin'

export class RuntimeResources {
    private static assets: Record<string, string> = {}
    private static everAdded: Set<string> = new Set()

    static add(dest: string, from: string) {
        RuntimeResources.assets[dest] = from
        this.everAdded.add(dest)
    }

    static reload() {
        if (!('window' in global)) return

        if (DngGen.mod.isCCL3) {
            for (const asset of this.everAdded) {
                ccmod.resources.assetOverridesTable.delete(asset)
            }
            Object.entries(this.assets).forEach(([k, v]) => {
                ccmod.resources.assetOverridesTable.set(k, v)
            })
        } else {
            DngGen.mod.runtimeAssets = this.assets
        }
    }
}
