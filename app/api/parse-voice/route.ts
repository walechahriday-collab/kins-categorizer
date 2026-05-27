import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, SEASONS, KIDS_SIZES,
} from '@/lib/categories';

const client = new Anthropic();

const allCategories = [...new Set(Object.values(DEPT_CATEGORIES).flat())];
const allHeels     = [...new Set(Object.values(DEPT_HEELS).flat())];
const allSections  = [...new Set(Object.values(DEPT_SECTIONS).flat())];

// ─── Transcript pre-processor ────────────────────────────────────────────────
// Runs before sending to Claude. Normalises common speech patterns so the AI
// doesn't have to handle every variant itself.
function preprocessTranscript(t: string): string {
  return t
    // British / Indian English spellings
    .replace(/\bcolour\b/gi, 'color')
    .replace(/\bcolours\b/gi, 'colors')
    // Hinglish — only words that don't collide with English
    .replace(/\bek\b/gi, '1')
    .replace(/\bpaanch\b/gi, '5')
    .replace(/\bchhey\b/gi, '6')
    .replace(/\bsaat\b/gi, '7')
    .replace(/\baath\b/gi, '8')
    .replace(/\bnau\b/gi, '9')
    // Hinglish phrases
    .replace(/\bset\s+matra\b/gi, 'set qty')
    .replace(/\brang\b/gi, 'color')
    // "X se Y" size range (Hindi: se = from/to)
    .replace(/\b(\d{2})\s+se\s+(\d{2})\b/gi, '$1 to $2')
    // Common mishearings of "size set" by en-IN speech API
    .replace(/\bsize\s+said\b/gi, 'size set')
    .replace(/\bsize\s+sat\b/gi, 'size set')
    .replace(/\bsize\s+sad\b/gi, 'size set')
    // Ordinal color references → numbered
    .replace(/\bfirst\s+color\b/gi, 'color 1')
    .replace(/\bsecond\s+color\b/gi, 'color 2')
    .replace(/\bthird\s+color\b/gi, 'color 3')
    .replace(/\bfourth\s+color\b/gi, 'color 4')
    .replace(/\bfifth\s+color\b/gi, 'color 5')
    .replace(/\bsixth\s+color\b/gi, 'color 6')
    // "color one/two/three..." → "color 1/2/3..."
    .replace(/\bcolor\s+one\b/gi, 'color 1')
    .replace(/\bcolor\s+two\b/gi, 'color 2')
    .replace(/\bcolor\s+three\b/gi, 'color 3')
    .replace(/\bcolor\s+four\b/gi, 'color 4')
    .replace(/\bcolor\s+five\b/gi, 'color 5')
    .replace(/\bcolor\s+six\b/gi, 'color 6')
    // Spoken "set quantity" / "quantity" → "set qty"
    .replace(/\bset\s+quantity\b/gi, 'set qty')
    .replace(/\bquantity\b/gi, 'qty')
    // "purchase price" / "price" shorthand
    .replace(/\bpurchase\s+price\b/gi, 'pur price')
    // "size range" → "size set"
    .replace(/\bsize\s+range\b/gi, 'size set')
    // Number words → digits
    .replace(/\bzero\b/gi,  '0')
    .replace(/\bone\b/gi,   '1')
    .replace(/\btwo\b/gi,   '2')
    .replace(/\bthree\b/gi, '3')
    .replace(/\bfour\b/gi,  '4')
    .replace(/\bfive\b/gi,  '5')
    .replace(/\bsix\b/gi,   '6')
    .replace(/\bseven\b/gi, '7')
    .replace(/\beight\b/gi, '8')
    .replace(/\bnine\b/gi,  '9')
    .replace(/\bten\b/gi,   '10')
    .trim();
}

// ─── System prompt ────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are a voice-to-form parser for Kins Footwear. Extract fields from speech and return ONLY valid JSON.

SHARED FIELDS:
department: ${DEPARTMENTS.join(' | ')}
sub_category: ${SUB_CATEGORIES.join(' | ')}
heels: ${allHeels.join(' | ')} — wedge→Medium Wedge, flat→Flat, heel→Medium Heel, high heel→High Heel, short heel→Short Heel, platform→Medium Platform, high platform→High Platform
section: ${allSections.join(' | ')}
season: ${SEASONS.join(' | ')}
kids_size (Kids only): XS|S|M|L|XL
article_no, pur_price: free text
notes: capture everything after "notes" or "note" until end of speech — free text, preserve as spoken

