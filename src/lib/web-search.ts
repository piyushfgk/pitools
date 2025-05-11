/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { search as duckDuckGoSearch, SearchOptions, SearchResult, SafeSearchType as DDGSafeSearchType } from 'duck-duck-scrape';

// Define the schema for the search tool input (can be shared or redefined if specific to this module)
export const duckDuckGoSearchInputSchema = z.object({
  query: z.string().describe("The search query."),
  options: z.object({
    safeSearch: z.enum(["STRICT", "MODERATE", "OFF"]).optional().describe("Safe search level."),
    time: z.enum(["DAY", "WEEK", "MONTH", "YEAR"]).optional().describe("Time range for search results."),
    region: z.string().optional().describe("Region for search (e.g., 'us-en')."),
    maxResults: z.number().optional().describe("Maximum number of results to return.")
  }).optional().describe("Optional search parameters for DuckDuckGo.")
});

export type DuckDuckGoSearchInputs = z.infer<typeof duckDuckGoSearchInputSchema>;

// Map our enum to duck-duck-scrape's enum
const mapSafeSearch = (input?: "STRICT" | "MODERATE" | "OFF"): DDGSafeSearchType | undefined => {
  if (!input) return undefined;
  switch (input) {
    case "STRICT": return DDGSafeSearchType.STRICT;
    case "MODERATE": return DDGSafeSearchType.MODERATE;
    case "OFF": return DDGSafeSearchType.OFF;
    default: return undefined;
  }
};

// Define a more precise return type based on MCP expectations
export type McpToolCoreResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export async function performDuckDuckGoSearch(inputs: DuckDuckGoSearchInputs): Promise<McpToolCoreResponse> {
  const { query, options } = inputs;
  const safeSearch = options?.safeSearch ?? "MODERATE"; // Default to MODERATE
  const region = typeof options?.region === 'string' ? options.region : "us-en"; // Default to us-en
  console.error(`Performing DuckDuckGo search for: ${query} with options: ${JSON.stringify(options)}, safeSearch used: ${safeSearch}, region used: ${region}`);

  try {
    const searchOpts: SearchOptions = {
      safeSearch: mapSafeSearch(safeSearch),
      time: options?.time as any, // duck-duck-scrape's SearchTimeType is not directly compatible via enum values
      region,
    };

    const searchResults = await duckDuckGoSearch(query, searchOpts);

    if (searchResults.noResults) {
      return {
        content: [
          { type: "text", text: "No results found for your query." },
        ],
      };
    }

    let resultsToReturn = searchResults.results;
    if (options?.maxResults && searchResults.results.length > options.maxResults) {
      resultsToReturn = searchResults.results.slice(0, options.maxResults);
    }

    const formattedResults = resultsToReturn.map((result: SearchResult, index: number) => {
      return `Result ${index + 1}:\nTitle: ${result.title}\nURL: ${result.url}\nSnippet: ${result.description}`;
    }).join("\n\n");

    return {
      content: [
        { type: "text", text: formattedResults || "No results formatted, something went wrong." },
      ],
    };
  } catch (error: any) {
    console.error("Error performing DuckDuckGo search:", error);
    return {
      content: [
        { type: "text", text: `Error performing search: ${error.message}` },
      ],
      isError: true,
    };
  }
} 