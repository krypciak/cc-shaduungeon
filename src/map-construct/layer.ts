import { MapThemeConfig } from "../map-construct/theme"
import { Coll } from "../util/map"
import { Array2d } from "../util/util"

export interface MapConstructionLayers {
    background: number[][][]
    shadow: number[][]
    light: number[][]
    coll: number[][][]
    nav: number[][][]
}

export function emptyLayer(
    size: Vec2,
    fill: number,
    rest: Pick<sc.MapModel.MapLayer, 'type' | 'name' | 'tilesetName' | 'level'>
): sc.MapModel.MapLayer {
    return {
        visible: 1,
        repeat: false,
        distance: 1,
        yDistance: 0,
        tilesize: 16,
        moveSpeed: { x: 0, y: 0 },
        lighter: false,
        id: -10,

        data: Array2d.empty(size, fill),
        width: size.x,
        height: size.y,
        ...rest,
    }
}

export function getEmptyLayers(
    size: Vec2,
    levelCount: number,
    theme: MapThemeConfig
): { layers: MapConstructionLayers; levels: sc.MapModel.Map['levels']; layer: sc.MapModel.MapLayer[] } {
    const layer: sc.MapModel.MapLayer[] = []
    const levels: sc.MapModel.Map['levels'] = []

    let background: number[][][] = [],
        shadow: number[][] = [],
        coll: number[][][] = [],
        nav: number[][][] = []

    for (let level = 0; level < levelCount; level++) {
        levels.push({ height: level * 16 * 2 })

        const backgroundLayer = emptyLayer(size, level == 0 ? theme.blackTile : 0, {
            type: 'Background',
            name: 'NEW_BACKGROUND',
            tilesetName: theme.tileset,
            level,
        })

        background.push(backgroundLayer.data)
        layer.push(backgroundLayer)

        if (level == 0 && theme.addShadows) {
            const shadowLayer = emptyLayer(size, 0, {
                name: 'NEW_SHADOW',
                type: 'Background',
                tilesetName: theme.shadowTileset,
                level,
            })
            shadow = shadowLayer.data
            layer.push(shadowLayer)
        }
        const collisionLayer = emptyLayer(size, Coll.Wall, {
            name: 'NEW_COLLISION',
            type: 'Collision',
            tilesetName: 'media/map/collisiontiles-16x16.png',
            level,
        })
        coll.push(collisionLayer.data)
        layer.push(collisionLayer)

        const navigationLayer = emptyLayer(size, 0, {
            name: 'NEW_NAVIGATION',
            type: 'Navigation',
            tilesetName: 'media/map/pathmap-tiles.png',
            level,
        })
        nav.push(navigationLayer.data)
        layer.push(navigationLayer)
    }

    const lightLayer = emptyLayer(size, 0, {
        name: 'NEW_LIGHT',
        type: 'Light',
        tilesetName: 'media/map/lightmap-tiles.png',
        level: 'last',
    })
    const light: number[][] = lightLayer.data
    layer.push(lightLayer)

    return {
        layers: {
            background,
            shadow,
            light,
            coll,
            nav,
        },
        levels,
        layer,
    }
}
