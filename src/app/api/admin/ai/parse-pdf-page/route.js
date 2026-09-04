import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  GEMINI_SYSTEM_INSTRUCTION,
  sanitizeGeminiQuestions,
  detectSubject
} from '@/app/api/admin/ai/parse-pdf/route';
import {
  isAnswerKeySection,
  parseAnswerKeyMatrix
} from '@/lib/pdf-vision-parser';
import { cropAndUploadDiagram } from '@/lib/diagram-cropper';

// Re-export sanitizeGeminiQuestions for legacy imports
export { sanitizeGeminiQuestions, detectSubject };

// Polyfills
if (typeof globalThis.DOMMatrix === 'undefined') globalThis.DOMMatrix = class DOMMatrix {};
if (typeof globalThis.ImageData === 'undefined') globalThis.ImageData = class ImageData {};
if (typeof globalThis.Path2D === 'undefined') globalThis.Path2D = class Path2D {};

export const maxDuration = 60;

export async function POST(request) {
  try {
    const contentLength = request.headers ? parseInt(request.headers.get('content-length') || '0', 10) : 0;
    if (contentLength > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Payload Too Large' }, { status: 413 });
    }

    const jsonBody = await request.json();
    let imageBase64 = jsonBody.imageBase64 || '';
    const mimeType = jsonBody.mimeType || 'image/jpeg';
    const docId = jsonBody.docId || 'extracted';
    const pageNum = jsonBody.pageNum || 1;

    if (imageBase64.startsWith('data:')) {
      imageBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 400 });
    }

    const GenAIClient = typeof GoogleGenAI !== 'undefined' ? GoogleGenAI : (require('@google/genai').GoogleGenAI);
    const ai = new GenAIClient({ apiKey });

    let response = null;
    let successfulModel = '';
    let lastError = null;
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: 'Extract all questions, detect diagrams with bounding boxes [ymin, xmin, ymax, xmax], and check if this is an Answer Key Sheet.' }
          ],
          config: {
            responseMimeType: 'application/json',
            systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
            temperature: 0.1
          }
        });
        successfulModel = modelName;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!response) {
      throw new Error(`Gemini failed: ${lastError?.message || 'Unknown error'}`);
    }

    let responseText = response.text || '';
    if (!responseText && response.candidates && response.candidates[0]?.content?.parts) {
      responseText = response.candidates[0].content.parts.map(p => p.text || '').join('');
    }

    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    cleanedJson = cleanedJson.replace(/(?<!\\)\\(?!["\\nr]|u[0-9a-fA-F]{4})/g, '\\\\');

    let parsedData = {};
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch (parseErr) {
      throw new Error(`Failed to parse Gemini JSON: ${parseErr.message}`);
    }

    const isAnswerKeyPage = Boolean(parsedData.is_answer_key_page || parsedData.isAnswerKeyPage);
    const answerKeyMap = parsedData.answer_key_map || parsedData.answerKeyMap || null;

    let rawQuestions = Array.isArray(parsedData)
      ? parsedData
      : (parsedData.questions || parsedData.data || []);

    let formattedQuestions = sanitizeGeminiQuestions(rawQuestions);

    let effectiveAnswerKeyMap = answerKeyMap;
    let effectiveIsAnswerKeyPage = isAnswerKeyPage;

    if (!effectiveAnswerKeyMap && isAnswerKeySection(responseText)) {
      effectiveIsAnswerKeyPage = true;
      const parsedMap = parseAnswerKeyMatrix(responseText);
      if (Object.keys(parsedMap).length > 0) {
        effectiveAnswerKeyMap = parsedMap;
      }
    }

    // Diagram Bounding Box Cropping & Supabase Storage Upload
    let diagramsExtracted = 0;
    for (let i = 0; i < formattedQuestions.length; i++) {
      const q = formattedQuestions[i];
      if (q.has_diagram && q.diagram_box_2d && !q.diagram_url) {
        try {
          const croppedUrl = await cropAndUploadDiagram(imageBase64, q.diagram_box_2d, {
            docId,
            qNum: q.question_number || (pageNum * 100 + i + 1)
          });
          if (croppedUrl) {
            formattedQuestions[i].diagram_url = croppedUrl;
            formattedQuestions[i].image_url = croppedUrl;
            formattedQuestions[i].diagramUrl = croppedUrl;
            formattedQuestions[i].imageUrl = croppedUrl;
            diagramsExtracted++;
          }
        } catch (cropErr) {
          console.warn('[Parse-Page] Diagram crop error:', cropErr);
        }
      } else if (q.diagram_url && !q.image_url) {
        formattedQuestions[i].image_url = q.diagram_url;
      }
    }

    return NextResponse.json({
      success: true,
      parserType: 'gemini_ai_multimodal_chunked',
      model: successfulModel,
      is_answer_key_page: effectiveIsAnswerKeyPage,
      answer_key_map: effectiveAnswerKeyMap,
      diagrams_extracted: diagramsExtracted,
      questions_count: formattedQuestions.length,
      questions: formattedQuestions
    });

  } catch (error) {
    console.error('[Parse-Image Route] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export default POST;
