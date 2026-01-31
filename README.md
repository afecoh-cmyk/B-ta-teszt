# Csempe Projekt - Agent System

This project uses a 3-layer agent architecture to separate concerns and maximize reliability.

## Architecture Overview

### Layer 1: Directives (What to do)

- **Location**: `directives/`
- **Purpose**: Standard Operating Procedures written in Markdown
- **Content**: Goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions for the AI agent

### Layer 2: Orchestration (Decision making)

- **Actor**: AI Agent (Claude, Gemini, etc.)
- **Purpose**: Intelligent routing and decision-making
- **Responsibilities**:
  - Read directives
  - Call execution tools in the right order
  - Handle errors and ask for clarification
  - Update directives with learnings

### Layer 3: Execution (Doing the work)

- **Location**: `execution/`
- **Purpose**: Deterministic scripts (Python, PowerShell, etc.)
- **Content**: API calls, data processing, file operations, database interactions
- Reliable, testable, fast code

## Directory Structure

```
csempe projekt/
├── .tmp/                    # Temporary/intermediate files (never commit)
├── directives/              # SOPs and instruction sets
│   ├── 01_storage_policy.md
│   └── 02_refactor_guide.md
├── execution/               # Deterministic scripts
│   └── sync_db.ps1
├── data/                    # Persistent data storage
│   └── db.json
├── .env                     # Environment variables and API keys
├── AGENTS.md               # Agent instructions (mirrored)
├── CLAUDE.md               # Claude-specific instructions (mirrored)
├── GEMINI.md               # Gemini-specific instructions (mirrored)
└── README.md               # This file
```

## Operating Principles

### 1. Check for tools first

Before writing a new script, check `execution/` directory. Only create new scripts if none exist.

### 2. Self-anneal when things break

- Read error messages and stack traces
- Fix the script and test again
- Update the directive with learnings
- System becomes stronger over time

### 3. Update directives as you learn

Directives are living documents. When you discover:

- API constraints
- Better approaches
- Common errors
- Timing expectations

→ Update the directive (but don't overwrite without asking)

## Self-Annealing Loop

When something breaks:

1. Fix it
2. Update the tool
3. Test the tool
4. Update directive to include new flow
5. System is now stronger

## File Organization

### Deliverables vs Intermediates

- **Deliverables**: Cloud-based outputs (Google Sheets, Slides, etc.)
- **Intermediates**: Temporary files in `.tmp/` (can be deleted and regenerated)

### Key Principle

Local files are only for processing. Deliverables live in cloud services where users can access them.

## Getting Started

1. **Set up environment variables** in `.env`
2. **Review existing directives** in `directives/`
3. **Check available tools** in `execution/`
4. **Let the AI agent orchestrate** the workflow

## Current Directives

- **01_storage_policy.md**: Data storage and synchronization between localStorage and file system
- **02_refactor_guide.md**: Code refactoring and cleanup guidelines

## Current Execution Tools

- **sync_db.ps1**: PowerShell script for exporting/importing data to/from `data/db.json`

## Philosophy

> LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This 3-layer architecture fixes that mismatch by pushing complexity into deterministic code, allowing the AI to focus on decision-making.

**Be pragmatic. Be reliable. Self-anneal.**
