---
name: senior-dev-plugins
description: Use the five senior-dev tooling plugins from the semplice.ai Claude Code guide — Agent Skills (spec/plan/build/test/review/ship), Context7 (current library docs), Graphify (codebase knowledge graph), 21st MCP (UI components), and Strix (authorized security testing of owned apps only). Apply when starting non-trivial features, looking up library APIs, exploring architecture, building UI, or hardening before ship.
---

# Senior-dev plugins (Agent Skills · Context7 · Graphify · 21st · Strix)

Installed for Cursor so agents work like a senior developer. Prefer these over reinventing process.

## 1. Agent Skills (Addy Osmani)
For non-trivial work, follow the lifecycle skills already installed:
`spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` / `test-driven-development` → `code-review-and-quality` → `shipping-and-launch`.
Also: `api-and-interface-design`, `frontend-ui-engineering`, `security-and-hardening`, `debugging-and-error-recovery`.

## 2. Context7
When writing code against a library/framework, pull **current** docs via the Context7 MCP (`resolve-library-id`, `query-docs`) or the `context7-mcp` skill. Say "use context7" when docs matter. Do not guess outdated APIs.

## 3. Graphify
If `graphify-out/` exists, query the graph before broad file searches. Otherwise run `graphify` / `/graphify .` to build it. Use `graphify path`, `graphify explain`, and the `graphify` skill for architecture questions.

## 4. 21st MCP
For React/Tailwind UI, search real components via the 21st MCP / `21st-*` skills instead of inventing every control from scratch. Needs `API_KEY_21ST` (get at https://21st.dev/mcp).

## 5. Strix (owned targets only)
Use Strix skills only against apps Germano owns or has written permission to test. Prefer managed/cloud flows when Docker/LLM keys are unavailable. Never attack third-party sites. Do not generate exploit PoCs in chat; use Strix's own reports and focus on remediation.

## Keys / Cloud Agents
- Context7: HTTP MCP `https://mcp.context7.com/mcp` (optional API key).
- 21st: set `API_KEY_21ST` and add the MCP in Cursor Cloud Agents MCP settings if tools are missing.
- Strix CLI: optional; skills work with managed cloud when configured.
