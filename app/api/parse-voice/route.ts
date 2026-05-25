import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, SEASONS, KIDS_SIZES,
} from '@/lib/categories';

const client = new Anthropic();

const allCategories = [...new Set(Object.values(DEPT_CATEGORIES).flat())];
const allHeels = [...new Set(Object.values(DEPT_HEELS).flat())];
const allSections = [...new Set(Object.values(DEPT_SECTIONS).flat())];

const BASE_SYSTEM_PROMPT = `You are a voice-to-form assistant for Kins Footwear, an Indian footwear company.
The user speaks ONE long sentence with ALL their fields at once. Extract EVERY field mentioned and return as JSON.

═══ SELECT FIELDS (pick EXACT match from list) ═══
department: ${DEPARTMENTS.join(' | ')}
sub_category: ${SUB_CATEGORIES.join(' | ')}
heels: ${allHeels.join(' | ')}
  → heel mappings: "wedge"→Medium Wedge, "high wedge"→High Wedge, "short wedge"→Short Wedge, "medium wedge"→Medium Wedge, "flat"→Flat, "high heel"→High Heel, "medium heel"→Medium Heel, "short heel"→Short Heel, "platform"→Medium Platform, "high platform"→High Platform
color: ${COLORS.join(' | ')}
  → color mappings: black→BLK, white→WHT, brown→BRN, red→RED, blue→BLU, gold→GLD, silver→SIL, green→GRN, grey/gray→GRY, tan→TAN, nude→NUD, navy→NAV, orange→ORG, pink→PNK, purple→PPL, antique→ANT, copper→COP, coffee→COF, cream→CRM, mustard→MST, maroon→MRN, fuchsia→FUS
section: ${allSections.join(' | ')}
season: ${SEASONS.join(' | ')}
kids_size (Kids Footwears ONLY): XS | S | M | L | XL
  → kids_size mappings: "extra small"→XS, "small"→S, "medium"→M, "large"→L, "extra large"→XL

═══ CATEGORY ALIASES ═══
Use ONLY the exact category string from the department list above. Common spoken variants:
  "bridal shoes"→Bridalshoes (Ladies) / "Bridal Shoes" (Kids)
  "sport shoes"→Sport Shoes (Mens) / "sports shoes"→Sports Shoes (Kids) / "sportshoes"→Sportshoes (Ladies)
  "comfort walker"→Comfortwalker, "comfy home wear"→Comfyhomewear / "Comfy Home Wear" (Kids)
  "kolhapuri"→Kolhapuri (Ladies), "kohlapuri"→Kohlapuri (Mens)
  "sandal"→Sandal (Ladies/Mens), "sandals"→Sandals (Kids)
  "school shoes"→School Shoes (Kids), "lace up"→Laceup (Mens) / "Laceup" (Kids)
  "long boot"→Long Boot (Kids), "moccasin"→Moccasin (Kids/Mens)
  "peshawari"→Peshawari (Kids/Mens), "v shape"→Vshape
  "ballerina"→Ballerina (Ladies), "ballerinas"→Ballerinas (Kids)
  "booties"→Booties (Kids), "crocs"→Crocs, "floater"→Floater
  "jutti"→Jutti, "loafer"→Loafer, "mules"→Mules, "slipper"→Slipper
  "sneakers"→Sneakers, "boots"→Boots, "pumps"→Pumps (Ladies)

═══ FREE TEXT FIELDS ═══
article_no: article number/code
set_qty: number of sets (just a number like 8, 16, 20)
pur_price: purchase price

═══ THREE DIFFERENT SIZE CONCEPTS — NEVER CONFUSE ═══
1. kids_size = XS/S/M/L/XL category (Kids only) — e.g. "size medium" → kids_size:"M"
2. size_set = a range description like "35-40" — ONLY fill if user says "size set 35 to 40"
3. qty_NN = quantity for a specific shoe size number — fill when user says numbers with quantities

═══ SIZE QUANTITY PARSING (most important) ═══
When user says size-quantity pairs, output EACH as qty_[size]:"[qty]"
Patterns to recognize:
  "21 is 1 22 is 2 23 is 3" → {"qty_21":"1","qty_22":"2","qty_23":"3"}
  "21 one 22 two 23 three 24 two 25 one" → {"qty_21":"1","qty_22":"2","qty_23":"3","qty_24":"2","qty_25":"1"}
  "size 36 is 2 37 is 3 38 is 2" → {"qty_36":"2","qty_37":"3","qty_38":"2"}
  "36 2 37 3 38 2 39 1" → {"qty_36":"2","qty_37":"3","qty_38":"2","qty_39":"1"}
Number words: one→1, two→2, three→3, zero→0
NEVER put these into size_set. NEVER skip any pair in a sequence.

═══ RULES ═══
1. Extract ALL fields from the FULL sentence in one pass
2. Ignore: hi, okay, um, please, fill, add, and, the
3. Return ONLY valid JSON, nothing else`;

