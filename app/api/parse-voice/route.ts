import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, SEASONS,
} from '@/lib/categories';

const client = new Anthropic();

const allCategories = [...new Set(Object.values(DEPT_CATEGORIES).flat())];
const allHeels = [...new Set(Object.values(DEPT_HEELS).flat())];
const allSections = [...new Set(Object.values(DEPT_SECTIONS).flat())];

const SYSTEM_PROMPT = `You are a data entry assistant for Kins Footwear, an Indian footwear company.
Extract shoe entry fields from natural speech and return them as JSON.

Available options for each field (pick closest match — must be from this list):
- department: ${DEPARTMENTS.join(', ')}
- category: ${allCategories.join(', ')}
- sub_category: ${SUB_CATEGORIES.join(', ')}
- heels: ${allHeels.join(', ')}
- color: ${COLORS.join(', ')} (map names: black→BLK, white→WHT, brown→BRN, red→RED, blue→BLU, gold→GLD, silver→SIL, green→GRN, grey/gray→GRY, tan→TAN, nude→NUD, navy→NAV, orange→ORG, pink→PNK, purple→PPL, antique→ANT)
- section: ${allSections.join(', ')}
- season: ${SEASONS.join(', ')}

Free text fields (any value accepted):
- article_no, set_qty, size_set, pur_price

Rules:
1. Only include fields clearly mentioned
2. For select fields always pick from the exact list above
3. Ignore filler words like hi, okay, um, please, fill, add
4. Return ONLY valid JSON, no explanation`;

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    if (!transcript?.trim()) {
      return NextResponse.json({ fields: {} });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
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

    const fields = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error('parse-voice error:', err);
    return NextResponse.json({ fields: {} }, { status: 500 });
  }
}
