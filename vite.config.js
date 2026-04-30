import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_OLLAMA_MODEL = 'llama3.2';

const roomColors = ['#71d4ff', '#f5c46b', '#8be0a4', '#d89bff', '#ff9d9d', '#94a3b8'];

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function numberFromText(text, patterns, fallback = 0) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Math.max(0, Number(match[1]));
  }
  return fallback;
}

function parseDimension(text, label) {
  const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x|by|\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:m|meter|metre|ft|feet|foot)?[^.\\n,;]*${label}|${label}[^.\\n,;]*(\\d+(?:\\.\\d+)?)\\s*(?:x|by|\\*)\\s*(\\d+(?:\\.\\d+)?)`, 'i');
  const match = text.match(pattern);
  if (!match) return null;
  const width = Number(match[1] || match[3]);
  const height = Number(match[2] || match[4]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

function normalizeGeneratedRooms(rooms) {
  const valid = (rooms || [])
    .filter((room) => room?.label)
    .map((room, index) => {
      const x = Number(room.x);
      const y = Number(room.y);
      const width = Number(room.width);
      const height = Number(room.height);
      return {
        id: `generated-${index + 1}-${String(room.label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: String(room.label).slice(0, 32),
        x: Math.max(0, Math.min(1000, Number.isFinite(x) ? x : 0)),
        y: Math.max(0, Math.min(1000, Number.isFinite(y) ? y : 0)),
        width: Math.max(60, Math.min(1000, Number.isFinite(width) ? width : 160)),
        height: Math.max(60, Math.min(1000, Number.isFinite(height) ? height : 140)),
        color: roomColors[index % roomColors.length],
        height3d: Number(room.height3d) || 1.1,
        areaSqFt: Number(room.areaSqFt) || undefined
      };
    })
    .filter((room) => room.x + room.width <= 1040 && room.y + room.height <= 1040);

  if (valid.length < 3) return [];
  return valid.slice(0, 12);
}

function areaFromRelativeSize(width, height) {
  return Math.round((width * height) / 650);
}

function textHas(text, words) {
  return words.some((word) => text.includes(word));
}

