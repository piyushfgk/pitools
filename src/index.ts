#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import process from 'node:process';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { performDuckDuckGoSearch, duckDuckGoSearchInputSchema, DuckDuckGoSearchInputs } from "./lib/web-search";

// Create server instance
const server = new McpServer({
  name: "PiTools",
  description: "A collection of tools including web search, document conversion, and more.",
  version: "0.1.0",
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PiTools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  if (typeof process !== 'undefined' && process.exit) {
    process.exit(1);
  }
}); 