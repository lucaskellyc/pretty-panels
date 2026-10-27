import { type ReactNode } from 'react';

/** What a run of source text is, for colour. `text` is left unwrapped. */
type Kind = 'comment' | 'string' | 'keyword' | 'number' | 'tag' | 'attr' | 'fn' | 'text';

/** One rule: a sticky regex tried at the cursor, and the kind its match is. */
type Rule = [Kind, RegExp];

const COMMENT_C: Rule = ['comment', /\/\*[\s\S]*?\*\//y];
const STRING: Rule = ['string', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/y];
const NUMBER: Rule = ['number', /\b\d+(?:\.\d+)?(?:px|ms|s|%|em|rem|deg)?\b/y];
const WORD: Rule = ['text', /[A-Za-z_$][\w$-]*/y];

const TSX: Rule[] = [
  ['comment', /\/\/[^\n]*/y],
  COMMENT_C,
  STRING,
  // A JSX tag name, or the type argument in `useState<T>` — both read as names.
  ['tag', /(?<=<\/?)[A-Za-z][\w.]*/y],
  [
    'keyword',
    /\b(?:const|let|var|function|return|import|from|export|default|if|else|new|typeof|type|interface|as|null|undefined|true|false)\b/y,
  ],
  NUMBER,
  // A JSX attribute: a name glued to `=` that isn't `==` or `=>`.
  ['attr', /[A-Za-z_][\w-]*(?==[^=>])/y],
  // A call, including one with a type argument: `useState<T | null>(…)`.
  ['fn', /[A-Za-z_$][\w$]*(?=\s*(?:<[^>()]*>)?\()/y],
  ['text', /[A-Za-z_$][\w$]*/y],
];

/** CSS changes meaning at a brace — selectors outside, declarations inside —
 *  so its rules come in two sets and `{` / `}` switch between them. */
const CSS_OUT: Rule[] = [COMMENT_C, STRING, ['tag', /[^\s{},/][^{},/]*?(?=\s*[{,])/y]];
const CSS_IN: Rule[] = [COMMENT_C, STRING, ['attr', /[a-z-]+(?=\s*:)/y], NUMBER, ['fn', /[a-z-]+(?=\()/y], WORD];

const SH: Rule[] = [
  ['comment', /#[^\n]*/y],
  STRING,
  // The command: the first word on a line, after an optional `$ ` prompt.
  ['fn', /(?<=^(?:\$ )?|\n(?:\$ )?|&& |\| )[\w./-]+/y],
  ['keyword', /(?<=\s)--?[\w-]+/y],
  WORD,
];

export type CodeLang = 'tsx' | 'css' | 'sh';

function tokenize(src: string, lang: CodeLang): [Kind, string][] {
  const out: [Kind, string][] = [];
  const push = (kind: Kind, text: string) => {
    const last = out[out.length - 1];
    if (last && last[0] === kind) last[1] += text;
    else out.push([kind, text]);
  };
  let inBlock = false;
  let i = 0;
  while (i < src.length) {
    const rules = lang === 'tsx' ? TSX : lang === 'sh' ? SH : inBlock ? CSS_IN : CSS_OUT;
    let matched = false;
    for (const [kind, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (m && m[0].length) {
        push(kind, m[0]);
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = src[i];
    if (lang === 'css' && (ch === '{' || ch === '}')) inBlock = ch === '{';
    push('text', ch);
    i++;
  }
  return out;
}

/**
 * A docs code block, coloured by kind of token — keywords, strings, comments,
 * numbers, tag and attribute names, and calls. A few dozen lines of
 * regex rather than a highlighter dependency: the site only shows short TSX,
 * CSS and shell snippets, and every colour comes from the `--code-*` tokens in
 * demo.css so it follows the page's light / dark palette.
 */
export function Code({ lang, children }: { lang: CodeLang; children: string }) {
  const parts: ReactNode[] = tokenize(children, lang).map(([kind, text], i) =>
    kind === 'text' ? text : (
      <span key={i} className={`tok-${kind}`}>
        {text}
      </span>
    ),
  );
  return (
    <pre className="code" data-lang={lang}>
      <code>{parts}</code>
    </pre>
  );
}