function inferRequirements(prompt, aiRequirements = {}) {
  const text = prompt.toLowerCase();
  const explicitBedrooms = numberFromText(text, [/(\d+)\s*bhk/, /(\d+)\s*bed(?:room)?s?/], 0);
  const bedroomCount = Math.max(
    1,
    explicitBedrooms || Number(aiRequirements.bedroomCount) || (text.includes('studio') ? 0 : 2)
  );
  const explicitBathrooms = numberFromText(text, [/(\d+)\s*bath(?:room)?s?/], 0);
  const bathroomCount = Math.max(
    1,
    explicitBathrooms || Number(aiRequirements.bathroomCount) || (bedroomCount > 1 ? 2 : 1)
  );

  const hasBalcony = Boolean(aiRequirements.hasBalcony) || textHas(text, ['balcony', 'patio', 'terrace']);
  const hasEntrance = Boolean(aiRequirements.hasEntrance) || textHas(text, ['entrance', 'entry', 'foyer', 'front']);
  const hasStudy = Boolean(aiRequirements.hasStudy) || textHas(text, ['study', 'office', 'work']);
  const masterAttachedBath = Boolean(aiRequirements.masterAttachedBath) || /master[^.]*attached|attached[^.]*master/.test(text);
  const bedroomsOnThirdSide = /third side|3rd side/.test(text);
  const isLinear = /linear|straight|single line|not spread/.test(text);

  return {
    bedroomCount,
    bathroomCount,
    hasBalcony,
    hasEntrance,
    hasStudy,
    masterAttachedBath,
    kitchenSide: aiRequirements.kitchenSide || (textHas(text, ['kitchen near the entrance', 'kitchen at entrance']) ? 'left' : 'left'),
    balconySide: aiRequirements.balconySide || 'top',
    bedroomSide: aiRequirements.bedroomSide || (bedroomsOnThirdSide ? 'right' : 'right'),
    livingDimension: parseDimension(prompt, 'living'),
    isLinear
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function buildConstraintLayout(prompt, aiRequirements = {}, source = 'local planner') {
  const requirements = inferRequirements(prompt, aiRequirements);
  const rooms = [];
  const add = (label, x, y, width, height) => {
    const room = {
      label,
      x,
      y,
      width,
      height,
      areaSqFt: areaFromRelativeSize(width, height)
    };
    if (!rooms.some((existing) => rectsOverlap(existing, room))) rooms.push(room);
  };

  if (requirements.isLinear) {
    add('Entrance', 50, 330, 135, 155);
    add('Living Room', 215, 300, 275, 215);
    add('Kitchen', 520, 300, 215, 215);
    add(requirements.bedroomCount === 1 ? 'Bedroom' : 'Master Bedroom', 765, 300, 220, 215);
    add('Bath 1', 805, 545, 145, 120);

    for (let index = 1; index < requirements.bedroomCount; index += 1) {
      add(`Bedroom ${index + 1}`, 765, 55 + (index - 1) * 230, 220, 195);
    }
    for (let index = 1; index < requirements.bathroomCount; index += 1) {
      add(`Bath ${index + 1}`, 520 + (index - 1) * 160, 545, 130, 120);
    }

    return {
      rooms: normalizeGeneratedRooms(rooms),
      notes:
        `${source}: used a compact linear planner. ` +
        `Entrance, living room, kitchen, and bedroom are arranged in one line, with only ${requirements.bedroomCount} bedroom${requirements.bedroomCount === 1 ? '' : 's'} from the prompt.`
    };
  }

  const livingWidth = requirements.livingDimension ? Math.max(280, Math.min(360, requirements.livingDimension.width * 95)) : 320;
  const livingHeight = requirements.livingDimension ? Math.max(240, Math.min(320, requirements.livingDimension.height * 95)) : 270;
  const livingX = 350;
  const livingY = 300;

  if (requirements.hasBalcony) add('Balcony', livingX + 20, 140, livingWidth - 40, 120);
  add('Living Room', livingX, livingY, livingWidth, livingHeight);

  if (requirements.hasEntrance) add('Entrance', livingX, livingY + livingHeight + 45, 180, 130);
  add('Kitchen', 80, requirements.hasEntrance ? livingY + 30 : livingY, 230, 220);

  const bedroomX = 740;
  for (let index = 0; index < requirements.bedroomCount; index += 1) {
    const label = index === 0 && (requirements.masterAttachedBath || requirements.bedroomCount > 1) ? 'Master Bedroom' : `Bedroom ${index + 1}`;
    const y = index === 0 ? 140 : 510 + (index - 1) * 245;
    add(label, bedroomX, y, 220, 220);
  }

  if (requirements.bathroomCount >= 1) {
    const attachedLabel = requirements.masterAttachedBath ? 'Master Bath' : 'Bath 1';
    add(attachedLabel, 780, 380, 160, 110);
  }
  if (requirements.bathroomCount >= 2) add('Bath 2', livingX + livingWidth - 20, 145, 80, 120);
  for (let index = 2; index < requirements.bathroomCount; index += 1) add(`Bath ${index + 1}`, 80, 120 + index * 135, 125, 115);

  if (requirements.hasStudy) add('Study', 80, 120, 220, 170);

  return {
    rooms: normalizeGeneratedRooms(rooms),
    notes:
      `${source}: used a constraint-based non-overlap planner. ` +
      `Living room is central, kitchen is on a different side from the balcony, bedrooms are grouped on the third side, and bathrooms are placed by the master/balcony.`
  };
}

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return JSON.parse(text.slice(start, end + 1));
  }
}

async function generateWithOllama(prompt, env) {
  const model = env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const ollamaUrl = env.OLLAMA_URL || 'http://localhost:11434';
  const instruction = `
You extract architectural requirements from a home layout prompt.
Return only valid JSON. Do not use markdown.
Do not generate coordinates.
JSON schema:
{
  "bedroomCount": 2,
  "bathroomCount": 2,
  "hasBalcony": true,
  "hasEntrance": true,
  "hasStudy": false,
  "masterAttachedBath": true,
  "kitchenSide": "left",
  "balconySide": "top",
  "bedroomSide": "right",
  "notes": "short explanation"
}
User request:
${prompt}
`;

  const response = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: instruction,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.18,
        num_predict: 900
      }
    }),
    signal: AbortSignal.timeout(22000)
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const payload = await response.json();
  const requirements = extractJson(payload.response);
  if (!requirements || typeof requirements !== 'object') throw new Error('Ollama returned no valid requirements.');
  return buildConstraintLayout(prompt, requirements, `Ollama ${model} requirements`);
}

function promptLayoutPlugin(env) {
  return {
    name: 'ollama-prompt-layout-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-layout', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await readRequestBody(req);
          const { prompt } = JSON.parse(body || '{}');
          if (!prompt || prompt.trim().length < 8) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Describe the home layout in one or two sentences.' }));
            return;
          }

          let result;
          try {
            result = await generateWithOllama(prompt.trim(), env);
          } catch (error) {
            result = buildConstraintLayout(prompt.trim());
            result.notes += ` Ollama detail: ${error.message}`;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), promptLayoutPlugin(env)],
    server: {
      host: '0.0.0.0'
    }
  };
});
