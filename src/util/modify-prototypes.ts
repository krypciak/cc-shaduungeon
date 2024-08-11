/* in preload */
export {}
declare global {
    interface Object {
        fromEntries<T, K extends string | number | symbol>(entries: [K, T][]): Record<K, T>
    }
    interface Array<T> {
        flat(): T extends Array<any> ? T : T[]
        flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[], thisArg?: this | undefined): U[]
    }
}

if (!Object.fromEntries) {
    Object.fromEntries = function <T, K extends string | number | symbol>(entries: [K, T][]): Record<K, T> {
        return entries.reduce(
            (acc: Record<K, T>, e: [K, T]) => {
                acc[e[0]] = e[1]
                return acc
            },
            {} as Record<K, T>
        )
    }
}

if (!Array.prototype.flat) {
    Array.prototype.flat = function <T>(this: T[][]): T[] {
        return this.reduce((acc, val) => acc.concat(val), [])
    }
}

if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (callback) {
        return this.map(callback).flat()
    }
}

if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length - 1]
    }
}

export const ObjectKeysT: <K extends string | number | symbol, V>(object: Record<K, V>) => K[] = Object.keys as any
export const ObjectEntriesT: <K extends string | number | symbol, V>(object: { [key in K]?: V }) => [K, V][] =
    Object.entries as any
export const StringToLowerCaseT: <T extends string>(string: T) => Lowercase<T> = str => str.toLowerCase() as any
