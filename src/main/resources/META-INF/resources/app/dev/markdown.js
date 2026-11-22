/**
 * DEV-ONLY: sehr kleiner, sicherer Markdown-Renderer für KI-Antworten.
 * Escaped zuerst alles und erlaubt dann nur Überschriften, Listen, fett/kursiv, Code und Absätze.
 */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

export function renderMarkdown(source) {
  const lines = escapeHtml(source || '').split(/\r?\n/);
  const out = [];
  let list = null;
  let inCode = false;
  let code = [];
  let para = [];

  const flushPara = () => {
    if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; }
  };
  const flushList = () => {
    if (list) { out.push(`<${list.tag}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.tag}>`); list = null; }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) { out.push('<pre><code>' + code.join('\n') + '</code></pre>'); code = []; inCode = false; }
      else { flushPara(); flushList(); inCode = true; }
      continue;
    }
    if (inCode) { code.push(line); continue; }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (heading) {
      flushPara(); flushList();
      const level = Math.min(heading[1].length + 2, 6);
      out.push(`<h${level}>` + inline(heading[2]) + `</h${level}>`);
    } else if (bullet || numbered) {
      flushPara();
      const tag = bullet ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push((bullet || numbered)[1]);
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flushPara(); flushList(); out.push('<hr>');
    } else {
      flushList();
      para.push(line);
    }
  }
  if (inCode) out.push('<pre><code>' + code.join('\n') + '</code></pre>');
  flushPara(); flushList();
  return out.join('');
}