COLORS (spoken→code): black→BLK, white→WHT, brown→BRN, red→RED, blue→BLU, gold→GLD, silver→SIL, green→GRN, grey→GRY, tan→TAN, nude→NUD, navy→NAV, orange→ORG, pink→PNK, purple→PPL, antique→ANT, copper→COP, coffee→COF, cream→CRM, mustard→MST, maroon→MRN, fuchsia→FUS, beige→BEG, champagne→CHP, khaki→KHK
HINDI COLOR ALIASES: kaala/kala→BLK, safed→WHT, bhura/bhoora/bhoori→BRN, laal/lal→RED, neela/nila/neeli→BLU, sona/sunehra→GLD, chandi/chaandi→SIL, hara/hari/hara→GRN, grey/sleti→GRY, narangi→ORG, gulabi→PNK, baingani/jamuni→PPL, peela/sarson→MST, maroon→MRN, cream/malai→CRM

CATEGORY ALIASES: bridal shoes→Bridalshoes(L)/Bridal Shoes(K), sport shoes→Sport Shoes(M), sports shoes→Sports Shoes(K), comfort walker→Comfortwalker, sandal→Sandal(L/M)/Sandals(K), lace up→Laceup, v shape→Vshape, party wear→Partywear

SIZE RULES:
- size_set: any range like "size set 35 to 40", "size 35 to 40", "35 to 40" → "35-40". Always output as vN_size_set.
- qty_NN: SIZE then QTY (adjacent, "is" optional): "36 2" or "36 is 2" → qty_36:2. Parse EVERY pair, never skip.
- kids_size: XS/S/M/L/XL only — "size medium" → kids_size:M

VARIANT RULES — CRITICAL:
- ALL color/size/qty fields MUST use vN_ prefix. NEVER output bare "color", "size_set", "set_qty", "qty_NN".
- No color number mentioned → EVERYTHING goes to v0_ (default variant).
- "color 1"→v0_, "color 2"→v1_, "color 3"→v2_, "color 4"→v3_, "color 5"→v4_, "color 6"→v5_
- Everything after "color N" belongs to v{N-1}_ until next color marker.

EXAMPLES:
"sandal black size set 36 to 40 set qty 5 36 1 37 2 38 2"
→{"category":"Sandal","v0_color":"BLK","v0_size_set":"36-40","v0_set_qty":"5","v0_qty_36":"1","v0_qty_37":"2","v0_qty_38":"2"}

"color 1 black set qty 8 36 2 37 2 38 1 color 2 red set qty 6 36 1 37 2 38 1"
→{"v0_color":"BLK","v0_set_qty":"8","v0_qty_36":"2","v0_qty_37":"2","v0_qty_38":"1","v1_color":"RED","v1_set_qty":"6","v1_qty_36":"1","v1_qty_37":"2","v1_qty_38":"1"}

"color 3 42 2" → {"v2_qty_42":"2"}

