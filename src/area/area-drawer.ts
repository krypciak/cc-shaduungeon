import { ArmRuntime, flatOutArmTopDown } from '@root/dungeon/dungeon-arm'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { Room } from '@root/room/room'
import { TunnelRoom } from '@root/room/tunnel-room'
import { AreaPoint, Dir, MapPoint, Point, } from 'cc-map-util/pos'
import { AreaRect, MapRect, Rect } from 'cc-map-util/src/rect'

const canvasIndex = 0

export class CCCanvas {
    window?: Window
    div!: HTMLDivElement
    canvas!: HTMLCanvasElement
    ctx!: CanvasRenderingContext2D
    scale: number = 1
    visible: boolean = false
    color!: string

    htmlDiv: string
    divId: string
    htmlWindow: string
    canvasId: string

    constructor(public external: boolean) { 
        this.divId = `div_custon_canvas_${canvasIndex}`
        this.canvasId = `custon_canvas_${canvasIndex}`
        this.htmlDiv = `
            <div id="${this.divId}" style="
                position: absolute;
                top: 0%;
                left: 0%;
                width: 100%;
                height: 100%;
		    	background: rgba(33, 33, 33, 1);
		    	color: white;
                font-size: 150%;
                justify-content: center;
                align-items: center;
            ">
                <canvas id="${this.canvasId}" style="
                    display: block;
                    ${external ? "" : "width: 100%; height: 100%;"}
                "></canvas>
            </div> 
        `

        this.htmlWindow = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Canvas</title>
            </head>
            <body>
                ${this.htmlDiv}
            </body>
            </html>
         `
    }

    initWindow() {
        if (this.window) {
            this.hide()
            this.window = undefined
        }
        this.window = window.open("", "_blank")!
        this.window.document.write(this.htmlWindow)

        this.div = this.window.document.getElementById(this.divId) as HTMLDivElement
        this.canvas = this.window.document.getElementById(this.canvasId) as HTMLCanvasElement

        this.window.document.close()
        window.addEventListener('beforeunload', () => {
            this.hide()
        })
    }

    resizeEvent() {
    }

    initInternal() {
        document.body.insertAdjacentHTML('beforeend', this.htmlDiv)
        this.div = document.getElementById(this.divId) as HTMLDivElement
        this.canvas = document.getElementById(this.canvasId) as HTMLCanvasElement
    }

    hide() {
        this.visible = false
        if (this.external) {
            this.window!.close()
        } else {
            this.div.style.display = 'none'
        }
    }

    show() {
        if (this.external) {
            this.initWindow()
            this.canvas.width = 5000
            this.canvas.height = 2000
        } else {
            this.initInternal()
            this.canvas.width = this.canvas.clientWidth
            this.canvas.height = this.canvas.clientHeight
        }
        this.visible = true
    }
    
    clear(newPos: Point = new Point(this.canvas.width / this.scale, this.canvas.height / this.scale)) {
        this.canvas.width = newPos.x * this.scale
        this.canvas.height = newPos.y * this.scale
        this.setColor('white')
        const ctx = this.canvas.getContext('2d')!
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    setColor(color: string) {
        this.color = color
        const ctx = this.canvas.getContext('2d')!
        ctx.fillStyle = color
        ctx.strokeStyle = color
    }

    drawRect(rect: Rect, bgColor?: string) {
        const ctx = this.canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.lineWidth = this.scale
        const r: Rect = new Rect(
            rect.x*this.scale,
            rect.y*this.scale,
            rect.width*this.scale,
            rect.height*this.scale,
        )
        ctx.strokeRect(r.x, r.y, r.width, r.height)

        if (bgColor) {
            Vec2.addC(r, ctx.lineWidth/2)
            r.width -= ctx.lineWidth
            r.height -= ctx.lineWidth
            const colorBackup = this.color
            this.setColor(bgColor)
            ctx.fillRect(r.x, r.y, r.width, r.height)
            this.setColor(colorBackup)
        }
    }
    
    drawArrow(pos: Point, dir: Dir) {
        const ctx = this.canvas.getContext('2d')!
        ctx.beginPath()
        pos = new Point(pos.x, pos.y)
        Vec2.mulF(pos, this.scale, pos)
        ctx.moveTo(pos.x, pos.y)

        const num: number = 2*this.scale
        switch (dir) {
            case Dir.NORTH:
                ctx.lineTo(pos.x - num, pos.y + num*2)
                ctx.lineTo(pos.x + num, pos.y + num*2)
                break
            case Dir.EAST:
                ctx.lineTo(pos.x - num*2, pos.y - num)
                ctx.lineTo(pos.x - num*2, pos.y + num)
                break
            case Dir.SOUTH:
                ctx.lineTo(pos.x - num, pos.y - num*2)
                ctx.lineTo(pos.x + num, pos.y - num*2)
                break
            case Dir.WEST:
                ctx.lineTo(pos.x + num*2, pos.y - num)
                ctx.lineTo(pos.x + num*2, pos.y + num)
                break
        }

        ctx.closePath()
        ctx.fill()
    }

    drawText(pos: Point, str: string) {
        const ctx = this.canvas.getContext('2d')!
        ctx.font = `${5*this.scale}px Arial`
        ctx.fillText(str, pos.x * this.scale, pos.y * this.scale)
    }

    copyToClipboard() {
        const copy = () => {
            const dataURL = this.canvas.toDataURL('image/png');
            (this.external ? this.window!.navigator : navigator).clipboard.writeText(dataURL).then(() => {
                console.log('Image copied to clipboard')
            })
            .catch((error) => {
                console.error('Error copying image to clipboard:', error)
            })
        }
        if (this.window) { 
            this.window.focus()
            this.window.addEventListener('focus', copy)
        } else {
            copy() 
        }
    }
}


export class AreaDrawer extends CCCanvas {
    static colorList: string[] = [ 'black', 'blue', ]
    colorIndex: number = 0
    scale: number = 4
    
    constructor() {
        super(true)
    }

    nextColor() {
        this.colorIndex++
        if (this.colorIndex >= AreaDrawer.colorList.length) {
            this.colorIndex = 0
        }
        this.setColor(AreaDrawer.colorList[this.colorIndex])
    }

    drawRect(rect: Rect, bgColor?: string) {
        super.drawRect(rect.to(MapRect), bgColor)
    }

    static getBgColorFromRoom(room: Room): string {
        if (room instanceof TunnelRoom) {
            if (room.exitDir !== null) {
                return '#00ff0066'
            } else {
                return '#ff000066'
            }
        }
        return '#00000000'
    }

    drawArea(dngConfig: DungeonGenerateConfig<ArmRuntime>, size: AreaPoint) {
        if (! dngConfig.arm) { return }
        this.show()
        this.colorIndex = 0

        this.clear(size.to(MapPoint))

        const startColor = this.color
        const colorIndex = this.colorIndex
        const arr = flatOutArmTopDown(dngConfig.arm)
        for (let i = 0; i < arr.length; i++) {
            const e = arr[i].entry
            this.nextColor()
            for (let i = 0; i < e.areaRects.length; i++) {
                const rect = e.areaRects[i]
                // copy the rect
                const drawRect = rect.to(AreaRect)
                this.drawRect(drawRect, AreaDrawer.getBgColorFromRoom(e.rooms[i]))
            }
        }
        this.colorIndex = colorIndex
        this.setColor(startColor)
        for (let i = 0; i < arr.length; i++) {
            const e = arr[i].entry
            this.nextColor()
            for (const exit of Array.isArray(e.lastExit) ? e.lastExit : [e.lastExit]) {
                this.drawArrow(exit.to(MapPoint), exit.dir)

                const pos = AreaPoint.fromVec(e.areaRects[0]); Vec2.addC(pos, 0.4, 1)
                this.drawText(pos.to(MapPoint), i.toString())
            }
        }
    }
}
