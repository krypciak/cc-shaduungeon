import { Dir, Point, } from 'cc-map-util/src/pos'
import { Selection } from 'cc-blitzkrieg/selection'
import { EntityRect, Rect } from 'cc-map-util/src/rect'

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

export function round(num: number): number {
    if (Math.ceil(num) - num < 0.3) { return Math.ceil(num) }
    return Math.floor(num)
}

export function deepCopy<T>(obj: T, ignoreSet: Set<string> = new Set(), seen = new WeakMap()): T {
    if (Array.isArray(obj)) {
        const arr = obj.map(e => deepCopy(e, ignoreSet, seen)) as T
        seen.set(obj, arr)
        return arr
    }
    if (obj === null || typeof obj !== 'object' || typeof obj === 'function') { return obj }

    /* Handle circular references */
    if (seen.has(obj)) {
        return seen.get(obj)
    }

    /* Create a new object with the same prototype as the original */
    const newObj: T = Object.create(Object.getPrototypeOf(obj))

    /* Add the new object to the seen map to handle circular references */
    seen.set(obj, newObj)

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            let badKey: boolean = false
            for (const ignoreKey of ignoreSet) {
                if (key === ignoreKey) { badKey = true; break }
            }
            newObj[key] = badKey ? obj[key] : deepCopy(obj[key], ignoreSet, seen)
        }
    }
    return newObj
}

export function shallowCopy<T>(obj: T): T {
    if (Array.isArray(obj)) { return [...obj] as T }
    if (obj === null || typeof obj !== 'object' || typeof obj === 'function') { return obj }

    const newObj: T = Object.create(Object.getPrototypeOf(obj))

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            newObj[key] = obj[key]
        }
    }
    return newObj
}

export function setRandomSeed(obj: { toString(): string }) {
    Math.seedrandomSeed(obj.toString())
}

export function randomSeedInt(min: number, max: number) {
    return Math.floor(Math.randomSeed() * (max + 1 - min) + min)
}

export function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array]

    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.randomSeed() * (i + 1))
        ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }

    return newArray
}

export function godlikeStats() {
    sc.model.player.setSpLevel(4)
    sc.model.player.setLevel(99)
    sc.model.player.equip = {head:657,leftArm:577,rightArm:607,torso:583,feet:596}
    for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 200 }
    for (let i = 0; i < 400; i++) { sc.model.player.learnSkill(i) }
    for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 0 }
    sc.model.player.updateStats()
}

export function setToClosestSelSide(pos: Vec2, sel: Selection): { distance: number, dir: Dir, pos: Vec2 } {
    let minObj: { distance: number, dir: Dir, pos: Vec2 } = { distance: 10000, dir: 0, pos: new Point(0, 0) }
    for (let rect of sel.bb) {
        const obj = Rect.new(EntityRect, rect).setToClosestRectSide({ x: pos.x, y: pos.y })
        if (obj.distance < minObj.distance) {
            minObj = obj
        }
    }
    pos.x = minObj.pos.x
    pos.y = minObj.pos.y
    return minObj
}
