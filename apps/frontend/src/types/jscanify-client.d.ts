declare module 'jscanify/client' {
  type CornerPoint = {
    x: number;
    y: number;
  };

  type CornerPoints = {
    topLeftCorner?: CornerPoint;
    topRightCorner?: CornerPoint;
    bottomLeftCorner?: CornerPoint;
    bottomRightCorner?: CornerPoint;
  };

  export default class Jscanify {
    highlightPaper(
      image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
      options?: { color?: string; thickness?: number }
    ): HTMLCanvasElement;

    extractPaper(
      image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
      resultWidth: number,
      resultHeight: number,
      cornerPoints?: CornerPoints
    ): HTMLCanvasElement | null;

    findPaperContour(image: unknown): unknown;
    getCornerPoints(contour: unknown): CornerPoints;
  }
}
