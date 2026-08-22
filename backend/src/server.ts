import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { generateDraftReply } from "./services/geminiService";
import {
  validatePayload,
  messageSendSchema,
  redraftSchema,
  ticketResolveSchema,
} from "./lib/validation";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 5002;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-token-key-321";

// Production CORS Configuration
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:3001"];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Rate Limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per window per IP
  message: { error: "Too many login attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // max 120 webhook calls per minute
  message: { error: "Webhook rate limit exceeded" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many API requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.API_AUTH_TOKEN || "demo-auth-token-123";
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized: Missing Authorization Header" });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ error: "Unauthorized: Invalid Authorization Format" });
    return;
  }

  const token = parts[1];
  if (token === expectedToken) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};


import { loadSettings, getSettings, saveSettings } from "./services/settingsService";

// Load settings on startup
loadSettings();

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", service: "ai-support-desk-backend", time: new Date() });
});

// Auth Login Endpoint
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Incorrect email or password" });
      return;
    }
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
});

// Admin User Creation Endpoint
app.post("/api/users", authMiddleware, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser && currentUser.role !== "admin") {
    res.status(403).json({ error: "Insufficient permission: Only administrators can create new users." });
    return;
  }

  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Please fill in all fields" });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "A user with this email address already exists" });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "An error occurred while creating user" });
  }
});

// Admin list all users
app.get("/api/users", authMiddleware, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser && currentUser.role !== "admin") {
    res.status(403).json({ error: "Insufficient permission: Only administrators can view the user list." });
    return;
  }
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Could not retrieve user list" });
  }
});

// Admin delete user
app.delete("/api/users/:id", authMiddleware, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser && currentUser.role !== "admin") {
    res.status(403).json({ error: "Insufficient permission: Only administrators can delete users." });
    return;
  }
  const { id } = req.params;
  try {
    if (currentUser && currentUser.userId === id) {
      res.status(400).json({ error: "You cannot delete yourself." });
      return;
    }
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Could not delete user" });
  }
});

// Admin update user
app.put("/api/users/:id", authMiddleware, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser && currentUser.role !== "admin") {
    res.status(403).json({ error: "Insufficient permission: Only administrators can update users." });
    return;
  }
  const { id } = req.params;
  const { name, email, password, role } = req.body;
  if (!name || !email || !role) {
    res.status(400).json({ error: "Name, email, and role fields are required." });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (existing) {
      res.status(400).json({ error: "Another user is registered with this email address." });
      return;
    }

    const data: any = { name, email, role };
    if (password && password.trim() !== "") {
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "An error occurred while updating the user" });
  }
});

// Settings endpoints
app.get("/api/settings", authMiddleware, (req, res) => {
  res.json(getSettings());
});

app.post("/api/settings", authMiddleware, (req, res) => {
  const updated = saveSettings(req.body);
  res.json(updated);
});

// Knowledge Base endpoints
app.get("/api/knowledge", authMiddleware, async (req, res) => {
  try {
    const entries = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(entries);
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    res.status(500).json({ error: "Failed to fetch knowledge base" });
  }
});

app.post("/api/knowledge", authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and Content are required" });
    return;
  }
  try {
    const entry = await prisma.knowledgeBase.create({
      data: { title, content },
    });
    res.json(entry);
  } catch (error) {
    console.error("Error creating knowledge base entry:", error);
    res.status(500).json({ error: "Failed to create knowledge base entry" });
  }
});

app.delete("/api/knowledge/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.knowledgeBase.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge base entry:", error);
    res.status(500).json({ error: "Failed to delete knowledge base entry" });
  }
});

// ==========================================
// INBOUND WEBHOOK ENDPOINTS (WhatsApp & Web)
// ==========================================

// Meta / WhatsApp Webhook Verification
app.get("/api/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "whatsapp-webhook-secret-token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] WhatsApp webhook verified successfully.");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Forbidden: Verification token mismatch" });
  }
});

