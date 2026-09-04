import { createClient } from '@supabase/supabase-js';

/**
 * Diagram Bounding Box Cropper & Supabase Storage Integration
 * Supports server-side cropping with sharp and client-side canvas cropping.
 * Target Bucket: 'question-papers'
 */

// Initialize server-side Supabase client for storage
function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

/**
 * Crops a diagram region from an image buffer or base64 string using sharp (Node.js server-side)
 * @param {Buffer|string} imageInput - Buffer or base64 data URL / raw base64 string
 * @param {Array<number>} box2d - Normalized bounding box [ymin, xmin, ymax, xmax] (0 to 1000 scale)
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, dataUrl: string } | null>}
 */
export async function cropImageBuffer(imageInput, box2d) {
  if (!imageInput || !Array.isArray(box2d) || box2d.length < 4) {
    return null;
  }

  try {
    // Dynamic require/import sharp for server-side execution
    let sharp;
    try {
      sharp = (await import('sharp')).default || (await import('sharp'));
    } catch (_sharpErr) {
      try {
        sharp = require('sharp');
      } catch (_reqErr) {
        console.warn('[DiagramCropper] sharp module not available for server-side crop');
        return null;
      }
    }

    let inputBuffer;
    if (Buffer.isBuffer(imageInput)) {
      inputBuffer = imageInput;
    } else if (typeof imageInput === 'string') {
      const cleanBase64 = imageInput.replace(/^data:[^;]+;base64,/, '').trim();
      inputBuffer = Buffer.from(cleanBase64, 'base64');
    } else {
      return null;
    }

    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const origWidth = metadata.width || 1000;
    const origHeight = metadata.height || 1000;

    let [ymin, xmin, ymax, xmax] = box2d;
    // Sanitize bounds
    ymin = Math.max(0, Math.min(1000, Number(ymin) || 0));
    xmin = Math.max(0, Math.min(1000, Number(xmin) || 0));
    ymax = Math.max(ymin, Math.min(1000, Number(ymax) || 1000));
    xmax = Math.max(xmin, Math.min(1000, Number(xmax) || 1000));

    const left = Math.max(0, Math.floor((xmin / 1000) * origWidth));
    const top = Math.max(0, Math.floor((ymin / 1000) * origHeight));
    const width = Math.min(origWidth - left, Math.max(1, Math.ceil(((xmax - xmin) / 1000) * origWidth)));
    const height = Math.min(origHeight - top, Math.max(1, Math.ceil(((ymax - ymin) / 1000) * origHeight)));

    // Ignore microscopic boxes (< 15px)
    if (width < 15 || height < 15) {
      return null;
    }

    const croppedBuffer = await image
      .extract({ left, top, width, height })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${croppedBuffer.toString('base64')}`;

    return {
      buffer: croppedBuffer,
      width,
      height,
      dataUrl
    };
  } catch (err) {
    console.error('[DiagramCropper] Error cropping image buffer:', err);
    return null;
  }
}

/**
 * Uploads a diagram buffer to Supabase Storage bucket 'question-papers'
 * Path: diagrams/${Date.now()}_q${qNum}.png or diagrams/${docId}/q_${qNum}_${Date.now()}.jpg
 * @param {Buffer|string|Uint8Array} bufferOrBase64 - Cropped image buffer or base64 string
 * @param {Object} options - { docId, qNum, contentType }
 * @returns {Promise<string>} Public URL or data URL fallback
 */
export async function uploadDiagramToStorage(bufferOrBase64, options = {}) {
  const {
    docId,
    qNum = 1,
    contentType = 'image/jpeg'
  } = options;

  let buffer;
  if (Buffer.isBuffer(bufferOrBase64)) {
    buffer = bufferOrBase64;
  } else if (typeof bufferOrBase64 === 'string') {
    const clean = bufferOrBase64.replace(/^data:[^;]+;base64,/, '').trim();
    buffer = Buffer.from(clean, 'base64');
  } else if (bufferOrBase64 instanceof Uint8Array) {
    buffer = Buffer.from(bufferOrBase64);
  } else {
    return '';
  }

  const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

  const supabase = getStorageClient();
  if (!supabase) {
    // If Supabase is not configured, fallback to data URL directly
    return dataUrl;
  }

  const timestamp = Date.now();
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const filePath = docId && docId !== 'extracted'
    ? `diagrams/${docId}/q_${qNum}_${timestamp}.${ext}`
    : `diagrams/${timestamp}_q${qNum}.${ext}`;

  try {
    const { data, error } = await supabase.storage
      .from('question-papers')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.warn('[DiagramCropper] Supabase Storage upload warning:', error.message);
      // Fallback to dataUrl on upload failure so question diagrams are never lost
      return dataUrl;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('question-papers')
      .getPublicUrl(filePath);

    return publicUrl || dataUrl;
  } catch (err) {
    console.warn('[DiagramCropper] Storage upload failed, using dataUrl fallback:', err.message);
    return dataUrl;
  }
}

/**
 * High-level helper: Crop diagram from page base64 and upload to Supabase Storage
 * @param {string|Buffer} imageInput - Base64 or Buffer of full page
 * @param {Array<number>} box2d - [ymin, xmin, ymax, xmax] 0-1000 scale
 * @param {Object} options - { docId, qNum, contentType }
 * @returns {Promise<string>} Public image URL or Data URL
 */
export async function cropAndUploadDiagram(imageInput, box2d, options = {}) {
  if (!imageInput || !box2d) return '';

  const cropped = await cropImageBuffer(imageInput, box2d);
  if (!cropped || !cropped.buffer) return '';

  const publicUrl = await uploadDiagramToStorage(cropped.buffer, {
    ...options,
    contentType: options.contentType || 'image/jpeg'
  });
  return publicUrl || cropped.dataUrl || '';
}

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
    console.warn('[DiagramCropper] Canvas crop error:', err);
    return '';
  }
}
