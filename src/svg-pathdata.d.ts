// Version 6.0.3 ships declarations but omits them from its package export map.
// Reuse those declarations rather than weakening the command types to `any`.
declare module 'svg-pathdata' {
  export const SVGPathData: typeof import('../node_modules/svg-pathdata/lib/SVGPathData').SVGPathData;
}
