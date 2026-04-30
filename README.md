# AR Floor Plan Analyzer

A local Vite + React + Three.js prototype that generates 2D and 3D home layouts from a natural-language prompt.

The app now uses **Ollama locally** for prompt analysis instead of blueprint image detection. You describe the home, for example “2 BHK apartment, kitchen near entrance, living room in the center, two bathrooms along the living room,” and the app converts that into room rectangles for the 2D plan and Three.js model.

## Setup

Install and start Ollama, then pull a model:

```bash
ollama pull llama3.2
ollama serve
```

Optional `.env.local`:

```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Run the app:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Workflow

1. Describe the home layout in the prompt box.
2. The local Vite API calls Ollama and asks for structured room JSON.
3. The app validates the rooms and renders a clean 2D layout.
4. Start the Three.js view to see the generated rooms as a 3D model with walls, floors, labels, and furniture.
5. Voice commands can change style, wall color, furniture, and wall layers.

## Fallback

If Ollama is not running or the selected model is missing, the app uses a local rule-based parser. That fallback keeps the demo usable, but Ollama gives better results for detailed prompts.

## Limitations

- This is a hackathon prototype, not an architectural CAD solver.
- Room placement is approximate and rectangular.
- Ollama must be installed locally for AI prompt planning.
- The AR view is a lightweight simulation mode for stability.

## Future Scope

- Add room adjacency editing.
- Add door/window placement from prompt constraints.
- Export GLB or SVG.
- Support multi-floor homes.
- Add cost/material estimation from the generated room graph.
