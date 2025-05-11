# PiTools MCP - Useful Tools for Any Prompt

[![npm version](https://img.shields.io/npm/v/@psachan/pitools)](https://www.npmjs.com/package/@psachan/pitools)

## ❌ Without PiTools

- ❌ No up-to-date web search in your AI agent
- ❌ Manual tab-switching for research
- ❌ No easy way to add more tools to your AI workflow

## ✅ With PiTools

PiTools MCP brings real-time web search and more tools directly into your AI agent or coding assistant. Just add `use pitools` to your prompt in Cursor or any MCP-compatible client:

```txt
What is the latest version of Next.js? use pitools
```

- 1️⃣ Write your prompt naturally
- 2️⃣ Tell the LLM to `use pitools`
- 3️⃣ Get up-to-date answers and results

No tab-switching, no outdated info, no manual research.

---

## 🛠️ Getting Started

### Requirements
- Node.js >= v18.0.0
- Cursor, Windsurf, Claude Desktop, or any MCP Client

---

### Install in Cursor

Go to: `Settings` → `Cursor Settings` → `MCP` → `Add new global MCP server`

Paste the following configuration into your Cursor `~/.cursor/mcp.json` file (replace the path if needed):

```json
{
  "mcpServers": {
    "pitools": {
      "command": "npx",
      "args": ["-y", "@psachan/pitools@latest"]
    }
  }
}
```

- You can also use `bunx` or `pnpm dlx` if you prefer.

---

## 🧰 Available Tools

- `duckduckgo_search`: Performs a web search using DuckDuckGo and returns the top results.
  - `query` (required): The search query string
  - `safeSearch` (optional, default: MODERATE): STRICT | MODERATE | OFF
  - `region` (optional, default: us-en): Search region
  - `maxResults` (optional): Maximum number of results

*(More tools coming soon!)*

---

## 🧑‍💻 Development

Clone the project and install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

### Local Configuration Example

```json
{
  "mcpServers": {
    "pitools-local": {
      "command": "npx",
      "args": ["tsx", "/path/to/folder/pitools/src/index.js"]
    }
  }
}
```

---

## 🧪 Testing with MCP Inspector

```bash
npx -y @modelcontextprotocol/inspector npx @psachan/pitools@latest
```

---

## License
ISC 