import express from "express";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import mysql from "mysql2/promise";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import superjson from "superjson";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as schema from "../../drizzle/schema";
import { ensureTables } from "../../scripts/ensure_tables";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function saveUploadedFileLocally(fileName: string, buffer: Buffer) {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const fullPath = path.join(uploadsDir, fileName);
  await fs.writeFile(fullPath, buffer);
  return `/uploads/${fileName}`;
}

async function runDatabaseMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log("[Database] DATABASE_URL not configured; skipping migrations");
    return;
  }

  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  const pool = mysql.createPool(process.env.DATABASE_URL);
  const db = drizzle(pool, { schema, mode: "default" });

  try {
    console.log("[Database] Running migrations...");
    await migrate(db, { migrationsFolder });
    console.log("[Database] Migrations completed");
  } catch (err: any) {
    console.warn(
      "[Database] Drizzle migrate failed (often due to existing columns). ensureTables will run next to verify schema.",
      err.message
    );
  } finally {
    await pool.end();
  }
}

async function seedDefaultAdmin() {
  if (!process.env.DATABASE_URL) {
    return;
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.log(
      "[Seed] ADMIN_USERNAME or ADMIN_PASSWORD not configured; skipping admin seed"
    );
    return;
  }

  const name = process.env.ADMIN_NAME || "Administrador";
  const email = process.env.ADMIN_EMAIL || "admin@vitalia.local";
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    await connection.query(
      `INSERT INTO users
        (openId, username, passwordHash, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, 'traditional', 'admin', NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        passwordHash = VALUES(passwordHash),
        name = VALUES(name),
        email = VALUES(email),
        loginMethod = VALUES(loginMethod),
        role = VALUES(role),
        updatedAt = NOW()`,
      [`local_${username}`, username, passwordHash, name, email]
    );
    console.log(`[Seed] Admin user ready: ${username}`);
  } finally {
    await connection.end();
  }
}

async function startServer() {
  await runDatabaseMigrations();
  await ensureTables().catch(err =>
    console.error("[StartServer] ensureTables failed:", err)
  );
  await seedDefaultAdmin();

  const app = express();
  const server = createServer(app);
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(uploadsDir));

  const kefirControlDir = path.resolve(
    process.cwd(),
    "client",
    "public",
    "kefir-control"
  );
  const kefirControlIndex = path.join(kefirControlDir, "index.html");
  const rootAppIndex =
    process.env.NODE_ENV === "development"
      ? path.resolve(process.cwd(), "client", "index.html")
      : path.resolve(process.cwd(), "dist", "public", "index.html");
  const setKefirControlCacheHeaders = (
    res: express.Response,
    filePath: string
  ) => {
    const normalizedFilePath = filePath.split(path.sep).join("/");

    if (normalizedFilePath.includes("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return;
    }

    if (normalizedFilePath.endsWith("/index.html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  };
  const sendRootAppIndex = (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (process.env.NODE_ENV === "development") {
      next();
      return;
    }

    res.sendFile(rootAppIndex);
  };
  const sendKefirControlIndex = (
    _req: express.Request,
    res: express.Response
  ) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(kefirControlIndex);
  };
  app.use(
    "/kefir-control",
    express.static(kefirControlDir, {
      index: false,
      setHeaders: setKefirControlCacheHeaders,
    })
  );
  app.get("/kefir-control", sendKefirControlIndex);
  app.get("/kefir-control/index.html", sendKefirControlIndex);
  app.get("/preview/kefir-control", sendRootAppIndex);
  app.get("/preview/kefir-control/index.html", sendRootAppIndex);
  app.get("/preview/kefir-control/inventory", sendRootAppIndex);
  app.get("/preview/kefir-control/kardex", sendRootAppIndex);
  app.get("/preview/kefir-control/lotes", sendRootAppIndex);
  app.get(/^\/preview\/kefir-control(?:\/.*)?$/, (req, res, next) => {
    const relativePath = req.path.replace(/^\/preview\/kefir-control\/?/, "");
    if (
      !relativePath ||
      relativePath === "index.html" ||
      !path.extname(relativePath)
    ) {
      if (process.env.NODE_ENV === "development") {
        next();
        return;
      }

      res.sendFile(rootAppIndex);
      return;
    }
    next();
  });
  app.get(/^\/kefir-control(?:\/.*)?$/, (req, res, next) => {
    const relativePath = req.path.replace(/^\/kefir-control\/?/, "");
    if (
      !relativePath ||
      relativePath === "index.html" ||
      !path.extname(relativePath)
    ) {
      sendKefirControlIndex(req, res);
      return;
    }
    next();
  });

  // Configurar multer para upload de imágenes
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Solo se permiten archivos de imagen"));
      }
    },
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Image upload endpoint
  app.post("/api/upload-image", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const extension = req.file.mimetype.split("/")[1] || "jpg";
      const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

      let url: string;

      try {
        const { storagePut } = await import("../storage");
        const uploaded = await storagePut(
          fileName,
          req.file.buffer,
          req.file.mimetype
        );
        url = uploaded.url;
      } catch (error) {
        console.warn("Falling back to local upload storage:", error);
        url = await saveUploadedFileLocally(fileName, req.file.buffer);
      }

      res.json({ url, success: true });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Error al subir la imagen" });
    }
  });

  // Version endpoint for deployment verification
  const APP_VERSION = "1.5.0";
  app.get("/api/version", (_req, res) => {
    res.json({
      version: APP_VERSION,
      buildTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
    });
  });

  app.get("/api/debug-db-status", async (_req, res) => {
    const { getDb, getDbInitError } = await import("../db");
    const db = await getDb();
    res.json({
      dbConnected: !!db,
      envHasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlStart: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 15)
        : "missing",
      initError: getDbInitError(),
    });
  });

  console.log(`[App] Version ${APP_VERSION} starting...`);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // transformer: superjson,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] [v1.5.0] Running on port ${port}`);
  });
}

startServer().catch(console.error);
