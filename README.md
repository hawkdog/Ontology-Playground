# Ontology Playground (Preview) ☕

> Note: This project was developed with AI-assisted coding.

**[Try it live &#x2192; microsoft.github.io/Ontology-Playground](https://microsoft.github.io/Ontology-Playground/)**

[![Ontology Playground screenshot](public/og-image.png)](https://microsoft.github.io/Ontology-Playground/)

A free, open-source web application for learning about ontologies and
**Microsoft Fabric IQ**. Explore pre-built ontologies, design your own in a
visual editor, export as RDF/XML, and share interactive diagrams — all from a
fully static site with zero backend dependencies.

![Microsoft Fabric](https://img.shields.io/badge/Microsoft-Fabric-0078D4?style=flat-square&logo=microsoft)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

### Interactive Graph Exploration

Cytoscape.js-powered graph that renders any ontology as an interactive
node-and-edge diagram. Pan, zoom, click nodes to inspect properties, and use
the live search bar to filter entities and relationships.

### Ontology Catalogue

A curated library of official and community-contributed ontologies spanning six
domains (Retail, E-Commerce, Healthcare, Finance, Manufacturing, Education).
Browse by category, search by name or tags, load any ontology with one click,
and view its RDF source. Every ontology has a shareable deep link
(`/#/catalogue/official/cosmic-coffee`).

### Visual Ontology Designer

A full-screen, split-pane editor for creating ontologies from scratch or
editing existing ones. Add entity types with icons, colors, and typed
properties; define relationships with cardinalities; see a live graph preview
that updates as you work. Includes undo/redo (50 levels), real-time validation,
and export to RDF/XML or JSON.

### RDF Import & Export

Full round-trip support for RDF/XML (OWL classes, datatype properties, object
properties with cardinalities). Import `.rdf` / `.owl` files, export in the
exact format Microsoft Fabric IQ expects, and verify fidelity with automated
round-trip tests.

### One-Click Catalogue PR

Sign in with GitHub (device flow) and submit your ontology to the community
catalogue directly from the designer — the app forks the repo, creates a
branch, commits the RDF + metadata, and opens a pull request automatically.

### Embeddable Widget

A self-contained JavaScript file (`ontology-embed.js`) that renders an
interactive ontology viewer on any web page with a single `<script>` tag.
Supports dark/light themes, multiple loading methods (catalogue ID, URL,
inline base64), and click-to-inspect. See the
[Embedding Guide](docs/embed-guide.md) for details.

### Ontology School

A structured learning hub (`/#/learn`) with **9 courses** spanning conceptual
learning paths and hands-on labs:

- **Ontology Fundamentals** — 6 articles covering core concepts (What is an
  Ontology? → RDF/OWL → Fabric IQ → Build Your First → Design Patterns →
  Contributing)
- **7 Domain Learning Paths** — Fourth Coffee, E-Commerce, Finance, Healthcare,
  Manufacturing, University, and HR System. Each path has 4 progressive articles
  that build an ontology step-by-step, with live embedded graphs showing new
  entities at each stage.
- **IQ Lab: Retail Supply Chain** — A 7-step hands-on lab that builds a 15-entity
  ontology from scratch (3 → 15 entities across 6 progressive catalogue entries).

Every article supports **presentation mode** (slides split at `##` headings)
and includes **interactive quizzes** with instant feedback. Ontology embeds
load live graphs from the catalogue with optional diff highlighting.

### Quest System

Five progressive quests that guide users through ontology concepts with
multi-step instructions, hints, progress bars, and achievement badges.

### Natural Language Query Playground

Type natural language questions ("Which customers placed orders?") and see how
they map to ontology entities and relationships — a preview of Fabric IQ's
NL2Ontology capability.

### Project Analyzer

A generic product-analysis workspace (`/#/analysis`) for mapping repositories,
capabilities, features, mapped files, dependencies, MVP disposition, and release
timing. The default view is a layered interaction map that connects capabilities,
features, components, files, QA items, and roadmap items so teams can inspect
feature impact before slimming or rebuilding work. Selecting a map node focuses
its immediate network, dims unrelated items, and can collapse the canvas to only
the selected item's connected nodes. The project dashboards keep the persistent
Playground header available for moving between Analyzer, QA, Roadmap, catalogue,
and ontology tools. The Analyzer also includes an MVP Readiness tab that turns
the same model into a ship-decision board with readiness percentage, QA gaps,
mapping gaps, blockers, future-release items, and next actions. Readiness cards
can record the final MVP decision, owner, status, sign-off, cut-safety state,
saved next action, and dated progress notes before teams make branch changes.
The screen starts from a local JSON import or, when enabled for a private local
workspace, auto-loads the local Project Analyzer database so private product
maps can stay outside this public repository. File references can carry local
status labels such as mapped, existing, planned, orphan, and needs review, and
features can include roadmap signals from local planning docs. Local deployments
can also connect to a private Project Analyzer API for Load DB / Save DB
workflows. The included sample is fictional, can be hidden with an environment
flag, and exists only to demonstrate the workflow.

### QA Dashboard

A dedicated QA tracking screen (`/#/qa`) for testing queues, defects, blockers,
manual notes, mapped files, roadmap sources, and evidence attachments such as
screenshots or local image paths. QA items can be linked to features and files
while carrying tracker-style fields such as test ID, track, area, mode/tier,
result, next action, MVP blocker, Stripe blocker, automation coverage, source
document, and source section. Progress entries can include screenshots that
open in an in-app image gallery with saved path/source context. Browser-session
entries can be added from the dashboard and saved back to a private local
database or exported as JSON.

### Roadmap Dashboard

A dedicated roadmap intake screen (`/#/roadmap`) for reviewing roadmap docs,
planned work, deferred ideas, and active feature candidates before they become
implementation work. Roadmap items can stay lightweight with source document,
source section, phase, target, priority, repository, feature, and mapped-file
fields. When an item is ready, the dashboard can promote it into an active
feature while preserving the roadmap source link for later QA and file mapping.
Roadmap progress entries support the same in-app image gallery for planning
screenshots and evidence review.

### Command Palette & Keyboard Shortcuts

Press `⌘K` / `Ctrl+K` anywhere to open a searchable command palette. Jump
to the Catalogue, Designer, Ontology School, Import/Export, Help, and more without
leaving the keyboard. Press `?` for quick help access. Arrow keys + Enter to
navigate the palette.

### Starter Templates

The designer offers five domain templates (Retail, Healthcare, Finance, IoT,
Education) so new users never face a blank page. Each template creates 3
entities with properties and 2 relationships, ready to customise.

### Interactive Onboarding Tour

First-time visitors get a 5-step guided tour with a spotlight overlay that
highlights the Header, Graph, Quests, Inspector, and Designer in sequence.
Dismissable with a "don't show again" option persisted to `localStorage`.

### Deep Linking & URL Routing

Client-side hash routing with shareable URLs for every page:

| Route | Page |
|-------|------|
| `/#/` | Home (default ontology) |
| `/#/catalogue` | Ontology gallery |
| `/#/catalogue/<source>/<slug>` | Specific ontology (e.g. `/#/catalogue/official/cosmic-coffee`) |
| `/#/designer` | Visual designer |
| `/#/designer/<source>/<slug>` | Designer with catalogue ontology (e.g. `/#/designer/official/cosmic-coffee`) |
| `/#/analysis` | Project Analyzer |
| `/#/qa` | QA Dashboard |
| `/#/roadmap` | Roadmap Dashboard |
| `/#/learn` | Ontology School — course catalogue |
| `/#/learn/<course>` | Course detail — article list |
| `/#/learn/<course>/<article>` | Article view (with presentation mode) |

## Official Ontologies

| Domain | Ontology | Entities | Relationships |
|--------|----------|----------|---------------|
| Retail | Fourth Coffee | 6 | 7 |
| E-Commerce | Online Retail | 5 | 6 |
| Healthcare | Clinical System | 5 | 6 |
| Finance | Banking & Finance | 5 | 6 |
| Manufacturing | Industry 4.0 | 5 | 5 |
| Education | University System | 5 | 6 |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
cd Ontology-Playground
npm install
```

### Development

```bash
npm run dev
```

Visit http://localhost:5173

### Production Build

```bash
npm run build
```

The build pipeline compiles the catalogue, compiles learning content markdown,
type-checks, bundles the app, and builds the embed widget. Output is in
`build/`.

### Running Tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

## Deployment

### Azure Static Web Apps (primary)

The repo ships with a GitHub Actions workflow that deploys to Azure SWA on every
push to `main`.

1. Create a Static Web App in the Azure Portal
2. Connect to your GitHub repository
3. Copy the deployment token and add it as the GitHub secret
   `AZURE_STATIC_WEB_APPS_API_TOKEN_GREEN_PLANT_0BB1D2910`
4. Push to `main` — the workflow at
   `.github/workflows/azure-static-web-apps-green-plant-0bb1d2910.yml` handles
   the rest
5. PR preview environments are created automatically for pull requests

### GitHub Pages (for forks)

A separate workflow deploys to GitHub Pages, ideal for forks:

1. Fork this repo
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. Push to `main` — the workflow at `.github/workflows/deploy-ghpages.yml`
   builds and deploys to `https://<username>.github.io/<repo-name>/`

The `VITE_BASE_PATH` env var is set automatically to `/<repo-name>/` during the
GitHub Pages build so asset paths resolve correctly.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_AI_BUILDER` | `false` | Enable the Azure OpenAI ontology builder |
| `VITE_ENABLE_LEGACY_FORMATS` | `false` | Enable JSON/YAML/CSV import/export formats |
| `VITE_BASE_PATH` | `/` | Base path for the app (set automatically for GitHub Pages) |
| `VITE_GITHUB_CLIENT_ID` | *(empty)* | GitHub OAuth App client ID for one-click catalogue PRs ([setup guide](docs/github-oauth-setup.md)) |
| `VITE_GITHUB_OAUTH_BASE` | *(empty)* | External OAuth proxy URL for GitHub Pages deployments (e.g. Cloudflare Worker URL) |
| `VITE_PROJECT_ANALYSIS_API_URL` | `http://localhost:3008` | Optional private Project Analyzer API used by the local Load DB / Save DB controls |
| `VITE_PROJECT_ANALYSIS_SHOW_SAMPLES` | `true` | Set to `false` in local private workspaces to hide fictional Project Analyzer sample loaders |
| `VITE_PROJECT_ANALYSIS_AUTO_LOAD` | `false` | Set to `true` in local private workspaces to load the private Project Analyzer database on page open |

## Project Structure

```
Ontology-Playground/
├── src/
│   ├── components/       # React components (graph, designer, modals, learn page)
│   ├── data/             # Ontology model, query engine, quest definitions
│   ├── lib/              # Router, RDF parser/serializer, catalogue helpers
│   ├── store/            # Zustand stores (app state, designer state)
│   ├── styles/           # CSS (Microsoft Fluent-inspired dark/light themes)
│   └── types/            # TypeScript type definitions
├── catalogue/            # Official + community ontology RDF files
├── content/learn/        # Course directories with markdown articles, quizzes, and metadata
├── scripts/              # Build-time compilers (catalogue, learning content)
├── api/                  # Azure Functions backend (optional, for AI builder)
├── docs/                 # Guides and documentation
├── public/               # Static assets (compiled catalogue.json, learn.json)
└── .github/workflows/    # CI/CD (Azure SWA + GitHub Pages)
```

## Documentation

The table below lists the main end-user and contributor guides. Internal planning notes (for example, `docs/TODO-*.md`) are intentionally not part of the published documentation set.

| Guide | Description |
|-------|-------------|
| [Ontology Authoring Guide](docs/authoring-guide.md) | How to create ontologies that work well in the Playground — field-by-field reference, best practices, and a step-by-step walkthrough |
| [Contribute an Ontology: From Design to GitHub](docs/contributing-ontology-from-design-to-github.md) | End-to-end contributor workflow: design, RDF export, metadata, local validation, and pull request |
| [Playground Feature Demo Guide](docs/playground-features-demo-guide.md) | Step-by-step demo script to showcase key Playground capabilities and connect them to Fabric IQ and Real-Time Intelligence |
| [Ontology School Demo Guide](docs/ontology-school-demo-guide.md) | Step-by-step live demo plan for courses, embeds, quizzes, presentation mode, and learning workflow |
| [Embedding Guide](docs/embed-guide.md) | How to embed interactive ontology widgets on any web page |
| [GitHub OAuth Setup](docs/github-oauth-setup.md) | How to configure GitHub OAuth for one-click catalogue PRs |
| [Embed Security](docs/embed-security.md) | Security model for the embeddable widget |
| [Learning Content Guide](docs/learn-content-guide.md) | How to author courses, articles, quizzes, and ontology embeds for the Ontology School |
| [Ontology School Review Workflow](docs/ontology-school-review-workflow.md) | Human review and approval flow for school lesson content |
| [Theme Authoring Guide](docs/theme-authoring-guide.md) | How to plug a new color theme into the Playground — token contract, the appStore + CSS steps, and contrast gotchas |

## AI Agent Quickstart

This repository includes Copilot customization files so agents can reliably:

- import customer RDF/OWL into catalogue-ready format
- generate progressive Ontology School modules
- route lesson content through human review workflows

Included assets:

- Skills:
   - `.github/skills/ontology-catalog-import/` — import external/customer RDF/OWL into catalogue format
   - `.github/skills/ontology-school-path-generator/` — generate progressive Ontology School modules
   - `.github/skills/community-ontology-contribution/` — add a contributor ontology under `catalogue/community/` with the correct directory structure, metadata, and validation
   - `.github/skills/name-generator/` — generate person names for examples, demos, quests, tests, and sample data from the approved CSV fixture
- RDF intake instruction:
   - `.github/instructions/rdf-intake.instructions.md`
- Reusable prompts:
   - `.github/prompts/import-rdf-to-catalog.prompt.md`
   - `.github/prompts/generate-ontology-school-module.prompt.md`

Recommended validation before merge:

```bash
npm run qa:tutorial-content
npm run build
```

## Technologies

- **React 19** + TypeScript 5
- **Cytoscape.js** — Graph visualization (fcose layout)
- **Zustand** — State management
- **Vite** — Build tool
- **Framer Motion** — Animations
- **Lucide Icons** — Icon library
- **marked** — Markdown compilation (build-time)

## Learn More

- [Microsoft Fabric IQ Ontology Documentation](https://learn.microsoft.com/en-us/fabric/iq/ontology/overview)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)

## License

MIT

## Trademark Notice

Trademarks This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow Microsoft’s Trademark & Brand Guidelines. Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.
