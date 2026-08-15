import { NextResponse } from 'next/server';

// Next.js Node environment polyfills for pdf-parse (pdf.js dependency)
if (typeof global.DOMMatrix === 'undefined') global.DOMMatrix = class DOMMatrix {};
if (typeof global.ImageData === 'undefined') global.ImageData = class ImageData {};
if (typeof global.Path2D === 'undefined') global.Path2D = class Path2D {};

const pdfParse = require('pdf-parse');

// ═══════════════════════════════════════════════════════════════
// REAL PDF TEXT PARSER — Extracts ALL questions from raw text
// Ported from CourseManageClient.jsx production parser
// ═══════════════════════════════════════════════════════════════

function cleanExtractedText(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\s*page\s*\d+\s*(?:of\s*\d+)?$/i.test(trimmed)) return false;
    if (/^\s*\d+\s*of\s*\d+$/i.test(trimmed)) return false;
    if (/^\s*\d+\s*$/i.test(trimmed)) return false;
    if (/^\s*JEE\s*(?:Main|Advanced)?\s*(?:Mock|Practice)?\s*Test/i.test(trimmed)) return false;
    if (/^\s*NEET\s*(?:UG)?\s*(?:Mock|Practice)?\s*Test/i.test(trimmed)) return false;
    if (/^\s*(?:Time|Duration)\s*[:]\s*\d+\s*(?:min|hour|hr)/i.test(trimmed)) return false;
    if (/^\s*(?:Total|Maximum)\s*(?:Marks|Questions)\s*[:]/i.test(trimmed)) return false;
    if (/^\s*(?:Name|Roll\s*No|Registration|Candidate)\s*[:_]/i.test(trimmed)) return false;
    if (/^\s*(?:Instructions|General\s*Instructions|Read\s*the\s*following)/i.test(trimmed)) return false;
    return true;
  });
  return cleanedLines.join('\n');
}

function detectSubject(content) {
  const text = (content || '').toLowerCase();
  // Physics keywords
  if (/\b(?:velocity|acceleration|force|momentum|torque|gravity|newton|electric|magnetic|optic|wave|frequency|wavelength|capacitor|resistor|current|voltage|circuit|thermodynamic|entropy|heat|temperature|energy|work|power|friction|pendulum|projectile|rotational|angular|displacement|kinematic)\b/.test(text)) return 'Physics';
  // Chemistry keywords
  if (/\b(?:molecule|atom|ion|compound|reaction|acid|base|ph|oxidation|reduction|electrode|electrolysis|bond|covalent|ionic|organic|inorganic|alkane|alkene|alkyne|polymer|catalyst|equilibrium|mole|molarity|solution|solvent|titration|periodic|element|metal|non-metal)\b/.test(text)) return 'Chemistry';
  // Biology keywords  
  if (/\b(?:cell|organism|dna|rna|gene|chromosome|mitosis|meiosis|protein|enzyme|photosynthesis|respiration|evolution|species|ecology|ecosystem|tissue|organ|blood|heart|neuron|hormone|bacteria|virus|fungi|plant|animal|reproduction)\b/.test(text)) return 'Biology';
  // Mathematics by default
  return 'Mathematics';
}