// Case-insensitive best match against an option list (also tries space-stripped variants)
function bestMatch(value: string, options: readonly string[]): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const vns = v.replace(/\s+/g, ''); // no-space version

  // 1. Exact match (case-insensitive)
  const exact = options.find(o => o.toLowerCase() === v);
  if (exact) return exact;

  // 2. Exact match with spaces stripped from both sides
  const exactNS = options.find(o => o.toLowerCase().replace(/\s+/g, '') === vns);
  if (exactNS) return exactNS;

  // 3. Option starts with value
  const starts = options.find(o => o.toLowerCase().startsWith(v));
  if (starts) return starts;

  // 4. Option starts with value (no-space)
  const startsNS = options.find(o => o.toLowerCase().replace(/\s+/g, '').startsWith(vns));
  if (startsNS) return startsNS;

  // 5. Value contains option
  const contains = options.find(o => v.includes(o.toLowerCase()));
  if (contains) return contains;

  // 6. Value (no-space) contains option (no-space)
  const containsNS = options.find(o => vns.includes(o.toLowerCase().replace(/\s+/g, '')));
  if (containsNS) return containsNS;

  return null;
}

const SELECT_OPTIONS: Record<string, readonly string[]> = {
  department:   DEPARTMENTS,
  sub_category: SUB_CATEGORIES,
  heels:        allHeels,
  color:        COLORS,
  section:      allSections,
  season:       SEASONS,
  kids_size:    KIDS_SIZES,
};

function normaliseFields(raw: Record<string, string>, department?: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Dept-specific category list (or full union as fallback)
  const categoryOptions = department && DEPT_CATEGORIES[department]
    ? DEPT_CATEGORIES[department]
    : allCategories;

  for (const [key, value] of Object.entries(raw)) {
    if (!value && value !== '0') continue;
    if (key === 'category') {
      const matched = bestMatch(String(value), categoryOptions);
      if (matched) out[key] = matched;
    } else if (SELECT_OPTIONS[key]) {
      const matched = bestMatch(String(value), SELECT_OPTIONS[key]);
      if (matched) out[key] = matched;
    } else if (key.startsWith('qty_')) {
      // Validate size is valid for department
      const sizeNum = parseInt(key.replace('qty_', ''));
      const DEPT_SIZES: Record<string, number[]> = {
        'Ladies Footwears': [35,36,37,38,39,40,41,42],
        'Mens Footwears':   [39,40,41,42,43,44,45,46,47],
        'Kids Footwears':   Array.from({length:28},(_,i)=>15+i),
      };
      const validSizes = department ? (DEPT_SIZES[department] ?? []) : [];
      if (validSizes.includes(sizeNum)) {
        out[key] = String(value);
      }
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, department } = await req.json();
    if (!transcript?.trim()) {
      return NextResponse.json({ fields: {} });
    }

    const DEPT_SIZES: Record<string, number[]> = {
      'Ladies Footwears': [35,36,37,38,39,40,41,42],
      'Mens Footwears':   [39,40,41,42,43,44,45,46,47],
      'Kids Footwears':   Array.from({length:28},(_,i)=>15+i),
    };

    const validSizes = department && DEPT_SIZES[department]
      ? DEPT_SIZES[department]
      : department === 'Kids Footwears'
        ? Array.from({length:28},(_,i)=>15+i)
        : null;

    const sizePromptSection = validSizes
      ? `\n\nVALID sizes for ${department}: [${validSizes.join(', ')}]
Only output qty_N fields for sizes in this list. Parse ALL size-quantity pairs in the sentence.`
      : '';

    // Inject dept-specific category list so Claude only picks from relevant options
    const deptCategories = department && DEPT_CATEGORIES[department]
      ? DEPT_CATEGORIES[department]
      : allCategories;
    const categorySection = `\n\ncategory (for ${department || 'this department'}): ${deptCategories.join(' | ')}`;

    const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + categorySection + sizePromptSection;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract shoe entry fields from this speech: "${transcript}"`,
        },
      ],
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
