'use client'

import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function KatexRenderer({ content, className = '' }) {
  if (!content) return null;

  // Convert plain text math notation (e.g. lim (x->0), dy/dx, integral) into LaTeX if not already LaTeX
  const formatLatexString = (text) => {
    if (typeof text !== 'string') return String(text);

    // If string already contains LaTeX commands or $ signs, return as is
    if (text.includes('\\') || text.includes('$')) {
      return text;
    }

    // Auto-beautify common math expressions into LaTeX syntax
    let formatted = text
      .replace(/lim\s*\(\s*x\s*->\s*0\s*\)/gi, '\\lim_{x \\to 0}')
      .replace(/lim\s*_\s*\(\s*x\s*->\s*0\s*\)/gi, '\\lim_{x \\to 0}')
      .replace(/dy\/dx/g, '\\frac{dy}{dx}')
      .replace(/ln\s*\|/g, '\\ln |')
      .replace(/∫/g, '\\int ')
      .replace(/\^\(2\)/g, '^2')
      .replace(/\^\(3\)/g, '^3');

    return formatted;
  };

  const formattedContent = formatLatexString(content);

  // Render LaTeX formulas using KaTeX
  const renderMathContent = () => {
    // Check if contains inline $ or block $$
    const parts = formattedContent.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\(.*?\\\)|\\\[.*?\\\])/g);

    return parts.map((part, index) => {
      if (!part) return null;

      let isBlock = part.startsWith('$$') || part.startsWith('\\[');
      let isInline = part.startsWith('$') || part.startsWith('\\(');

      if (isBlock || isInline) {
        let mathStr = part
          .replace(/^\$\$|\$\$$/g, '')
          .replace(/^\$|\$$/g, '')
          .replace(/^\\\(|\\\)$/g, '')
          .replace(/^\\\[|\\\]$/g, '')
          .trim();

        try {
          const html = katex.renderToString(mathStr, {
            displayMode: isBlock,
            throwOnError: false
          });
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              className={isBlock ? 'block my-2 overflow-x-auto text-center' : 'inline-block px-1'}
            />
          );
        } catch (e) {
          return <span key={index} className="font-mono text-amber-700">{part}</span>;
        }
      }

      // Check for standalone LaTeX commands like \lim, \frac, \int
      if (part.includes('\\lim') || part.includes('\\frac') || part.includes('\\int') || part.includes('\\vec')) {
        try {
          const html = katex.renderToString(part, {
            displayMode: false,
            throwOnError: false
          });
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              className="inline-block px-1"
            />
          );
        } catch (e) {
          return <span key={index}>{part}</span>;
        }
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <span className={`katex-wrapper leading-relaxed ${className}`}>
      {renderMathContent()}
    </span>
  );
}