function parseQuestionBlock(block) {
  if (!block) return null;
  const lines = block.split('\n');
  let questionLines = [];
  let options = ['', '', '', ''];
  let correctOptionIndex = -1;
  let currentOptionIdx = -1;
  
  const ansRegex = /\b(?:ans(?:wer)?|key|correct|option)\b\s*[\:\-\=]?\s*([A-Da-d])/i;
  
  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check if this line is an answer key line
    const ansMatch = ansRegex.exec(trimmedLine);
    if (ansMatch) {
      const char = ansMatch[1].toUpperCase();
      correctOptionIndex = char.charCodeAt(0) - 65;
      continue;
    }
    
    // Check if this line starts a new option (A/B/C/D with delimiter)
    const optMatch = /^\s*[\*\_\(\[]*\s*(A|B|C|D)\s*[\*\_\)\]\.\-\:]+\s*(.*?)$/.exec(trimmedLine);
    if (optMatch) {
      const char = optMatch[1];
      const text = optMatch[2].trim();
      currentOptionIdx = char.charCodeAt(0) - 65;
      options[currentOptionIdx] = text;
    } else {
      // Also try lowercase with parentheses: (a), (b), (c), (d)
      const optMatchLower = /^\s*[\(\[]\s*(a|b|c|d)\s*[\)\]]\s*(.*?)$/.exec(trimmedLine);
      if (optMatchLower) {
        const char = optMatchLower[1].toUpperCase();
        const text = optMatchLower[2].trim();
        currentOptionIdx = char.charCodeAt(0) - 65;
        options[currentOptionIdx] = text;
      } else if (currentOptionIdx !== -1) {
        // Continuation of current option
        options[currentOptionIdx] += ' ' + trimmedLine;
      } else {
        questionLines.push(trimmedLine);
      }
    }
  }
  
  const hasLineOptions = options.some(o => o !== '');
  if (!hasLineOptions) {
    // Fallback: inline options matching
    const inlineExtractRegex = /[\*\_\(\[]*\s*(A|B|C|D)\s*[\*\_\)\]\.\-\:]+\s*([^\(\[\n]+)/g;
    const tempOptions = ['', '', '', ''];
    let foundCount = 0;
    let match;
    let firstOptionIndex = -1;
    
    const inlineOptRegex = /[\(\[]?(A|B|C|D)[\)\]\.\-]\s+/g;
    match = inlineOptRegex.exec(block);
    if (match) firstOptionIndex = match.index;
    
    while ((match = inlineExtractRegex.exec(block)) !== null) {
      const char = match[1];
      const text = match[2].trim();
      const idx = char.charCodeAt(0) - 65;
      tempOptions[idx] = text;
      foundCount++;
    }
    
    if (foundCount >= 2) {
      options = tempOptions;
      if (firstOptionIndex !== -1) {
        questionLines = [block.substring(0, firstOptionIndex).trim()];
      }
    }
  }
  
  // Try to find the answer in the entire block if not found line-by-line
  if (correctOptionIndex === -1) {
    const ansMatch = ansRegex.exec(block);
    if (ansMatch) {
      const char = ansMatch[1].toUpperCase();
      correctOptionIndex = char.charCodeAt(0) - 65;
    }
  }
  
  const filledOptionsCount = options.filter(o => o.trim() !== '').length;
  
  // Fallback if we have fewer than 2 options
  if (filledOptionsCount < 2) {
    const fullBlockText = lines.filter(line => !ansRegex.test(line)).join('\n').trim();
    if (!fullBlockText) return null;
    return {
      content: fullBlockText,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_option_index: correctOptionIndex !== -1 ? correctOptionIndex : 0
    };
  }
  
  const content = questionLines.join('\n').trim();
  if (content) {
    return {
      content,
      options: options.map(o => o.trim() || 'Option Placeholder'),
      correct_option_index: correctOptionIndex !== -1 ? correctOptionIndex : 0
    };
  }
  return null;
}

function parseExtractedText(text) {
  if (!text) return [];
  const cleaned = cleanExtractedText(text);
  
  // Multiple regex patterns to catch different question formats:
  // Q1., Q.1, Question 1., Ques 1:, 1., 1), 1:, etc.
  const questionRegex = /(?:^|\n)\s*(?:Q(?:ues(?:tion)?)?\.?\s*)?(\d+)\s*[\.\:\)]/gi;
  
  const matches = [];
  let match;
  while ((match = questionRegex.exec(cleaned)) !== null) {
    matches.push({
      index: match.index,
      number: match[1],
      length: match[0].length
    });
  }
  
  if (matches.length === 0) {
    // Secondary attempt: try splitting by double newlines and treating each block as a question
    const blocks = cleaned.split(/\n\s*\n/).filter(b => b.trim().length > 20);
    if (blocks.length >= 2) {
      const parsedQuestions = [];
      blocks.forEach((block, i) => {
        const questionObj = parseQuestionBlock(block.trim());
        if (questionObj) {
          const subject = detectSubject(questionObj.content);
          parsedQuestions.push({
            id: `pdf-q-${i + 1}-${Date.now()}`,
            subject,
            sub_topic: 'General',
            difficulty: 'MEDIUM',
            formatType: 'single_mcq',
            content: questionObj.content,
            diagram_url: '',
            options: questionObj.options,
            correct_option_index: questionObj.correct_option_index,
            correct_answer: questionObj.options[questionObj.correct_option_index] || '',
            explanation: ''
          });
        }
      });
      return parsedQuestions;
    }
    return [];
  }
  
  const parsedQuestions = [];
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index + matches[i].length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : cleaned.length;
    const block = cleaned.substring(startIdx, endIdx).trim();
    
    const questionObj = parseQuestionBlock(block);
    if (questionObj) {
      const subject = detectSubject(questionObj.content);
      parsedQuestions.push({
        id: `pdf-q-${matches[i].number}-${Date.now()}`,
        subject,
        sub_topic: 'General',
        difficulty: 'MEDIUM',
        formatType: 'single_mcq',
        content: questionObj.content,
        diagram_url: '',
        options: questionObj.options,
        correct_option_index: questionObj.correct_option_index,
        correct_answer: questionObj.options[questionObj.correct_option_index] || '',
        explanation: ''
      });
    }
  }
  return parsedQuestions;
}

// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const rawText = formData.get('rawText');
    const parserType = formData.get('parserType') || 'unstructured_pdf';

    let textToParse = rawText || '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.name && file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfData = await pdfParse(buffer);
          textToParse = pdfData.text;
        } catch (err) {
          console.error("PDF extraction error:", err);
          textToParse = buffer.toString('utf-8'); // fallback
        }
      } else {
        textToParse = buffer.toString('utf-8');
      }
    }

    if (parserType === 'structured_table') {
      // For structured table format, also run the real parser first
      const realParsed = parseExtractedText(textToParse);
      if (realParsed.length > 0) {
        return NextResponse.json({
          success: true,
          parserType: 'structured_table',
          questions_count: realParsed.length,
          questions: realParsed
        });
      }

      // Placeholder fallback for structured_table when no text provided
      const tableQuestions = [
        {
          id: `tbl-q-1-${Date.now()}`,
          subject: 'MATHEMATICS',
          sub_topic: 'Limits & Calculus',
          difficulty: 'MEDIUM',
          formatType: 'single_mcq',
          content: 'Evaluate the limit lim (x → 0) (sin(3x) - 3sin(x)) / x³',
          diagram_url: '',
          options: ['-4', '-4/3', '4', '0'],
          correct_option_index: 0,
          correct_answer: '-4',
          explanation: 'Using Taylor expansion: sin(3x) ≈ 3x - 27x³/6. 3sin(x) ≈ 3x - 3x³/6. Difference = -4x³. Limit = -4.',
          marks: { positive: 1, negative: 0 }
        }
      ];
      return NextResponse.json({
        success: true,
        parserType: 'structured_table',
        questions_count: tableQuestions.length,
        questions: tableQuestions
      });
    }

    // ═══════════════════════════════════════════════════════════
    // REAL PARSER: Extract ALL questions from unstructured PDF text
    // ═══════════════════════════════════════════════════════════
    const realParsed = parseExtractedText(textToParse);

    if (realParsed.length > 0) {
      return NextResponse.json({
        success: true,
        parserType: 'unstructured_pdf',
        questions_count: realParsed.length,
        questions: realParsed
      });
    }

    // Fallback: if parser extracted 0 questions (e.g. binary PDF that couldn't be read as text)
    return NextResponse.json({
      success: true,
      parserType: 'unstructured_pdf',
      questions_count: 0,
      questions: [],
      warning: 'No questions could be extracted. The PDF may be image-based or in an unrecognized format. Try pasting the question text directly.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
