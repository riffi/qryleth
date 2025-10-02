declare module 'isosurface' {
  export function marchingCubes(
    dims: [number, number, number],
    sdf: (x: number, y: number, z: number) => number,
    bounds?: [[number, number, number], [number, number, number]]
  ): {
    positions: [number, number, number][]
    cells: [number, number, number][]
  }
}

