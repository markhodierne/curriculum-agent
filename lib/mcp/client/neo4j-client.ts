/**
 * Neo4j MCP Client using SSE Transport
 * Connects to Neo4j MCP server for curriculum knowledge graph access
 * AI SDK MCP Integration: https://ai-sdk.dev/cookbook/node/mcp-tools
 */

import { experimental_createMCPClient } from "ai";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { MCPClientConfig } from "./types";

export class Neo4jMCPClient {
  private client: Awaited<
    ReturnType<typeof experimental_createMCPClient>
  > | null = null;
  private apiKey: string;
  private serverUrl: string;
  private isConnected: boolean = false;

  constructor(config: MCPClientConfig) {
    this.apiKey = config.apiKey;

    // URL construction: ${NEO4J_MCP_URL}/${apiKey}/api/mcp/
    const baseUrl = config.serverUrl || process.env.NEO4J_MCP_URL;
    if (!baseUrl) {
      throw new Error("NEO4J_MCP_URL not found in environment variables");
    }

    this.serverUrl = `${baseUrl}/${this.apiKey}/api/mcp/`;
  }

  /**
   * Initialize the MCP client connection
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      console.log("🔗 Neo4j MCP client already connected");
      return;
    }

    try {
      console.log("🚀 Connecting to Neo4j MCP server via SSE...");

      const transport = new SSEClientTransport(new URL(this.serverUrl));

      this.client = await experimental_createMCPClient({
        transport,
      });

      this.isConnected = true;
      console.log("✅ Neo4j MCP client connected successfully");
    } catch (error) {
      console.error("💥 Failed to connect to Neo4j MCP server:", error);
      throw new Error(
        `Failed to connect to Neo4j MCP server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Disconnect the MCP client
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.isConnected = false;
      console.log("🔌 Neo4j MCP client disconnected");
    } catch (error) {
      console.error("⚠️ Error during MCP client disconnect:", error);
    }
  }

  /**
   * Get all available Neo4j tools
   * Returns tools that can be used with AI SDK's generateText/streamText
   */
  async getTools(): Promise<Record<string, any>> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("MCP client not initialized");
    }

    try {
      console.log("🔧 Retrieving Neo4j MCP tools...");
      const tools = await this.client.tools();
      console.log(`✅ Retrieved ${Object.keys(tools).length} Neo4j tools`);
      return tools;
    } catch (error) {
      console.error("💥 Failed to retrieve Neo4j tools:", error);
      throw new Error(
        `Failed to retrieve Neo4j tools: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get the connection status
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the underlying MCP client instance
   */
  getClient() {
    return this.client;
  }
}

/**
 * Singleton instance for Neo4j MCP client
 */
let neo4jClientInstance: Neo4jMCPClient | null = null;

/**
 * Get or create a Neo4j MCP client instance
 */
export function getNeo4jMCPClient(apiKey?: string): Neo4jMCPClient {
  if (!neo4jClientInstance) {
    const key = apiKey || process.env.NEO4J_MCP_API_KEY;

    if (!key) {
      throw new Error(
        "NEO4J_MCP_API_KEY not found. Please set it in .env.local or pass it to getNeo4jMCPClient()"
      );
    }

    neo4jClientInstance = new Neo4jMCPClient({ apiKey: key });
  }

  return neo4jClientInstance;
}

/**
 * Reset the singleton instance (useful for testing or reconfiguration)
 */
export function resetNeo4jMCPClient(): void {
  if (neo4jClientInstance) {
    neo4jClientInstance.disconnect().catch(console.error);
    neo4jClientInstance = null;
  }
}
