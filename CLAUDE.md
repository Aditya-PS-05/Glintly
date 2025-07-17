# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm run dev` - Start development server with Turbopack
- `pnpm run build` - Build the production application
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint for code quality checks
- `pnpm dlx inngest-cli@latest dev` - Start Inngest development server for background jobs

## Database Commands

- `pnpx prisma migrate dev` - Apply database migrations in development
- `pnpx prisma generate` - Generate Prisma client (outputs to `src/generated/prisma`)
- `pnpx prisma studio` - Open database browser

## E2B Sandbox Commands

- `e2b template build --name novacraft-nextjs-test --cmd "/compile_page.sh"` - Build E2B template for sandboxes
- `e2b sandbox list` - List active sandboxes
- `e2b auth login` - Authenticate with E2B

## Architecture Overview

This is a Next.js 15 application that provides an AI-powered code generation and execution platform. The architecture is modular with clear separation of concerns:

### Core Technologies
- **Next.js 15** with App Router and React 19
- **tRPC** for type-safe API layer
- **Prisma** with PostgreSQL for data persistence
- **Inngest** for background job processing
- **E2B** for secure code execution in sandboxes
- **Radix UI** + **Tailwind CSS** for UI components

### Key Components

**Database Schema (prisma/schema.prisma:17-62)**:
- `Project`: Contains user projects with associated messages
- `Message`: Stores conversation history with roles (USER/ASSISTANT) and types (RESULT/ERROR)
- `Fragment`: Links to executable code fragments with sandbox URLs and file contents

**tRPC API (src/trpc/routers/_app.ts:1-9)**:
- `projects`: Project management procedures
- `messages`: Message handling procedures
- Type-safe client-server communication

**Inngest Agent System (src/inngest/functions.ts:14-193)**:
- AI-powered code generation using OpenAI GPT-4
- Secure code execution in E2B sandboxes
- Three main tools: `terminal`, `createOrUpdateFiles`, `readFiles`
- Automatic result saving to database with fragment creation

**Module Structure**:
- `src/modules/home/`: Project creation and listing
- `src/modules/projects/`: Project view and management
- `src/modules/messages/`: Message handling and display
- `src/components/`: Reusable UI components

**Project View (src/modules/projects/ui/view/project-view.tsx:19-87)**:
- Split-pane interface with resizable panels
- Messages container on left, code/preview on right
- Tabbed interface for demo preview and code exploration
- File explorer for viewing generated code

### File Structure Patterns

- All modules follow the pattern: `src/modules/[module]/server/` for tRPC procedures and `src/modules/[module]/ui/` for components
- Generated Prisma client is in `src/generated/prisma/`
- UI components use Radix UI primitives in `src/components/ui/`
- Path alias `@/*` maps to `src/*`

### Key Integration Points

The application integrates several external services:
- E2B sandboxes for secure code execution
- Inngest for background job orchestration
- OpenAI API for code generation
- PostgreSQL for data persistence

When working with this codebase, understand that user requests trigger Inngest jobs that generate and execute code in isolated E2B sandboxes, with results stored as fragments that can be previewed and explored through the UI.