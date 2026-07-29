import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../server/verifyUser.js';
import { groqChat } from '../../server/groq.js';
import { SKILLS, SUPPORTS } from '../../src/skills.js';
import { sanitizeExtractedDraft } from '../../src/extractValidation.js';

function buildPrompt(description: string): string {
  const skillLines = SKILLS.map(s => `${s.id}: ${s.label}`).join('\n');
  const supportLines = SUPPORTS.map(s => `${s.id}: ${s.label}`).join('\n');

  return `You are extracting structured information from a parent's free-text description of
their child (it may include pasted school/IEP language) to configure a practice app.

Extract these fields, using ONLY the exact ids listed below where an id is called for.
Omit a field (use null or an empty array) if the text doesn't clearly indicate it — do
not guess or invent details that aren't there.

- display_name: a short first name or nickname if mentioned, else null.
- grade: number 0-12 (0 = Kindergarten), or null.
- reading_level: number (grade equivalent), or null.
- strengths: array of skill ids (from SKILLS below) the child is already good at.
- focus: array of AT MOST 3 skill ids (from SKILLS below) that most need practice.
- supports: array of support ids (from SUPPORTS below) that help the child.
- session_length_min: number of minutes for a practice session, or null.
- interests: array of short free-text strings (things the child likes).

SKILLS (id: label):
${skillLines}

SUPPORTS (id: label):
${supportLines}

Return ONLY a raw JSON object with exactly these keys: display_name, grade,
reading_level, strengths, focus, supports, session_length_min, interests. No markdown
fences, no explanation outside the JSON.

Parent's description:
"""
${description}
"""`;
}

// PRIVACY: `description` may contain pasted IEP text with identifying details.
// It is used only to build the prompt above for this one request and must
// never be written to the DB, to any other table, or to logs — including
// this handler's own error paths, which intentionally log only static
// messages below rather than interpolating any error content that could
// somehow echo back part of the request or the model's response.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await verifyUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { description }: { description?: string } = req.body ?? {};
    if (!description || description.trim().length < 5) {
      return res.status(400).json({ error: 'Description is required' });
    }

    let text: string;
    try {
      text = await groqChat([{ role: 'user', content: buildPrompt(description) }], {
        temperature: 0.3,
        maxTokens: 1024,
      });
    } catch {
      // Genuine infra failure (Groq unreachable, auth, rate limit, etc) —
      // surface an error the parent can retry.
      console.error('Profile extraction: Groq request failed');
      return res.status(502).json({ error: 'Could not reach the extraction service' });
    }

    // Malformed/unparseable model output falls back to an empty draft
    // rather than erroring — the parent still lands on a usable confirm
    // screen and can fill everything in by hand.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: unknown = null;
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
    }

    res.status(200).json({ draft: sanitizeExtractedDraft(parsed) });
  } catch {
    console.error('Profile extraction: unexpected failure');
    res.status(500).json({ error: 'Profile extraction failed' });
  }
}
