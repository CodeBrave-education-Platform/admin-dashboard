/**
 * Client-Side Canvas Cropper: For use in browser environments (UniversalPdfImporterModal)
 * @param {HTMLCanvasElement} canvas - The rendered PDF page canvas
 * @param {Array<number>} box2d - [ymin, xmin, ymax, xmax] (0-1000 scale)
 * @returns {string} Data URL of the cropped region
 */
export function cropCanvasDiagram(canvas, box2d) {
  if (typeof window === 'undefined' || !canvas || !Array.isArray(box2d) || box2d.length < 4) {
    return '';
  }

  try {
    const [ymin, xmin, ymax, xmax] = box2d;
    const width = canvas.width;
    const height = canvas.height;

    const sx = Math.max(0, Math.floor((xmin / 1000) * width));
    const sy = Math.max(0, Math.floor((ymin / 1000) * height));
    const sWidth = Math.min(width - sx, Math.max(1, Math.ceil(((xmax - xmin) / 1000) * width)));
    const sHeight = Math.min(height - sy, Math.max(1, Math.ceil(((ymax - ymin) / 1000) * height)));

    if (sWidth < 15 || sHeight < 15) return '';

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sWidth;
    cropCanvas.height = sHeight;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    return cropCanvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('[DiagramCropperClient] Canvas crop error:', err);
    return '';
  }
}