Ignore filler words: hi okay um please the and. Return ONLY valid JSON.`;

// ─── Fuzzy matcher ────────────────────────────────────────────────────────────
function bestMatch(value: string, options: readonly string[]): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const vns = v.replace(/\s+/g, '');

  const exact   = options.find(o => o.toLowerCase() === v);               if (exact)    return exact;
  const exactNS = options.find(o => o.toLowerCase().replace(/\s+/g,'') === vns); if (exactNS)  return exactNS;
  const starts  = options.find(o => o.toLowerCase().startsWith(v));       if (starts)   return starts;
  const startsNS= options.find(o => o.toLowerCase().replace(/\s+/g,'').startsWith(vns)); if (startsNS) return startsNS;
  const contains= options.find(o => v.includes(o.toLowerCase()));         if (contains) return contains;
  const containsNS=options.find(o=>vns.includes(o.toLowerCase().replace(/\s+/g,''))); if (containsNS) return containsNS;
  return null;
}

const SELECT_OPTIONS: Record<string, readonly string[]> = {
  department: DEPARTMENTS, sub_category: SUB_CATEGORIES,
  heels: allHeels, color: COLORS, section: allSections,
  season: SEASONS, kids_size: KIDS_SIZES,
};

// ─── Normaliser ───────────────────────────────────────────────────────────────
function normaliseFields(raw: Record<string, unknown>, department?: string): Record<string, string> {
  const out: Record<string, string> = {};

  const DEPT_SIZE_MAP: Record<string, number[]> = {
    'Ladies Footwears': [35,36,37,38,39,40,41,42],
    'Mens Footwears':   [39,40,41,42,43,44,45,46,47],
    'Kids Footwears':   Array.from({length:28},(_,i)=>15+i),
  };
  const validSizes = department ? (DEPT_SIZE_MAP[department] ?? []) : [];
  const categoryOptions = department && DEPT_CATEGORIES[department]
    ? DEPT_CATEGORIES[department] : allCategories;

  for (const [key, rawVal] of Object.entries(raw)) {
    const value = String(rawVal ?? '').trim();
    if (!value || value === 'null' || value === 'undefined') continue;

    // ── Variant-prefixed fields: v0_color, v1_qty_36, etc. ──
    const vm = key.match(/^(v\d+)_(.+)$/);
    if (vm) {
      const field = vm[2];
      if (field === 'color') {
        const m = bestMatch(value, COLORS); if (m) out[key] = m;
      } else if (field === 'size_set') {
        out[key] = value;
      } else if (field === 'set_qty') {
        const n = parseFloat(value); if (!isNaN(n)) out[key] = String(Math.round(n));
      } else if (field.startsWith('qty_')) {
        const sizeNum = parseInt(field.replace('qty_', ''));
        const qty = parseFloat(value);
        if (!isNaN(qty) && (!department || validSizes.includes(sizeNum))) {
          out[key] = String(Math.round(qty));
        }
      }
      continue;
    }

    // ── Shared fields ──
    if (key === 'category') {
      const m = bestMatch(value, categoryOptions); if (m) out[key] = m;
    } else if (key === 'color_raw') {
      // Claude might use color_raw for a single-color entry; map to v0_color
      const m = bestMatch(value, COLORS); if (m) out['v0_color'] = m;
    } else if (SELECT_OPTIONS[key]) {
      const m = bestMatch(value, SELECT_OPTIONS[key]); if (m) out[key] = m;
    } else if (key.startsWith('qty_')) {
      const sizeNum = parseInt(key.replace('qty_', ''));
      const qty = parseFloat(value);
      if (!isNaN(qty) && validSizes.includes(sizeNum)) out[key] = String(Math.round(qty));
    } else if (key === 'pur_price' || key === 'article_no' || key === 'size_set' || key === 'set_qty' || key === 'notes') {
      out[key] = value;
    }
  }
  return out;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { transcript, department } = await req.json();
    if (!transcript?.trim()) return NextResponse.json({ fields: {} });

    // Pre-process spoken transcript before sending to Claude
    const cleaned = preprocessTranscript(transcript);

    const DEPT_SIZE_MAP: Record<string, number[]> = {
      'Ladies Footwears': [35,36,37,38,39,40,41,42],
      'Mens Footwears':   [39,40,41,42,43,44,45,46,47],
      'Kids Footwears':   Array.from({length:28},(_,i)=>15+i),
    };
    const validSizes = department ? (DEPT_SIZE_MAP[department] ?? null) : null;

    const deptCategories = department && DEPT_CATEGORIES[department]
      ? DEPT_CATEGORIES[department] : allCategories;

    const dynamicSection = [
      `\ncategory (${department || 'any dept'}): ${deptCategories.join(' | ')}`,
      validSizes
        ? `\nVALID shoe sizes for ${department}: [${validSizes.join(', ')}] — ONLY output qty_N for sizes in this list`
        : '',
    ].join('');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 0,               // deterministic — no creative guessing
      system: BASE_SYSTEM_PROMPT + dynamicSection,
      messages: [{
        role: 'user',
        content: `Parse this voice input into JSON fields:\n"${cleaned}"`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ fields: {} });

    const raw = JSON.parse(jsonMatch[0]);
    const fields = normaliseFields(raw, department);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error('parse-voice error:', err);
    return NextResponse.json({ fields: {} }, { status: 500 });
  }
}
