# bloom — Teach to Learn

An AI-powered learning tool where students teach concepts to an AI that acts as a curious, slightly confused student. By teaching, students discover and fill their own knowledge gaps — based on the Feynman Technique and the Protege Effect.

## How It Works

1. **Pick a topic** you want to learn
2. **Teach it to bloom** — the AI acts as your student
3. **bloom asks probing questions** that expose gaps in your understanding
4. **Self-correct and deepen** your knowledge
5. **Watch your garden grow** as mastery increases

## Tech Stack

- **Next.js 16** (App Router) — full-stack React
- **Supabase** — Postgres database + auth
- **OpenAI API** (GPT-4o) — AI engine
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **D3.js** — concept graph visualization

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Create the base application tables used by this app (`sessions`, `messages`, `concepts`, `gaps`, `concept_relationships`, `documents`, `chunks`)
3. In **SQL Editor**, run `supabase/rag.sql` to install production RAG infrastructure:
   - `session_documents` mapping table
   - `match_chunks_scoped` vector search function
   - retrieval indexes and RLS for `session_documents`
4. Copy your project URL and anon key from **Settings > API**

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Teaching Chat** — Stream responses from bloom as you explain concepts
- **Knowledge Garden** — SVG flowers that bloom as your mastery grows
- **Mastery Dashboard** — Track concept scores and detected knowledge gaps
- **Concept Graph** — D3 force-directed map of concept relationships
- **Session History** — Resume past teaching sessions
