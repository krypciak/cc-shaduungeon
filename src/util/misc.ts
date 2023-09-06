import { Blitzkrieg, Selection } from './blitzkrieg'

declare const blitzkrieg: Blitzkrieg

export class Stack<T> {
    array: T[] = []

    constructor(array: T[] = []) {
        this.array = [...array]
    }

    push(element: T) {
        this.array.push(element)
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

export function addSel(mapName: string, sel: Selection, fileIndex: number) {
    blitzkrieg.puzzleSelections.setSelHashMapEntry(mapName, {
        sels: [ sel ],
        fileIndex,
    })
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

export function godlikeStats() {
    sc.model.player.setSpLevel(4)
    sc.model.player.setLevel(99)
    sc.model.player.equip = {head:657,leftArm:577,rightArm:607,torso:583,feet:596}
    for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 200 }
    for (let i = 0; i < 400; i++) { sc.model.player.learnSkill(i) }
    for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 0 }
    sc.model.player.updateStats()
}
