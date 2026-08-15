// Test current parser algorithm from src/app/api/admin/ai/parse-pdf/route.js

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
  if (/\b(?:velocity|acceleration|force|momentum|torque|gravity|newton|electric|magnetic|optic|wave|frequency|wavelength|capacitor|resistor|current|voltage|circuit|thermodynamic|entropy|heat|temperature|energy|work|power|friction|pendulum|projectile|rotational|angular|displacement|kinematic)\b/.test(text)) return 'Physics';
  if (/\b(?:molecule|atom|ion|compound|reaction|acid|base|ph|oxidation|reduction|electrode|electrolysis|bond|covalent|ionic|organic|inorganic|alkane|alkene|alkyne|polymer|catalyst|equilibrium|mole|molarity|solution|solvent|titration|periodic|element|metal|non-metal)\b/.test(text)) return 'Chemistry';
  if (/\b(?:cell|organism|dna|rna|gene|chromosome|mitosis|meiosis|protein|enzyme|photosynthesis|respiration|evolution|species|ecology|ecosystem|tissue|organ|blood|heart|neuron|hormone|bacteria|virus|fungi|plant|animal|reproduction)\b/.test(text)) return 'Biology';
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
    const blocks = cleaned.split(/\n\s*\n/).filter(b => b.trim().length > 20);
    if (blocks.length >= 2) {
      const parsedQuestions = [];
      blocks.forEach((block, i) => {
        const questionObj = parseQuestionBlock(block.trim());
        if (questionObj) {
          const subject = detectSubject(questionObj.content);
          parsedQuestions.push({
            id: `pdf-q-${i + 1}`,
            subject,
            content: questionObj.content,
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
        id: `pdf-q-${matches[i].number}`,
        subject,
        content: questionObj.content,
        options: questionObj.options,
        correct_option_index: questionObj.correct_option_index,
        correct_answer: questionObj.options[questionObj.correct_option_index] || '',
        explanation: ''
      });
    }
  }
  return parsedQuestions;
}

// 5 Diverse Question Formats
const rawExamText = `
Q1. A body of mass 5 kg is moving with a velocity of 10 m/s. Calculate its kinetic energy.
(A) 250 J
(B) 500 J
(C) 125 J
(D) 50 J
Answer: (A)
Explanation: KE = 1/2 * m * v^2 = 0.5 * 5 * 100 = 250 J.

2. Which of the following is the powerhouse of the cell?
(1) Ribosome (2) Mitochondria (3) Nucleus (4) Golgi apparatus
Ans: 2

Question 3: If f(x) = (x + 2)^2 - 4, what is the value of f(-2)?
A) 0
B) -4
C) 4
D) (x - 2)
Correct Option: B
Solution: f(-2) = (-2 + 2)^2 - 4 = 0 - 4 = -4.

4) Consider the following statements regarding electric field:
(1) Field lines never intersect each other.
(2) Field lines start from negative charge and end at positive charge.
Which of the above statements is/are correct?
(a) 1 only
(b) 2 only
(c) Both 1 and 2
(d) Neither 1 nor 2
Key: a
Explanation: Electric field lines start from positive charges and end at negative charges, so statement 2 is false.

Ques 5. Which of the following complexes is diamagnetic?
[A] [Fe(CN)6]3-
[B] [Ni(CN)4]2-
[C] [CoF6]3-
[D] [Fe(H2O)6]2+
Ans - B
`;

console.log('--- RUNNING CURRENT PARSER ON 5 DIVERSE FORMATS ---');
const results = parseExtractedText(rawExamText);
console.log(`Parsed count: ${results.length} (Expected: 5)`);
results.forEach((q, idx) => {
  console.log(`\n[Question ${idx + 1}] (Matched ID: ${q.id})`);
  console.log(`Content:\n  ${q.content.replace(/\n/g, '\n  ')}`);
  console.log(`Options:`, q.options);
  console.log(`Correct Index:`, q.correct_option_index, `Correct Answer:`, q.correct_answer);
  console.log(`Explanation:`, q.explanation);
});
