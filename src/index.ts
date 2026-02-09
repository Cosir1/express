import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Trakt.tv Configuration
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const TRAKT_REDIRECT_URI = process.env.TRAKT_REDIRECT_URI;
const TRAKT_API_BASE = "https://api.trakt.tv";
const TOKENS_FILE = path.join(process.cwd(), "trakt_tokens.json");

// Persistent token storage helpers
async function saveTokens(tokens: any) {
  try {
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error("Error saving tokens to file:", error);
  }
}

async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Consumet API base URL
const CONSUMET_API_BASE = "https://api.consumet.org";

app.get("/", (_req, res) => {
  res.send("Hello Express!");
});

app.post("/message", (_req, res) => {
  res.send("Hello Express!");
  console.log("Message received: ", _req.body);
});

// Example: Search anime
app.get("/api/anime/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/${query}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error searching anime:", error);
    res.status(500).json({ error: "Failed to search anime" });
  }
});

// Example: Get anime info by ID
app.get("/api/anime/info/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/info/${id}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching anime info:", error);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// Example: Get anime episodes
app.get("/api/anime/episodes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/info/${id}`,
    );
    res.json(response.data.episodes || []);
  } catch (error) {
    console.error("Error fetching episodes:", error);
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

// Example: Get streaming links for an episode
app.get("/api/anime/watch/:episodeId", async (req, res) => {
  try {
    const { episodeId } = req.params;
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/watch/${episodeId}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching streaming links:", error);
    res.status(500).json({ error: "Failed to fetch streaming links" });
  }
});

// Example: Get trending anime
app.get("/api/anime/trending", async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/trending?page=${page}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching trending anime:", error);
    res.status(500).json({ error: "Failed to fetch trending anime" });
  }
});

// Example: Get popular anime
app.get("/api/anime/popular", async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/popular?page=${page}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching popular anime:", error);
    res.status(500).json({ error: "Failed to fetch popular anime" });
  }
});

// Example: Search movies
app.get("/api/movies/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const response = await axios.get(
      `${CONSUMET_API_BASE}/movies/flixhq/${query}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error searching movies:", error);
    res.status(500).json({ error: "Failed to search movies" });
  }
});

// Example: Get movie info
app.get("/api/movies/info/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(
      `${CONSUMET_API_BASE}/movies/flixhq/info?id=${id}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching movie info:", error);
    res.status(500).json({ error: "Failed to fetch movie info" });
  }
});

// Trakt.tv OAuth Endpoints