// Meta / WhatsApp Incoming Message Webhook
app.post("/api/webhooks/whatsapp", webhookLimiter, async (req, res) => {
  try {
    const body = req.body;
    let from = "";
    let customerName = "WhatsApp User";
    let messageText = "";

    // Support standard Meta Webhook payload format
    if (body.entry && body.entry[0]?.changes && body.entry[0]?.changes[0]?.value?.messages) {
      const msgObj = body.entry[0].changes[0].value.messages[0];
      const contactObj = body.entry[0].changes[0].value.contacts?.[0];
      from = msgObj.from;
      customerName = contactObj?.profile?.name || `WhatsApp (+${from})`;
      messageText = msgObj.text?.body || "";
    } else if (body.from && body.text) {
      // Direct / Simplified JSON payload
      from = body.from;
      customerName = body.name || `WhatsApp (+${from})`;
      messageText = body.text;
    } else {
      res.status(400).json({ error: "Invalid webhook payload structure" });
      return;
    }

    if (!messageText.trim()) {
      res.status(200).json({ received: true, ignored: "Empty message" });
      return;
    }

    // Find or create Customer
    let customer = await prisma.customer.findFirst({
      where: { name: customerName, channel: "whatsapp" },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          channel: "whatsapp",
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(customerName)}`,
        },
      });
    }

    // Find open conversation or create new
    let conversation = await prisma.conversation.findFirst({
      where: { customerId: customer.id, status: "open" },
      include: { messages: { orderBy: { timestamp: "asc" } }, customer: true },
    });

    let isNewTicket = false;
    if (!conversation) {
      isNewTicket = true;
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          status: "open",
        },
        include: { messages: true, customer: true },
      });
    }

    // Create customer message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "customer",
        content: messageText,
      },
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const fullHistory = [...(conversation.messages || []), message];

    if (isNewTicket) {
      const fullTicket = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          customer: true,
          assignedUser: { select: { id: true, name: true, email: true, role: true } },
          messages: { orderBy: { timestamp: "asc" } },
        },
      });
      io.emit("ticket:new", fullTicket);
    } else {
      io.emit("message:new", { conversationId: conversation.id, message });
      io.to(`ticket:${conversation.id}`).emit("message:room:new", { conversationId: conversation.id, message });
    }

    // Auto-generate AI draft reply asynchronously
    const currentSettings = getSettings();
    generateDraftReply(fullHistory, customer.name, currentSettings.defaultTone)
      .then(async (draft) => {
        await prisma.message.update({
          where: { id: message.id },
          data: { draftReply: draft },
        });
        io.emit("message:draft:updated", {
          conversationId: conversation!.id,
          messageId: message.id,
          draftReply: draft,
        });
        io.to(`ticket:${conversation!.id}`).emit("message:room:draft:updated", {
          conversationId: conversation!.id,
          messageId: message.id,
          draftReply: draft,
        });
      })
      .catch((err) => console.error("[WhatsApp Webhook] Draft generation error:", err));

    // Run auto assignment
    await runAutoAssignmentForUnassignedTickets();

    res.json({
      success: true,
      conversationId: conversation.id,
      messageId: message.id,
    });
  } catch (error) {
    console.error("[WhatsApp Webhook] Processing error:", error);
    res.status(500).json({ error: "Failed to process WhatsApp webhook" });
  }
});

// Web Chat Widget Inbound Message Webhook
app.post("/api/webhooks/webchat", webhookLimiter, async (req, res) => {
  try {
    const { customerName, message: messageText, avatar } = req.body;
    if (!customerName || !messageText) {
      res.status(400).json({ error: "customerName and message are required" });
      return;
    }

    let customer = await prisma.customer.findFirst({
      where: { name: customerName, channel: "web" },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          channel: "web",
          avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(customerName)}`,
        },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: { customerId: customer.id, status: "open" },
      include: { messages: { orderBy: { timestamp: "asc" } }, customer: true },
    });

    let isNewTicket = false;
    if (!conversation) {
      isNewTicket = true;
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          status: "open",
        },
        include: { messages: true, customer: true },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "customer",
        content: messageText,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const fullHistory = [...(conversation.messages || []), message];

    if (isNewTicket) {
      const fullTicket = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          customer: true,
          assignedUser: { select: { id: true, name: true, email: true, role: true } },
          messages: { orderBy: { timestamp: "asc" } },
        },
      });
      io.emit("ticket:new", fullTicket);
    } else {
      io.emit("message:new", { conversationId: conversation.id, message });
      io.to(`ticket:${conversation.id}`).emit("message:room:new", { conversationId: conversation.id, message });
    }

    const currentSettings = getSettings();
    generateDraftReply(fullHistory, customer.name, currentSettings.defaultTone)
      .then(async (draft) => {
        await prisma.message.update({
          where: { id: message.id },
          data: { draftReply: draft },
        });
        io.emit("message:draft:updated", {
          conversationId: conversation!.id,
          messageId: message.id,
          draftReply: draft,
        });
        io.to(`ticket:${conversation!.id}`).emit("message:room:draft:updated", {
          conversationId: conversation!.id,
          messageId: message.id,
          draftReply: draft,
        });
      })
      .catch((err) => console.error("[WebChat Webhook] Draft generation error:", err));

    await runAutoAssignmentForUnassignedTickets();

    res.json({
      success: true,
      conversationId: conversation.id,
      messageId: message.id,
    });
  } catch (error) {
    console.error("[WebChat Webhook] Processing error:", error);
    res.status(500).json({ error: "Failed to process WebChat message" });
  }
});

