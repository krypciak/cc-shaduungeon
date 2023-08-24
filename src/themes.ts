import { Tileset } from './util/map.js'

export type RoomThemeConfig = {
    bgm: string,
    tileset: Tileset,
    mapSounds: string,
    mapStyle: string,
    weather: string,
    floorTile: number,
    blackTile: number,
    wallUp: number[],
    wallDown: number[],
    wallRight: number[],
    wallLeft: number[],
    addShadows?: boolean,
    shadowTileset?: Tileset,
    wallUpShadow?: number[],
    wallDownShadow?: number[],
    wallRightShadow?: number[],
    wallLeftShadow?: number[],
    cornerShadowTopRight?: number[][],
    cornerShadowTopLeft?: number[][],
    cornerShadowBottomRight?: number[][],
    cornerShadowBottomLeft?: number[][],
    edgeShadowTopRight?: number[][],
    edgeShadowTopLeft?: number[][],
    edgeShadowBottomRight?: number[][],
    edgeShadowBottomLeft?: number[][],
    addLight?: boolean,
    lightTile?: number,
    lightStep?: number
}

export class RoomTheme {
    constructor(public config: RoomThemeConfig) { }
    
    getMapAttributes(areaName: string): sc.MapModel.MapAttributes {
        return { 
            bgm: this.config.bgm,
            "map-sounds": this.config.mapSounds,
            mapStyle: this.config.mapStyle,
            weather: this.config.weather,
            area: areaName,
            saveMode: 'ENABLED',
            cameraInBounds: false,
            npcRunners: ''
        }
    }

    static themes: Map<String, RoomTheme> = new Map([
        ['rhombus-dng', new RoomTheme({
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
                [171, 217]],
            cornerShadowTopLeft: [
                [200, 200],
                [201, 170]],
            cornerShadowBottomRight: [ 
                [187, 217],
                [216, 216]],
            cornerShadowBottomLeft: [ 
                [201, 186],
                [216, 216]],

            edgeShadowTopRight: [
                [185, 198],
                [166, 168]],
            edgeShadowBottomRight: [
                [182, 184],
                [185, 214]],
            edgeShadowTopLeft: [
                [197, 169],
                [168, 165]],
            edgeShadowBottomLeft: [
                [184, 181],
                [213, 169]],
        })],
        ['cold-dng', new RoomTheme({
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
        })],
    ])
    static default = (RoomTheme.themes.get('rhombus-dng') as RoomTheme)


    static getFromArea(areaName: string): RoomTheme {
        return (RoomTheme.themes.get(areaName) ?? RoomTheme.default) as RoomTheme
    }
}


