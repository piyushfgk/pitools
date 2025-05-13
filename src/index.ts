#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import process from 'node:process';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { performDuckDuckGoSearch, duckDuckGoSearchInputSchema, DuckDuckGoSearchInputs } from "./lib/web-search";

// Import the new LinkedIn tool components
import {
  linkedInTextPostInputSchema,
  LinkedInTextPostInputs,
  postLinkedInText,
  linkedInArticlePostInputSchema,
  LinkedInArticlePostInputs,
  postLinkedInArticle,
  linkedInImagePostInputSchema,
  LinkedInImagePostInputs,
  postLinkedInImage,
  linkedInVideoPostInputSchema,
  LinkedInVideoPostInputs,
  postLinkedInVideo,
  linkedInPollPostInputSchema,
  LinkedInPollPostInputs,
  postLinkedInPoll
} from './lib/linkedin-tool';

// Global Error Handlers for better diagnostics
process.on('unhandledRejection', (reason: any, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally, exit or log more details, but for now, just log.
  // process.exit(1); // Consider if crashing is better than silent failure for critical errors
});

process.on('uncaughtException', (error: Error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
  // Optionally, exit or log more details
  // process.exit(1);
});

// Create server instance
const server = new McpServer({
  name: "PiTools",
  description: "A collection of tools including web search, document conversion, and more.",
  version: "0.1.2",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register DuckDuckGo Search tool
server.tool(
  "duckduckgo_search",
  "Performs a web search using DuckDuckGo and returns the top results.",
  duckDuckGoSearchInputSchema.shape,
  async (inputs: DuckDuckGoSearchInputs) => {
    return performDuckDuckGoSearch(inputs);
  }
);

// Register new individual LinkedIn tools

// 1. LinkedIn Text Post
server.tool(
  "linkedin_post_text",
  "Posts a text update to LinkedIn.",
  linkedInTextPostInputSchema.shape,
  async (inputs: LinkedInTextPostInputs) => {
    return postLinkedInText(inputs);
  }
);

// 2. LinkedIn Article Post
server.tool(
  "linkedin_post_article",
  "Posts an article (URL with commentary and title) to LinkedIn.",
  linkedInArticlePostInputSchema.shape,
  async (inputs: LinkedInArticlePostInputs) => {
    return postLinkedInArticle(inputs);
  }
);

// 3. LinkedIn Image Post
server.tool(
  "linkedin_post_image",
  "Posts an image with commentary to LinkedIn from a local file path.",
  linkedInImagePostInputSchema.shape,
  async (inputs: LinkedInImagePostInputs) => {
    return postLinkedInImage(inputs);
  }
);

// 4. LinkedIn Video Post
server.tool(
  "linkedin_post_video",
  "Posts a video with commentary to LinkedIn from a local file path.",
  linkedInVideoPostInputSchema.shape,
  async (inputs: LinkedInVideoPostInputs) => {
    return postLinkedInVideo(inputs);
  }
);

// 5. LinkedIn Poll Post
server.tool(
  "linkedin_post_poll",
  "Posts a poll with commentary to LinkedIn.",
  linkedInPollPostInputSchema.shape,
  async (inputs: LinkedInPollPostInputs) => {
    return postLinkedInPoll(inputs);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PiTools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main() function:", error);
  if (typeof process !== 'undefined' && process.exit) {
    process.exit(1);
  }
}); 