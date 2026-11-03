import React from 'react';

export function AnimatedText({ children }) {
  const text = String(children);
  return text.split(/(\s+)/).map((part, index) => (
    /^\s+$/.test(part)
      ? part
      : <span key={`${part}-${index}`} className="animated-word" style={{ animationDelay: `${Math.min(index * 24, 240)}ms` }}>{part}</span>
  ));
}
