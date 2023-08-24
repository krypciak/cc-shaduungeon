import { ABStackEntry } from "./area-builder"
import { Stack } from "./util/misc"
import { AreaPoint, AreaRect, Dir, DirUtil, MapPoint, MapRect, Point, Rect } from "./util/pos"

const canvasIndex = 0

export class CCCanvas {
    window?: Window
    div!: HTMLDivElement
    canvas!: HTMLCanvasElement
    ctx!: CanvasRenderingContext2D
    scale: number = 1
    offset: Point = new Point(0, 0)
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
    
    clear() {
        this.setColor('white')
        const ctx = this.canvas.getContext('2d')!
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    setColor(color: string) {
        this.color = color
        this.canvas.getContext('2d')!.fillStyle = color
        this.canvas.getContext('2d')!.strokeStyle = color
    }

    drawRect(rect: Rect) {
        const ctx = this.canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.lineWidth = this.scale
        ctx.strokeRect(
            (rect.x+this.offset.x)*this.scale,
            (rect.y+this.offset.y)*this.scale,
            rect.width*this.scale,
            rect.height*this.scale)
    }
    
    drawArrow(pos: Point, dir: Dir) {
        const ctx = this.canvas.getContext('2d')!
        ctx.beginPath()
        pos = new Point(pos.x, pos.y)
        Vec2.add(pos, this.offset)
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

    copyToClipboard() {
        const dataURL = this.canvas.toDataURL('image/png');
        (this.external ? this.window!.navigator : navigator).clipboard.writeText(dataURL).then(() => {
            console.log('Image copied to clipboard')
        })
        .catch((error) => {
            console.error('Error copying image to clipboard:', error)
        })
    }
}


export class AreaDrawer extends CCCanvas {
    static colorList: string[] = [ 'black', 'blue', 'purple', 'pink', 'brown', ]
    colorIndex: number = 0
    scale: number = 6
    
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

    drawRect(rect: Rect) {
        super.drawRect(rect.to(MapRect))
    }

    async drawArea(stack: Stack<ABStackEntry>) {
        this.show()
        this.colorIndex = 0
        const minPos: AreaPoint = new AreaPoint(10000, 10000)
        for (const obj of stack.array) {
            for (const rect of obj.rects) {
                if (rect.x < minPos.x) { minPos.x = rect.x }
                if (rect.y < minPos.y) { minPos.y = rect.y }
            }
        }
        minPos.x -= 5
        minPos.y -= 5

        const drawLater: (() => void)[] = []
        this.clear()
        for (const obj of stack.array) {
            this.nextColor()
            for (const rect of obj.rects) {
                // copy the rect
                const drawRect = rect.to(AreaRect)
                Vec2.sub(drawRect, minPos)
                this.drawRect(drawRect)
            }
            const exitCopy = obj.exit.copy()
            Vec2.sub(exitCopy, minPos)
            const color = this.color
            drawLater.push(() => {
                this.setColor(color)
                this.drawArrow(exitCopy.to(MapPoint), DirUtil.flip(obj.exitDir))
            })
        }
        for (const func of drawLater) { func() }


    }
}
