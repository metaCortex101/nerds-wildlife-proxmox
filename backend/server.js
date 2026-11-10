
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 8000);
const WORKER_NAME = process.env.WORKER_NAME || "local";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  statement_timeout: 5000,
  max: 10
});
pool.on("error", error => {
  console.error("Idle database connection closed:", error.message);
});

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use((req, res, next) => {
  res.set("X-Worker-Name", WORKER_NAME);
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
});

// Health check for Traefik
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("OK");
  } catch {
    res.status(503).send("Database unavailable");
  }
});

// Show which worker handled the request
app.get("/api/worker", (req, res) => {
  res.json({ worker: WORKER_NAME });
});

// Get observations
app.get("/api/observations", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM observations
       ORDER BY observed_at DESC, id DESC`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

// Add observation
app.post("/api/observations", async (req, res) => {
  const { animal, stream, observed_at } = req.body || {};

  if (
    typeof animal !== "string" ||
    typeof stream !== "string" ||
    !animal.trim() ||
    !stream.trim() ||
    animal.length > 200 ||
    stream.length > 200 ||
    typeof observed_at !== "string" ||
    observed_at.length > 50 ||
    Number.isNaN(Date.parse(observed_at))
  ) {
    return res.status(400).json({ error: "Invalid observation" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO observations
       (animal, stream, observed_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [animal.trim(), stream.trim(), observed_at]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

// Serve the compiled React app
const frontend = path.join(__dirname, "public");
app.use(express.static(frontend));

app.use((req, res) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    return res.status(404).send("Not found");
  }

  res.sendFile(path.join(frontend, "index.html"));
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request too large" });
  }
  console.error(error.message);
  res.status(500).json({ error: "Request failed" });
});

// Initialize database and start server
async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS observations (
      id BIGSERIAL PRIMARY KEY,
      animal TEXT NOT NULL,
      stream TEXT NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL
    )
  `);

  return app.listen(PORT, "0.0.0.0", () => {
    console.log(`Running on port ${PORT} (${WORKER_NAME})`);
  });
}

start().then(server => {
  process.on("SIGTERM", () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}).catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});
