export class Stack<T> {
    array: T[] = []

    constructor(array: T[] = []) {
        this.array = [...array]
    }

    push(elements: T) {
        this.array.push(elements)
    }
    pop(): T {
        return this.array.splice(this.array.length - 1, 1)[0]
    }
    peek(): T {
        return this.array.last()
    }
    shift(): T | undefined {
        return this.array.shift()
    }
    length(): number {
        return this.array.length
    }
}


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

export function assert(arg: any, msg: string = ''): asserts arg {
    if (arg != 0 && ! arg) {
        throw new Error(`Assertion failed: ${msg}`)
    }
}

export function assertBool(arg: boolean, msg: string = ''): asserts arg {
    if (! arg) {
        throw new Error(`Assertion failed: ${msg}`)
    }
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

export function setRandomSeed(obj: { toString(): string }) {
    Math.seedrandomSeed(obj.toString())
}

export function randomSeedInt(min: number, max: number) {
    return Math.floor(Math.randomSeed() * (max - min) + min)
}

export function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array]

    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.randomSeed() * (i + 1));

        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
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
