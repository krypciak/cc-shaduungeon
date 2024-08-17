export const Coll = {
    None: 0,
    Hole: 1,
    Wall: 2,
    Floor: 3,
} as const

export type MapTileset =
    | 'media/map/collisiontiles-16x16.png'
    | 'media/map/pathmap-tiles.png'
    | 'media/map/lightmap-tiles.png'
    | 'media/map/dungeon-shadow.png'
    | 'media/map/cold-dng.png'
    | 'media/map/rhombus-dungeon2.png'
