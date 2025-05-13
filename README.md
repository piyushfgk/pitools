# PiTools MCP - Useful Tools for Any Prompt

[![npm version](https://img.shields.io/npm/v/@psachan/pitools)](https://www.npmjs.com/package/@psachan/pitools)

## ❌ Without PiTools

- ❌ No up-to-date web search in your AI agent
- ❌ Manual tab-switching for research
- ❌ No easy way to add more tools to your AI workflow

## ✅ With PiTools

PiTools MCP brings real-time web search, social media posting, and more tools directly into your AI agent or coding assistant. Just add `use pitools` to your prompt in Cursor or any MCP-compatible client:

**Search the web:**
```txt
What is the latest version of Next.js? use pitools duckduckgo_search
```

**Post to LinkedIn:**
```txt
Post "Excited to share my new project update! #innovation #coding" to LinkedIn. use pitools linkedin_post_text
```

- 1️⃣ Write your prompt naturally
- 2️⃣ Tell the LLM to `use pitools` and specify the tool (e.g., `duckduckgo_search`, `linkedin_post_text`)
- 3️⃣ Get up-to-date answers or see your actions performed

No tab-switching, no outdated info, no manual research or posting.

---

## 🛠️ Getting Started

### Requirements
- Node.js >= v18.0.0
- Cursor, Windsurf, Claude Desktop, or any MCP Client
- For LinkedIn tools: `LINKEDIN_ACCESS_TOKEN` environment variable set with a valid LinkedIn access token.

---

### Install in Cursor

Go to: `Settings` → `Cursor Settings` → `MCP` → `Add new global MCP server`

Paste the following configuration into your Cursor `~/.cursor/mcp.json` file (replace the path if needed). Make sure to replace `YOUR_LINKEDIN_ACCESS_TOKEN` with your actual token.

```json
{
  "mcpServers": {
    "pitools": {
      "command": "npx",
      "args": ["-y", "@psachan/pitools@latest"],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "YOUR_LINKEDIN_ACCESS_TOKEN"
      }
    }
  }
}
```

- You can also use `bunx` or `pnpm dlx` if you prefer.
- If you prefer to set the `LINKEDIN_ACCESS_TOKEN` as a system-wide environment variable, you can omit the `env` block here, but ensure the variable is accessible to the npx command.

---

## 🧰 Available Tools

- `duckduckgo_search`: Performs a web search using DuckDuckGo and returns the top results.
  - `query` (string, required): The search query string.
  - `options` (object, optional):
    - `safeSearch` (optional, default: MODERATE): STRICT | MODERATE | OFF.
    - `region` (optional, default: us-en): Search region (e.g., 'us-en', 'uk-en').
    - `maxResults` (optional): Maximum number of results to return.
    - `time` (optional): Time range for results (DAY, WEEK, MONTH, YEAR).

- `linkedin_post_text`: Posts a text update to LinkedIn.
  - `commentary` (string, required): The main text content of the post.

- `linkedin_post_article`: Posts an article (URL with commentary and title) to LinkedIn.
  - `commentary` (string, required): Text to accompany the article.
  - `url` (string, required): The URL of the article to share.
  - `title` (string, required): The title of the article.
  - `thumbnailFilePath` (string, optional): Local path to an image to use as the article thumbnail.
  - `thumbnailAltText` (string, optional): Alt text for the custom thumbnail image.

- `linkedin_post_image`: Posts an image with commentary to LinkedIn from a local file path.
  - `commentary` (string, required): Text to accompany the image.
  - `filePath` (string, required): The local path to the image file.

- `linkedin_post_video`: Posts a video with commentary to LinkedIn from a local file path.
  - `commentary` (string, required): Text to accompany the video.
  - `filePath` (string, required): The local path to the video file.

- `linkedin_post_poll`: Posts a poll with commentary to LinkedIn.
  - `commentary` (string, optional): Text to accompany the poll.
  - `pollQuestion` (string, required): The question for the poll.
  - `pollOptions` (array of strings, required): 2 to 4 options for the poll.

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

Make sure to replace `YOUR_LINKEDIN_ACCESS_TOKEN` with your actual token if testing LinkedIn features.

```json
{
  "mcpServers": {
    "pitools-local": {
      "command": "npx",
      "args": ["tsx", "/path/to/folder/pitools/src/index.ts"],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "YOUR_LINKEDIN_ACCESS_TOKEN"
      }
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