// Analytics endpoint — returns real calculated metrics from the database
app.get("/api/analytics", authMiddleware, async (req, res) => {
  try {
    const [totalConversations, openCount, resolvedCount, totalMessages] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: "open" } }),
      prisma.conversation.count({ where: { status: "resolved" } }),
      prisma.message.count(),
    ]);

    // Channel distribution
    const customers = await prisma.customer.findMany({
      select: { channel: true },
    });

    const channelDistribution = {
      whatsapp: customers.filter((c) => c.channel === "whatsapp").length,
      web: customers.filter((c) => c.channel === "web").length,
    };

    // Average response time estimation (time between customer message and next agent message)
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: { orderBy: { timestamp: "asc" } },
      },
    });

    let totalResponseMs = 0;
    let responseCount = 0;

    for (const conv of conversations) {
      for (let i = 0; i < conv.messages.length - 1; i++) {
        if (conv.messages[i].sender === "customer" && conv.messages[i + 1].sender === "agent") {
          const diff =
            new Date(conv.messages[i + 1].timestamp).getTime() -
            new Date(conv.messages[i].timestamp).getTime();
          totalResponseMs += diff;
          responseCount++;
        }
      }
    }

    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseMs / responseCount / 1000) : 0;

    // Real daily activity for the last 7 days from PostgreSQL database
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentMessages = (await prisma.message.findMany({
      where: {
        timestamp: { gte: sevenDaysAgo },
      },
      select: { timestamp: true },
    })) || [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyActivity = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const count = recentMessages.filter((m) => {
        const t = new Date(m.timestamp).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      }).length;

      return {
        day: dayNames[d.getDay()],
        count,
      };
    });

    res.json({
      totalConversations,
      openCount,
      resolvedCount,
      totalMessages,
      avgResponseTime,
      channelDistribution,
      dailyActivity,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

const server = http.createServer(app);

// Setup Socket.io with production-configured CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// WebSocket In-Memory Rate Limiter Map
const wsRateLimits = new Map<string, { redraft: number[]; message: number[] }>();

function checkWsRateLimit(socketId: string, action: "redraft" | "message", limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (!wsRateLimits.has(socketId)) {
    wsRateLimits.set(socketId, { redraft: [], message: [] });
  }
  const bucket = wsRateLimits.get(socketId)![action];
  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  wsRateLimits.get(socketId)![action] = recent;
  return true;
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const expectedToken = process.env.API_AUTH_TOKEN || "demo-auth-token-123";
  if (token === expectedToken) {
    next();
  } else {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  }
});

const runAutoAssignmentForUnassignedTickets = async () => {
  const settings = getSettings();
  if (!settings.autoAssignment || settings.routingAlgorithm === "manual") {
    return;
  }

  try {
    const unassignedConversations = (await prisma.conversation.findMany({
      where: { status: "open", assignedUserId: null },
      orderBy: { createdAt: "asc" }
    })) || [];

    if (unassignedConversations.length === 0) return;

    const onlineUserIds: string[] = [];
    io.sockets.sockets.forEach((s) => {
      const u = (s as any).user;
      if (u && u.userId) {
        onlineUserIds.push(u.userId);
      }
    });

    const agents = (await prisma.user.findMany({
      where: { 
        role: "agent",
        id: { in: onlineUserIds }
      }
    })) || [];

    if (agents.length === 0) return;

    for (const conv of unassignedConversations) {
      let assignedUserId: string | null = null;

      if (settings.routingAlgorithm === "round-robin") {
        const lastAssignedConv = await prisma.conversation.findFirst({
          where: { assignedUserId: { not: null } },
          orderBy: { createdAt: "desc" }
        });
        let nextIndex = 0;
        if (lastAssignedConv) {
          const lastIndex = agents.findIndex(a => a.id === lastAssignedConv.assignedUserId);
          if (lastIndex !== -1) {
            nextIndex = (lastIndex + 1) % agents.length;
          }
        }
        assignedUserId = agents[nextIndex].id;
      } else if (settings.routingAlgorithm === "least-busy") {
        const agentsWithCounts = await Promise.all(
          agents.map(async (agent) => {
            const count = await prisma.conversation.count({
              where: { assignedUserId: agent.id, status: "open" }
            });
            return { agent, count };
          })
        );
        agentsWithCounts.sort((a, b) => a.count - b.count);
        assignedUserId = agentsWithCounts[0].agent.id;
      }

      if (assignedUserId) {
        const updated = await prisma.conversation.update({
          where: { id: conv.id },
          data: { assignedUserId },
          include: {
            customer: true,
            assignedUser: {
              select: { id: true, name: true, email: true, role: true }
            },
            messages: {
              orderBy: { timestamp: "asc" }
            }
          }
        });
        io.emit("ticket:updated", updated);
      }
    }
  } catch (error) {
    console.error("Error in runAutoAssignmentForUnassignedTickets:", error);
  }
};

io.on("connection", (socket) => {
  console.log(`[WebSocket] Agent connected: ${socket.id}`);

  const user = (socket as any).user;
  if (user && user.role === "agent") {
    setTimeout(async () => {
      await runAutoAssignmentForUnassignedTickets();
    }, 500);
  }

  // Room Subscriptions
  socket.on("ticket:join", (conversationId: unknown) => {
    if (typeof conversationId === "string" && conversationId.trim()) {
      socket.join(`ticket:${conversationId}`);
      console.log(`[WebSocket] Socket ${socket.id} joined room ticket:${conversationId}`);
    }
  });

  socket.on("ticket:leave", (conversationId: unknown) => {
    if (typeof conversationId === "string" && conversationId.trim()) {
      socket.leave(`ticket:${conversationId}`);
      console.log(`[WebSocket] Socket ${socket.id} left room ticket:${conversationId}`);
    }
  });

  // 1. Fetch and return all conversations with their messages and customer models
  socket.on("ticket:list", async () => {
    try {
      const conversations = await prisma.conversation.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          customer: true,
          assignedUser: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: {
            orderBy: { timestamp: "asc" },
          },
        },
      });
      socket.emit("ticket:list:response", conversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
      socket.emit("error", "Failed to load active tickets");
    }
  });

  // 2. Resolve a ticket (with validation)
  socket.on("ticket:resolve", async (conversationId: unknown) => {
    const parsed = validatePayload(ticketResolveSchema, conversationId);
    if (!parsed) return;

    try {
      const updated = await prisma.conversation.update({
        where: { id: parsed },
        data: { status: "resolved" },
        include: { 
          customer: true, 
          assignedUser: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: true 
        },
      });

      // Notify all connected agents
      io.emit("ticket:updated", updated);
      console.log(`[WebSocket] Ticket ${parsed} marked resolved.`);
    } catch (error) {
      console.error("Error resolving conversation:", error);
    }
  });

  // Assign ticket to agent
  socket.on("ticket:assign", async (payload: { conversationId: string; userId: string | null }) => {
    const { conversationId, userId } = payload;
    try {
      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { assignedUserId: userId },
        include: {
          customer: true,
          assignedUser: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: {
            orderBy: { timestamp: "asc" }
          }
        },
      });
      io.emit("ticket:updated", updated);
      console.log(`[WebSocket] Ticket ${conversationId} assigned to agent ${userId}.`);
    } catch (error) {
      console.error("Error assigning ticket:", error);
    }
  });

  // 3. Handle agent sending a reply (with validation and rate limit)
  socket.on("message:send", async (payload: unknown) => {
    if (!checkWsRateLimit(socket.id, "message", 30, 60 * 1000)) {
      socket.emit("error", "Rate limit exceeded: You are sending messages too quickly.");
      return;
    }
    const parsed = validatePayload(messageSendSchema, payload);
    if (!parsed) return;

    const { conversationId, content } = parsed;
    try {
      // Save agent message to database
      const message = await prisma.message.create({
        data: {
          conversationId,
          sender: "agent",
          content,
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Broadcast new message to all agents and room
      io.emit("message:new", { conversationId, message });
      io.to(`ticket:${conversationId}`).emit("message:room:new", { conversationId, message });
      console.log(`[WebSocket] Agent reply stored and broadcasted in ticket ${conversationId}`);
    } catch (error) {
      console.error("Error sending agent message:", error);
    }
  });

  // 5. Regenerate AI draft reply with rate limit
  socket.on("ai:redraft", async (payload: unknown) => {
    if (!checkWsRateLimit(socket.id, "redraft", 12, 60 * 1000)) {
      socket.emit("error", "Rate limit exceeded: Please wait a moment before requesting another AI draft.");
      return;
    }
    const parsed = validatePayload(redraftSchema, payload);
    if (!parsed) return;

    const { conversationId, lastMessageId, tone } = parsed;
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { customer: true, messages: { orderBy: { timestamp: "asc" } } },
      });

      if (!conversation) return;

      console.log(`[WebSocket] Regenerating AI draft in ${tone} tone for ticket ${conversationId}`);

      // Generate draft
      const draft = await generateDraftReply(conversation.messages, conversation.customer.name, tone);

      // Save to last message
      await prisma.message.update({
        where: { id: lastMessageId },
        data: { draftReply: draft },
      });

      // Broadcast update to all agents and room
      io.emit("message:draft:updated", { conversationId, messageId: lastMessageId, draftReply: draft });
      io.to(`ticket:${conversationId}`).emit("message:room:draft:updated", { conversationId, messageId: lastMessageId, draftReply: draft });
    } catch (error) {
      console.error("Error redrafting reply:", error);
    }
  });

  socket.on("disconnect", () => {
    wsRateLimits.delete(socket.id);
    console.log(`[WebSocket] Agent disconnected: ${socket.id}`);
  });
});

// Global Express Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Express Error Handler]:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message || "Unknown error" });
});

// Export app, server, io for testing and modularity
export { app, server, io, prisma };

// Boot servers when not in test mode
if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 AI SUPPORT DESK BACKEND SERVER RUNNING ON PORT ${port}`);
    console.log(`⚡ WebSocket gateway: http://localhost:${port}`);
    console.log(`⚡ Health Endpoint:   http://localhost:${port}/api/health`);
    console.log(`⚡ Analytics:         http://localhost:${port}/api/analytics`);
    console.log(`⚡ Webhooks:          http://localhost:${port}/api/webhooks/whatsapp`);
    console.log(`======================================================\n`);
  });
}

// Graceful Process Shutdown
const shutdown = async () => {
  console.log("\n[Server] Graceful shutdown initiated...");
  server.close(async () => {
    console.log("[Server] HTTP and WebSocket servers closed.");
    await prisma.$disconnect();
    console.log("[Server] Database connection closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
