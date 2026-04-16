<!-- <CENTERED SECTION FOR GITHUB DISPLAY> -->

<div align="center">
<h1>Glintly</h1>
</div>

> Prompt → production-ready application, running live in a sandbox in 15 seconds. Your agent writes it. Your browser previews it. One click pushes it to GitHub.

>
> AI-driven Next.js project generation, live E2B sandbox preview, built-in file explorer, and one-click GitHub push — all behind a tRPC + Prisma + Inngest backbone. <br />
> Built for the age when "can you ship me a landing page?" is a chat message, not a sprint.
>
> | [<img alt="GitHub Follow" src="https://img.shields.io/github/followers/Aditya-PS-05?style=flat-square&logo=github&labelColor=black&color=24292f" width="156px" />](https://github.com/Aditya-PS-05) | Follow [@Aditya-PS-05](https://github.com/Aditya-PS-05) on GitHub for more projects. Hacking on AI infrastructure, developer tooling, and everything in between. |
> | :-----| :----- |

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15-0073FF?labelColor=black&logo=nextdotjs&style=flat-square)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-0073FF?labelColor=black&logo=react&style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-0073FF?labelColor=black&logo=typescript&style=flat-square)](https://www.typescriptlang.org)
[![GitHub Contributors](https://img.shields.io/github/contributors/Aditya-PS-05/Glintly?color=0073FF&labelColor=black&style=flat-square)](https://github.com/Aditya-PS-05/Glintly/graphs/contributors)
[![GitHub Forks](https://img.shields.io/github/forks/Aditya-PS-05/Glintly?color=0073FF&labelColor=black&style=flat-square)](https://github.com/Aditya-PS-05/Glintly/network/members)
[![GitHub Stars](https://img.shields.io/github/stars/Aditya-PS-05/Glintly?color=0073FF&labelColor=black&style=flat-square)](https://github.com/Aditya-PS-05/Glintly/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Aditya-PS-05/Glintly?color=0073FF&labelColor=black&style=flat-square)](https://github.com/Aditya-PS-05/Glintly/issues)
[![License](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](https://github.com/Aditya-PS-05/Glintly/blob/main/LICENSE)

</div>

<!-- </CENTERED SECTION FOR GITHUB DISPLAY> -->

> **Clone, set four env vars, run [`pnpm dev`](#quick-start), and describe the app you want — Glintly's agent will write the code, spin it up in a sandbox, and show you the live URL.**

| Prompt → Project | Live Preview |
|:---:|:---:|
| ![Prompt UI](.github/assets/prompt-ui.png) | ![Sandbox Preview](.github/assets/sandbox-preview.png) |

| File Explorer |
|:---:|
| ![File Explorer](.github/assets/file-explorer.png) |

> Open any generated project to see the agent's conversation, the live sandbox preview, and every file it wrote — side-by-side in a resizable split pane. One click pushes it to a new GitHub repo.

## Overview

**Glintly** (shipped as the `glintly` Next.js app) lets users describe an app in plain English and watch an AI agent build it in real time. The agent runs inside an isolated [E2B](https://e2b.dev) micro-VM with hot-reloading Next.js 15, has three tools (`terminal`, `createOrUpdateFiles`, `readFiles`), and streams results back through an [Inngest](https://www.inngest.com/) job queue. When it finishes, you get a live preview URL, a browsable file tree, and — if you signed in with GitHub — a button that creates a new repo with the generated code.

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router, Turbopack) + React 19, Tailwind CSS 4, Radix UI (shadcn/ui) |
| **API** | [tRPC 11](https://trpc.io) with SuperJSON, typed end-to-end |
| **Database** | [Prisma 6](https://www.prisma.io) ORM + PostgreSQL (Projects, Messages, Fragments, Auth) |
| **Auth** | [NextAuth 4](https://next-auth.js.org) — Google, GitHub (scoped to `public_repo`), credentials |
| **Jobs** | [Inngest 3](https://www.inngest.com) — durable agent runs with step-level retries |
| **Agent** | [`@inngest/agent-kit`](https://agentkit.inngest.com) driving OpenAI GPT-4 |
| **Sandbox** | [E2B `code-interpreter`](https://e2b.dev) — custom Next.js template with hot reload |
| **Deploy** | Vercel (app) + Neon / Supabase / any managed Postgres |

Each user prompt creates a `Project`, which owns a thread of `Message` records. Completed runs store a `Fragment` — the sandbox URL, the generated files, and the agent's summary — which the UI renders as a tabbed preview. GitHub push is per-fragment: every push is path-sanitized, rate-limited, and scoped to the files the agent actually wrote.

### Why "Glintly"?

A *glint* is a quick flash of light — the moment an idea catches. That's the feel we want: type a sentence, see a running app flicker into existence. The goal is not a chat window that eventually produces a zip file; it's a *real* Next.js project, running in a *real* environment, pushed to a *real* repo, in the time it takes to write the sentence describing it.

In the era of AI-assisted development, the bottleneck has moved from *writing code* to *setting up the environment to write code in*. Dev servers, package installs, boilerplate, repo initialization, deploy config — all of it is friction between an idea and a running thing. Glintly collapses the entire loop: **idea → running app → GitHub repo**, with the human reading and editing in the middle instead of bootstrapping.

## Contents

- [Overview](#overview)
  - [Why "Glintly"?](#why-glintly)
- [Features](#features)
- [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [E2B Sandbox Template](#e2b-sandbox-template)
- [Usage](#usage)
  - [Creating a Project](#creating-a-project)
  - [Exploring Generated Code](#exploring-generated-code)
  - [Pushing to GitHub](#pushing-to-github)
  - [Running Inngest Locally](#running-inngest-locally)
- [Security Model](#security-model)
- [Development](#development)
  - [Scripts](#scripts)
  - [Testing](#testing)
  - [Database Commands](#database-commands)
  - [E2B Commands](#e2b-commands)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)
- [License](#license)

## Features

- **Prompt-to-App** — Describe an app; an agent (`codeAgent` in `src/inngest/functions.ts`) writes it file by file inside an isolated sandbox.
- **Live Preview** — Each generated project exposes a sandbox URL. The UI embeds it in the "Demo" tab, hot-reloaded as the agent writes.
- **File Explorer** — Browsable tree of every file the agent created, with syntax-highlighted viewer (Prism).
- **One-Click GitHub Push** — Sign in with GitHub, pick a repo name, and Glintly commits every sanitized file to a fresh repo. Public or private, your choice.
- **Path-Sanitized** — Generated files are filtered before push: `.github/**`, `.env*`, path traversal, and absolute paths are rejected so prompt injection can't plant a malicious workflow.
- **Sandbox Command Guard** — The agent's `terminal` tool runs through an allow-list (`ls`, `npm`, `pnpm`, `node`, `next`, ...). `curl`, `wget`, `ssh`, `sudo`, `/dev/tcp` redirection, and env-var exfiltration are blocked.
- **Multi-Message Threads** — Each project is a conversation. Re-prompt, iterate, or ask the agent to explain — messages and fragments live in Postgres.
- **Typed End-to-End** — tRPC + Zod + SuperJSON. Changing a router changes the client type instantly.
- **Durable Background Jobs** — Inngest runs each agent turn with step-level retries and a concurrency-safe sandbox lifecycle.
- **Per-User Rate Limits** — `projects.create` is capped at 10/hour and `pushToGitHub` at 5/hour per user — the agent costs money to run, and this keeps a single account from burning it.
- **Scoped OAuth** — GitHub sign-in requests `public_repo` only (not full `repo`). Enough to create public repos and push files; not enough to read private code.
- **Resizable Split Pane** — Messages on the left, preview/code on the right, drag the divider. Powered by `react-resizable-panels`.
- **Auth Providers** — Google, GitHub, and classic email+password (bcrypt cost 12) via NextAuth.
- **Static Deploy** — Deploys to Vercel on every push to `main` after CI passes.
- **Tested** — Jest unit suite for auth logic, validation, path sanitizer, command guard, and rate limiter.

## Installation

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Aditya-PS-05/Glintly
cd Glintly
pnpm install

# 2. Configure environment (copy and fill in)
cp .env.example .env

# 3. Apply database migrations
pnpx prisma migrate dev

# 4. Start the app
pnpm dev

# 5. In a second terminal, start Inngest (required for agent runs)
pnpm dlx inngest-cli@latest dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and describe an app.

See [Environment Variables](#environment-variables) for a full description of each key.

### Prerequisites

- **Node.js** 20+ — [install](https://nodejs.org/)
- **pnpm** 9+ — `npm install -g pnpm` or [install](https://pnpm.io/installation)
- **PostgreSQL** 15+ — local, Docker, or a managed service (Neon, Supabase, Railway)
- **E2B account** — [sign up](https://e2b.dev) and install the CLI: `npm install -g @e2b/cli && e2b auth login`
- **OpenAI API key** — the default agent model is `gpt-4` via `@inngest/agent-kit` ([get a key](https://platform.openai.com/api-keys))
- **(Optional) GitHub OAuth app** — needed for "Push to GitHub" and GitHub sign-in. [Create one](https://github.com/settings/applications/new) with callback `http://localhost:3000/api/auth/callback/github`
- **(Optional) Google OAuth app** — needed for Google sign-in. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Environment Variables

Glintly reads config from `.env` (local dev) or environment variables (Vercel / production). All keys are required unless marked optional.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `NEXTAUTH_SECRET` | Random 32+ byte string for NextAuth session encryption (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Canonical URL of the deployment (`http://localhost:3000` in dev) |
| `OPENAI_API_KEY` | Used by the Inngest agent for code generation |
| `E2B_API_KEY` | Used by `@e2b/code-interpreter` to create sandboxes |
| `GITHUB_CLIENT_ID` _(optional)_ | GitHub OAuth client ID (required for GitHub sign-in + repo push) |
| `GITHUB_CLIENT_SECRET` _(optional)_ | GitHub OAuth client secret |
| `GOOGLE_CLIENT_ID` _(optional)_ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` _(optional)_ | Google OAuth client secret |
| `INNGEST_EVENT_KEY` _(prod only)_ | Set automatically by the Inngest dev CLI in dev |
| `INNGEST_SIGNING_KEY` _(prod only)_ | Set automatically by the Inngest dev CLI in dev |
| `UPSTASH_REDIS_REST_URL` _(optional)_ | Upstash Redis REST URL — enables distributed rate limiting in serverless |
| `UPSTASH_REDIS_REST_TOKEN` _(optional)_ | Upstash Redis REST token (paired with `UPSTASH_REDIS_REST_URL`) |
| `NEXT_PUBLIC_APP_URL` _(optional)_ | Absolute URL used by the tRPC browser client (defaults to relative) |

> **Note:** The GitHub OAuth app requests the `public_repo` scope by default. If you need to push to private repos, edit `src/lib/auth.ts:55` to request `repo` instead — but see the [Security Model](#security-model) for tradeoffs.

### Database Setup

Glintly uses Prisma with PostgreSQL. The generated client is output to `src/generated/prisma/` (instead of `node_modules/.prisma`) so it ships with the app bundle.

```bash
# Apply migrations and generate the client
pnpx prisma migrate dev

# If the client is missing (first install or fresh clone)
pnpx prisma generate

# Inspect data interactively
pnpx prisma studio
```

The schema (`prisma/schema.prisma`) defines five models: `User`, `Account`, `Session`, `VerificationToken` (standard NextAuth adapter models), plus `Project`, `Message`, and `Fragment` for the application domain.

### E2B Sandbox Template

The agent runs inside a custom E2B template with a preconfigured Next.js + shadcn/ui scaffold. The `sandbox-templates/` directory contains the Dockerfile and `compile_page.sh` that the E2B CLI uses to build the template.

```bash
# One-time: build and publish the web (Next.js) template
cd sandbox-templates/nextjs
e2b template build --name glintly-nextjs --cmd "/compile_page.sh"

# One-time: build and publish the mobile (Expo) template
cd ../expo
e2b template build --name glintly-expo --cmd "/compile_page.sh"

# Inspect active sandboxes across all your runs
e2b sandbox list
```

The template names `glintly-nextjs` (web) and `glintly-expo` (mobile) are referenced in `src/inngest/functions.ts`. If you publish under different names, update the `TEMPLATES` record.

## Usage

### Creating a Project

1. Sign in (Google / GitHub / email).
2. On the home page, describe the app you want: *"A Pomodoro timer with a dark theme and a settings drawer"*.
3. Glintly creates a `Project`, fires an Inngest event, and redirects you to the project view.
4. Watch the agent work in real time: messages stream in on the left, the sandbox URL appears on the right as soon as the first files are written.

Each prompt is capped at **10,000 characters** and each user is limited to **10 new projects per hour** (see `src/modules/projects/server/procedures.ts`).

### Exploring Generated Code

Inside a project, the right-hand panel has two tabs:

- **Demo** — an iframe pointing at the sandbox URL. Fully live; the Next.js dev server inside the sandbox reloads as the agent edits files.
- **Code** — a file tree of every file the agent wrote, with syntax-highlighted viewer (Prism).

You can re-prompt in the same project to iterate: *"Add a session counter"*, *"Switch the primary color to green"*, *"Add a reset button"*. Each turn produces a new `Fragment` — the latest one is what "Push to GitHub" uses.

### Pushing to GitHub

If you signed in with GitHub (and the app has the `public_repo` scope), every project view gets a **Push to GitHub** button:

1. Click it, pick a repo name.
2. Glintly sanitizes every generated file path (rejects `.github/**`, traversal, dotenvs, absolute paths, files over 1 MB).
3. It creates a fresh repo on your account and commits every sanitized file via the GitHub Contents API.
4. You get a repo URL.

**Limits:** 5 pushes per hour per user; max 200 files per push; max 1 MB per file. Generated code with `.env.local`, `.github/workflows/*`, or similar sensitive paths is silently dropped (and listed in the response under `rejected`).

### Running Inngest Locally

The agent runs as an Inngest function. In development, you need the Inngest Dev CLI to act as the event broker and function runner:

```bash
# In a second terminal, alongside `pnpm dev`
pnpm dlx inngest-cli@latest dev
```

The Inngest dashboard at [http://localhost:8288](http://localhost:8288) shows every event, step retry, and agent turn — invaluable for debugging.

## Security Model

- **Scoped OAuth** — GitHub sign-in requests `public_repo` only, not full `repo`. Enough to create public repos, not enough to read private code.
- **Path Sanitization** — Every file pushed to GitHub goes through `sanitizeFilesForGitHub` (`src/lib/sanitize-paths.ts`): rejects `.github/**`, `.git/**`, `.env*`, `.ssh/**`, absolute paths, null bytes, path traversal. Caps at 200 files and 1 MB per file.
- **Command Allow-List** — The agent's `terminal` tool runs every command through `checkCommand` (`src/lib/sandbox-command-guard.ts`). Allowed: `ls`, `npm`, `pnpm`, `node`, `next`, `tsc`, `jest`, ... Blocked: `curl`, `wget`, `ssh`, `scp`, `sudo`, `/dev/tcp` redirection, env-var exfiltration, commands over 4KB.
- **Sandbox Isolation** — All agent execution happens in E2B micro-VMs. Your server never runs LLM-authored code directly.
- **Rate Limits** — Per-user caps on expensive operations (`projects.create` 10/hr, `pushToGitHub` 5/hr) to bound cost and blast radius.
- **Session Upsert on Sign-In** — OAuth users are upserted on `signIn`, not on every session read — no race conditions under concurrent requests.
- **Bcrypt Cost 12** — Credentials-provider passwords are hashed with bcrypt at cost factor 12.
- **Tenant Isolation** — Every `projects` procedure scopes queries by `userId`; no project or fragment is returnable across accounts.
- **Prompt Injection Caveat** — The agent processes untrusted user input. The sandbox + sanitizer limit the *blast radius* of a successful prompt injection, but they do not prevent the agent from writing *incorrect* code. Always review generated code before merging to your own projects.

See [`docs/security.md`](./docs/security.md) for the full threat model and the rationale behind each limit.

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (Turbopack, port 3000) |
| `pnpm build` | Build for production |
| `pnpm start` | Run the production server |
| `pnpm lint` | Run `next lint` (ESLint) |
| `pnpm test` | Run Jest unit tests |
| `pnpm test:watch` | Jest in watch mode |
| `pnpm test:coverage` | Jest with coverage report |
| `pnpm dlx inngest-cli@latest dev` | Start the Inngest dev broker |

### Testing

```bash
# Run the full suite
pnpm test

# Watch mode while editing
pnpm test:watch

# Coverage report → coverage/
pnpm test:coverage

# Run one suite
pnpm exec jest --testPathPatterns='lib/sanitize-paths'
```

Current coverage focuses on the highest-risk units:

- `lib/sanitize-paths` — GitHub-push path filter
- `lib/sandbox-command-guard` — agent shell allow-list
- `lib/rate-limit` — per-user throttling
- `lib/validations/auth` — registration + sign-in zod schemas
- `app/api/auth/register` — registration route
- `modules/auth/auth-logic` — NextAuth callbacks

Integration tests for the tRPC layer and the Inngest agent are on the roadmap — contributions welcome.

### Database Commands

```bash
# Apply pending migrations in dev
pnpx prisma migrate dev

# Create a new migration from schema changes
pnpx prisma migrate dev --name <short-description>

# Reset dev database (drop + re-migrate + seed)
pnpx prisma migrate reset

# Regenerate the Prisma client only
pnpx prisma generate

# GUI data browser
pnpx prisma studio
```

### E2B Commands

```bash
# Build / update the sandbox template
cd sandbox-templates
e2b template build --name glintly-nextjs --cmd "/compile_page.sh"

# List active sandboxes (useful when an agent run stalls)
e2b sandbox list

# Auth
e2b auth login
```

Sandboxes auto-terminate, but if an Inngest run is stuck, `e2b sandbox list` + the Inngest dashboard are the fastest way to diagnose.

## Deployment

Glintly is designed to deploy to **Vercel** (app) with **Neon / Supabase / Railway** (Postgres) and **Inngest Cloud** (durable jobs).

**First-time deploy:**

1. Push the repo to GitHub.
2. Create a Vercel project pointed at the repo.
3. Add the [environment variables](#environment-variables) to the Vercel project (Production + Preview).
4. Provision a Postgres database; copy the URL into `DATABASE_URL`.
5. In Inngest Cloud, add a new app pointing at `https://<your-deployment>/api/inngest`. Copy the signing + event keys into Vercel.
6. Run migrations against the production DB: `DATABASE_URL=<prod-url> pnpx prisma migrate deploy`.
7. Deploy (push to `main`).

## Contributing

Contributions are welcome. A good first PR:

1. Fork the repo and create a feature branch.
2. Make your change, add a test under `src/__tests__/`.
3. Run the local CI checks:
   ```bash
   pnpm install --frozen-lockfile
   pnpx prisma generate
   pnpm exec tsc --noEmit
   pnpm run test
   pnpm run lint
   pnpm run build
   ```
4. Commit with a [Conventional Commits](https://www.conventionalcommits.org/) message (`feat:`, `fix:`, `docs:`, `chore:`).
5. Open a PR explaining the *why* as well as the *what*.

**Good first issues:**

- Add `isPrivate` toggle to the GitHub push dialog (backend already supports it).
- Add integration tests for `projects.pushToGitHub` (path traversal, missing fragment, non-GitHub session).
- Swap the in-memory rate limiter for Redis / Upstash so limits work across multiple server instances.
- Stream Inngest step updates into the messages UI so users see the agent working turn-by-turn.

## Acknowledgments

- [Next.js](https://nextjs.org), [React](https://react.dev), and [Vercel](https://vercel.com) for the frontend and deployment substrate
- [E2B](https://e2b.dev) for the sandbox runtime that makes it safe to run agent-authored code
- [Inngest](https://www.inngest.com) and [`@inngest/agent-kit`](https://agentkit.inngest.com) for the durable agent infrastructure
- [tRPC](https://trpc.io), [Prisma](https://www.prisma.io), and [Zod](https://zod.dev) for end-to-end type safety
- [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) + [Tailwind CSS](https://tailwindcss.com) for the design system
- [NextAuth.js](https://next-auth.js.org) for auth plumbing

## License

<p align="center">
  <strong>MIT © <a href="https://github.com/Aditya-PS-05">Aditya Pratap Singh</a></strong>
</p>

If you find this project useful, **please consider starring it ⭐** or [follow me on GitHub](https://github.com/Aditya-PS-05) for more work on AI infrastructure and developer tooling. Issues, PRs, and ideas all welcome.