// 1. Authorize - Redirect user to Trakt
app.get("/api/trakt/authorize", (req, res) => {
  if (!TRAKT_CLIENT_ID || !TRAKT_REDIRECT_URI) {
    return res.status(500).json({ error: "Trakt credentials not configured" });
  }

  const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${TRAKT_REDIRECT_URI}`;
  res.redirect(authUrl);
});

// 2. Callback - Handle redirect from Trakt
app.get("/api/trakt/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
    }

    const response = await axios.post(`${TRAKT_API_BASE}/oauth/token`, {
      code,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: TRAKT_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const tokens = response.data;
    await saveTokens(tokens);
    res.json({
      message: "Authorization successful",
      tokens: tokens,
    });
  } catch (error: any) {
    console.error(
      "Trakt callback error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to exchange code for tokens",
      details: error.response?.data || error.message,
    });
  }
});

// 3. Get Current Token
app.get("/api/trakt/token", async (req, res) => {
  const tokens = await loadTokens();
  if (!tokens) {
    return res
      .status(404)
      .json({ error: "No Trakt tokens found. Please authorize first." });
  }
  res.json(tokens);
});

// 4. Refresh Token
app.post("/api/trakt/refresh", async (req, res) => {
  try {
    const currentTokens = await loadTokens();
    if (!currentTokens?.refresh_token) {
      return res.status(400).json({ error: "No refresh token available" });
    }

    const response = await axios.post(`${TRAKT_API_BASE}/oauth/token`, {
      refresh_token: currentTokens.refresh_token,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: TRAKT_REDIRECT_URI,
      grant_type: "refresh_token",
    });

    const newTokens = response.data;
    await saveTokens(newTokens);
    res.json({
      message: "Token refreshed successfully",
      tokens: newTokens,
    });
  } catch (error: any) {
    console.error(
      "Trakt refresh error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to refresh token",
      details: error.response?.data || error.message,
    });
  }
});

// 5. Revoke Token
app.post("/api/trakt/revoke", async (req, res) => {
  try {
    const tokens = await loadTokens();
    if (!tokens?.access_token) {
      return res.status(400).json({ error: "No access token to revoke" });
    }

    await axios.post(`${TRAKT_API_BASE}/oauth/revoke`, {
      token: tokens.access_token,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
    });

    try {
      await fs.unlink(TOKENS_FILE);
    } catch (e) {
      // Ignore if file doesn't exist
    }

    res.json({ message: "Token revoked successfully" });
  } catch (error: any) {
    console.error("Trakt revoke error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to revoke token",
      details: error.response?.data || error.message,
    });
  }
});

// 6. Test Token Validity
app.get("/api/trakt/test-token", async (req, res) => {
  try {
    const tokens = await loadTokens();
    if (!tokens?.access_token) {
      return res
        .status(401)
        .json({ error: "No access token found. Please authorize first." });
    }

    // Attempt to fetch user settings to verify the token
    const response = await axios.get(`${TRAKT_API_BASE}/users/settings`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID,
      },
    });

    res.json({
      message: "Token is valid",
      user: {
        username: response.data.user.username,
        name: response.data.user.name,
        joined_at: response.data.user.joined_at,
      },
    });
  } catch (error: any) {
    console.error(
      "Trakt test-token error:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: "Token test failed",
      details: error.response?.data || error.message,
    });
  }
});

// Test endpoints with pre-configured examples
app.get("/test/anime", async (_req, res) => {
  try {
    // Test: Search for "naruto" (popular anime)
    const searchResponse = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/naruto`,
    );

    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      const firstResult = searchResponse.data.results[0];
      const infoResponse = await axios.get(
        `${CONSUMET_API_BASE}/anime/gogoanime/info/${firstResult.id}`,
      );

      res.json({
        success: true,
        searchResults: searchResponse.data.results.slice(0, 3),
        firstAnimeInfo: {
          id: infoResponse.data.id,
          title: infoResponse.data.title,
          description: infoResponse.data.description?.substring(0, 200),
          episodes: infoResponse.data.episodes?.length || 0,
          image: infoResponse.data.image,
        },
      });
    } else {
      res.json({
        success: true,
        searchResults: searchResponse.data,
      });
    }
  } catch (error: any) {
    console.error("Test error:", error.message);
    res.status(500).json({
      success: false,
      error: "Test failed",
      message: error.message,
    });
  }
});

app.get("/test/trending", async (_req, res) => {
  try {
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/trending?page=1`,
    );
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error("Test error:", error.message);
    res.status(500).json({
      success: false,
      error: "Test failed",
      message: error.message,
    });
  }
});

app.get("/test/popular", async (_req, res) => {
  try {
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/popular?page=1`,
    );
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error("Test error:", error.message);
    res.status(500).json({
      success: false,
      error: "Test failed",
      message: error.message,
    });
  }
});

app.get("/test/movies", async (_req, res) => {
  try {
    // Test: Search for "inception" (popular movie)
    const response = await axios.get(
      `${CONSUMET_API_BASE}/movies/flixhq/inception`,
    );
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error("Test error:", error.message);
    res.status(500).json({
      success: false,
      error: "Test failed",
      message: error.message,
    });
  }
});

app.get("/test/health", async (_req, res) => {
  try {
    // Quick health check - test if Consumet API is reachable
    const response = await axios.get(
      `${CONSUMET_API_BASE}/anime/gogoanime/trending?page=1`,
      { timeout: 5000 },
    );
    res.json({
      success: true,
      status: "healthy",
      consumetApi: "reachable",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      consumetApi: "unreachable",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Legacy routes (keeping for backward compatibility)
app.get("/api/users/:id", (_req, res) => {
  res.json({ id: _req.params.id });
});

app.get("/api/posts/:postId/comments/:commentId", (_req, res) => {
  res.json({ postId: _req.params.postId, commentId: _req.params.commentId });
});

const PORT = 3005;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(
    `Consumet API endpoints available at http://0.0.0.0:${PORT}/api/anime and /api/movies`,
  );
  console.log(`\nTest endpoints:`);
  console.log(`  GET http://0.0.0.0:${PORT}/test/health - Health check`);
  console.log(
    `  GET http://0.0.0.0:${PORT}/test/anime - Test anime search & info`,
  );
  console.log(
    `  GET http://0.0.0.0:${PORT}/test/trending - Test trending anime`,
  );
  console.log(`  GET http://0.0.0.0:${PORT}/test/popular - Test popular anime`);
  console.log(`  GET http://0.0.0.0:${PORT}/test/movies - Test movie search`);
});

export default app;
