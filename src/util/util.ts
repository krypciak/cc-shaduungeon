import { Vec2 } from './vec2'

export function assert(v: any, msg?: string): asserts v {
    if (!v) {
        throw new Error(`Assertion error${msg ? `: ${msg}` : ''}`)
    }
}

export function merge<T, U>(original: T, extended: U): T & U {
    const orig = original as any
    for (const key in extended) {
        const val = extended[key]
        if (!orig[key] || !val || typeof val != 'object') {
            if (Array.isArray(val)) {
                orig[key] = [...val]
            } else {
                orig[key] = val
            }
        } else {
            if (Array.isArray(orig[key])) {
                if (Array.isArray(val)) {
                    orig[key].push(...val)
                    continue
                } else {
                    throw new Error('cannot merge an array and a non array!')
                }
            }

            merge(orig[key], val)
        }
    }
    return orig
}

export namespace Array2d {
    export function empty<T>(size: Vec2, fill: T): T[][] {
        return Array.from(new Array(size.y), () => new Array(size.x).fill(fill))
    }
    export function pasteInto<T>(arr1: T[][], arr2: T[][], x1: number, y1: number) {
        for (let y = y1; y < y1 + arr2.length; y++) {
            for (let x = x1; x < x1 + arr2[y - y1].length; x++) {
                arr1[y][x] = arr2[y - y1][x - x1]
            }
        }
    }
    export function isEmpty<T>(arr: T[][]) {
        for (let y = 0; y < arr.length; y++) {
            for (let x = 0; x < arr[y].length; x++) {
                if (arr[y][x] != 0) return false
            }
        }
        return true
    }
}

export function shuffleArray<T>(arr: T[] | readonly T[]): T[] {
    return arr
        .map(value => ({ value, sort: random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
}

declare global {
    interface Math {
        seedrandomSeed(seed: string): void
        randomSeed(): number
    }
}

export function setRandomSeed(seed: string) {
    Math.seedrandomSeed(seed)
}
export function random(): number {
    return Math.randomSeed()
}

export function randomInt(min: number, max: number): number {
    return (random() * (max - min) + min) >>> 0
}

import * as crypto from 'crypto'
export function sha256(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex')
}
// export type PickPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

let langUid = 30000
export function allLangs(text: string): ig.LangLabel.Data {
    return {
        en_US: text,
        de_DE: text,
        ja_JP: text,
        zh_CN: text,
        ko_KR: text,
        zh_TW: text,
        langUid: langUid++,
    }
}
