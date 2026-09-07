import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Proxy Route for images to prevent CORS issues on canvas
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      res.status(400).json({ error: "Missing url parameter" });
      return;
    }

    try {
      // Validate URL
      const urlObj = new URL(imageUrl);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        res.status(400).json({ error: "Invalid URL protocol" });
        return;
      }

      // Fetch image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        res.status(imageResponse.status).json({ error: `Failed to fetch image: ${imageResponse.statusText}` });
        return;
      }

      const contentType = imageResponse.headers.get("content-type") || "image/png";
      const buffer = await imageResponse.arrayBuffer();

      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      res.status(500).json({ error: `Failed to proxy image: ${err.message}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
