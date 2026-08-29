import crypto from "node:crypto";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { Server as SocketIoServer, type Socket } from "socket.io";
import { z } from "zod";
import { ActionStore } from "./actionStore.js";
import {
  AuthorizationTokenSchema,
  ProposedActionSchema,
  type RelayAction,
} from "./types.js";

type Role = "laptop" | "phone";

export interface RelayConfig {
  readonly dbPath: string;
  readonly laptopToken: string;
  readonly phoneToken: string;
  readonly allowedOrigin: string;
}

export interface RelayServer {
  readonly app: express.Express;
  readonly httpServer: http.Server;
  readonly io: SocketIoServer;
  readonly store: ActionStore;
  listen(port: number): Promise<number>;
  close(): Promise<void>;
}

function tokenMatches(candidate: string | undefined, expected: string): boolean {
  if (!candidate || candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function bearerToken(request: Request): string | undefined {
  const header = request.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

function roleForToken(token: string | undefined, config: RelayConfig): Role | undefined {
  if (tokenMatches(token, config.laptopToken)) return "laptop";
  if (tokenMatches(token, config.phoneToken)) return "phone";
  return undefined;
}

function serializeAction(record: RelayAction): RelayAction {
  return record;
}

export function createRelayServer(config: RelayConfig): RelayServer {
  if (!config.laptopToken || !config.phoneToken || config.laptopToken === config.phoneToken) {
    throw new Error("Relay requires distinct non-empty laptop and phone tokens");
  }

  const store = new ActionStore(config.dbPath);
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIoServer(httpServer, {
    cors: { origin: config.allowedOrigin, methods: ["GET", "POST"] },
  });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb", strict: true }));

  const requireRole = (...roles: Role[]) =>
    (request: Request, response: Response, next: NextFunction): void => {
      const role = roleForToken(bearerToken(request), config);
      if (!role || !roles.includes(role)) {
        response.status(401).json({ error: "Unauthorized" });
        return;
      }
      response.locals.role = role;
      next();
    };

  app.get("/health", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  app.post("/actions", requireRole("laptop"), (request, response, next) => {
    try {
      const action = ProposedActionSchema.parse(request.body);
      const record = store.create(action);
      io.to("role:phone").emit("action:new", serializeAction(record));
      response.status(201).json(serializeAction(record));
    } catch (error) {
      next(error);
    }
  });

  app.get("/actions/:id", requireRole("laptop", "phone"), (request, response) => {
    const actionId = request.params.id;
    if (typeof actionId !== "string") {
      response.status(400).json({ error: "Invalid action id" });
      return;
    }
    const action = store.get(actionId);
    if (!action) {
      response.status(404).json({ error: "Action not found" });
      return;
    }
    response.status(200).json(serializeAction(action));
  });

  app.post("/actions/:id/respond", requireRole("phone"), (request, response, next) => {
    try {
      const actionId = request.params.id;
      if (typeof actionId !== "string") {
        response.status(400).json({ error: "Invalid action id" });
        return;
      }
      const authorization = AuthorizationTokenSchema.parse(request.body);
      if (authorization.action_id !== actionId) {
        response.status(400).json({ error: "Authorization action_id does not match URL" });
        return;
      }

      const current = store.get(actionId);
      if (!current) {
        response.status(404).json({ error: "Action not found" });
        return;
      }
      if (authorization.action_hash !== current.action.action_hash) {
        response.status(400).json({ error: "Authorization action_hash does not match action" });
        return;
      }

      const resolved = store.resolve(actionId, authorization);
      io.to("role:laptop").emit("action:resolved", serializeAction(resolved));
      response.status(200).json(serializeAction(resolved));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "Invalid request payload" });
      return;
    }
    if (error instanceof Error && /Action (already exists|is already resolved)/.test(error.message)) {
      response.status(409).json({ error: error.message });
      return;
    }
    response.status(500).json({ error: "Internal relay error" });
  });

  io.use((socket, next) => {
    const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : undefined;
    const role = roleForToken(token, config);
    if (!role) return next(new Error("Unauthorized"));
    socket.data.role = role;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const role = socket.data.role as Role;
    socket.join(`role:${role}`);
    if (role === "phone") {
      socket.emit("actions:pending", store.listPending().map(serializeAction));
    }
  });

  return {
    app,
    httpServer,
    io,
    store,
    listen: (port) =>
      new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, "127.0.0.1", () => {
          httpServer.off("error", reject);
          const address = httpServer.address();
          if (!address || typeof address === "string") {
            reject(new Error("Relay did not bind a TCP port"));
            return;
          }
          resolve(address.port);
        });
      }),
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        io.close((error) => (error ? reject(error) : resolve()));
      });
      store.close();
    },
  };
}

function loadRuntimeConfig(): RelayConfig {
  const laptopToken = process.env.RELAY_LAPTOP_TOKEN;
  const phoneToken = process.env.RELAY_PHONE_TOKEN;
  const dbPath = process.env.RELAY_DB_PATH;
  const allowedOrigin = process.env.RELAY_ALLOWED_ORIGIN;
  if (!laptopToken || !phoneToken || !dbPath || !allowedOrigin) {
    throw new Error("RELAY_LAPTOP_TOKEN, RELAY_PHONE_TOKEN, RELAY_DB_PATH, and RELAY_ALLOWED_ORIGIN are required");
  }
  return { laptopToken, phoneToken, dbPath, allowedOrigin };
}

if (process.argv[1]?.endsWith("relay.js")) {
  const config = loadRuntimeConfig();
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  const relay = createRelayServer(config);
  relay.listen(port).then((boundPort) => {
    console.error(`[relay] listening on ${boundPort}`);
  });
}
