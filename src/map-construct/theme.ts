import { MapTileset } from '../util/map'

export type MapThemeConfig = {
    bgm: string
    tileset: MapTileset
    mapSounds: string
    mapStyle: string
    weather: string
    floorTile: number
    blackTile: number
    wallUp: number[]
    wallDown: number[]
    wallRight: number[]
    wallLeft: number[]
} & (
    | {
          addShadows?: false
      }
    | {
          addShadows: true
          shadowTileset: MapTileset
          wallUpShadow: number[]
          wallDownShadow: number[]
          wallRightShadow: number[]
          wallLeftShadow: number[]
          cornerShadowTopRight: number[][]
          cornerShadowTopLeft: number[][]
          cornerShadowBottomRight: number[][]
          cornerShadowBottomLeft: number[][]
          edgeShadowTopRight: number[][]
          edgeShadowTopLeft: number[][]
          edgeShadowBottomRight: number[][]
          edgeShadowBottomLeft: number[][]
      }
) &
    (
        | {
              addLight?: false
          }
        | {
              addLight: true
              lightTile: number
              lightStep: number
          }
    )

export class MapTheme {
    constructor(public config: MapThemeConfig) {}

    getMapAttributes(areaName: string): sc.MapModel.MapAttributes {
        return {
            bgm: this.config.bgm,
            'map-sounds': this.config.mapSounds,
            mapStyle: this.config.mapStyle,
            weather: this.config.weather,
            area: areaName,
            saveMode: 'ENABLED',
            cameraInBounds: false,
            npcRunners: '',
        }
    }

    static themes = {
        'rhombus-dng': new MapTheme({
            bgm: 'puzzle',
            mapSounds: '',
            tileset: 'media/map/rhombus-dungeon2.png',
            mapStyle: 'rhombus-puzzle',
            weather: 'RHOMBUS_DUNGEON',
            floorTile: 34,
            blackTile: 6,

            addShadows: true,
            shadowTileset: 'media/map/dungeon-shadow.png',

            addLight: true,
            lightTile: 18,
            lightStep: 6,
            wallUp: [0, 0, 169, 137, 105, 137, 105, 105, 38],
            wallUpShadow: [168, 200, 168, 97, 81, 65, 49, 33, 17],
            wallRight: [0, 0, 6],
            wallRightShadow: [185, 217, 0],
            wallDown: [0, 0, 296],
            wallDownShadow: [184, 216, 0],
            wallLeft: [6, 0, 0],
            wallLeftShadow: [0, 201, 169],
            cornerShadowTopRight: [
                [200, 200],
                [171, 217],
            ],
            cornerShadowTopLeft: [
                [200, 200],
                [201, 170],
            ],
            cornerShadowBottomRight: [
                [187, 217],
                [216, 216],
            ],
            cornerShadowBottomLeft: [
                [201, 186],
                [216, 216],
            ],

            edgeShadowTopRight: [
                [185, 198],
                [166, 168],
            ],
            edgeShadowBottomRight: [
                [182, 184],
                [185, 214],
            ],
            edgeShadowTopLeft: [
                [197, 169],
                [168, 165],
            ],
            edgeShadowBottomLeft: [
                [184, 181],
                [213, 169],
            ],
        }),
        'cold-dng': new MapTheme({
            bgm: 'coldDungeon',
            mapSounds: 'COLD_DUNGEON',
            tileset: 'media/map/cold-dng.png',
            mapStyle: 'cold-dng',
            weather: 'COLD_DUNGEON',
            floorTile: 156,
            blackTile: 135,

            addShadows: false,

            addLight: true,
            lightTile: 3,
            lightStep: 6,
            wallUp: [0, 0, 366, 334, 302, 334, 302, 275, 243],
            wallRight: [0, 0, 135],
            wallDown: [0, 0, 147],
            wallLeft: [135, 0, 0],
        }),
    } as const satisfies Record<string, MapTheme>
    static default: MapTheme = MapTheme.themes['rhombus-dng']

    static fromArea(areaName: string): MapTheme {
        if (areaName in MapTheme.themes) {
            return MapTheme.themes[areaName as keyof typeof MapTheme.themes]
        } else {
            return MapTheme.default
        }
    }
}
