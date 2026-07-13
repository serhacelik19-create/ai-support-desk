import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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

app.use(cors());
app.use(express.json());

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
app.post("/api/auth/login", async (req, res) => {
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

    res.json({
      totalConversations,
      openCount,
      resolvedCount,
      totalMessages,
      avgResponseTime,
      channelDistribution,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

const server = http.createServer(app);

// Setup Socket.io with permissive CORS for development
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

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
});const runAutoAssignmentForUnassignedTickets = async () => {
  const settings = getSettings();
  if (!settings.autoAssignment || settings.routingAlgorithm === "manual") {
    return;
  }

  try {
    const unassignedConversations = await prisma.conversation.findMany({
      where: { status: "open", assignedUserId: null },
      orderBy: { createdAt: "asc" }
    });

    if (unassignedConversations.length === 0) return;

    const onlineUserIds: string[] = [];
    io.sockets.sockets.forEach((s) => {
      const u = (s as any).user;
      if (u && u.userId) {
        onlineUserIds.push(u.userId);
      }
    });

    const agents = await prisma.user.findMany({
      where: { 
        role: "agent",
        id: { in: onlineUserIds }
      }
    });

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

  // 3. Handle agent sending a reply (with validation)
  socket.on("message:send", async (payload: unknown) => {
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

      // Broadcast new message to all agents
      io.emit("message:new", { conversationId, message });
      console.log(`[WebSocket] Agent reply stored and broadcasted in ticket ${conversationId}`);
    } catch (error) {
      console.error("Error sending agent message:", error);
    }
  });


  // 5. Regenerate AI draft reply with a newly selected tone (with validation)
  socket.on("ai:redraft", async (payload: unknown) => {
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

      // Broadcast update
      io.emit("message:draft:updated", { conversationId, messageId: lastMessageId, draftReply: draft });
    } catch (error) {
      console.error("Error redrafting reply:", error);
    }
  });



  socket.on("disconnect", () => {
    console.log(`[WebSocket] Agent disconnected: ${socket.id}`);
  });
});

// Boot servers
server.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AI SUPPORT DESK BACKEND SERVER RUNNING ON PORT ${port}`);
  console.log(`⚡ WebSocket gateway: http://localhost:${port}`);
  console.log(`⚡ Health Endpoint:   http://localhost:${port}/api/health`);
  console.log(`⚡ Analytics:         http://localhost:${port}/api/analytics`);
  console.log(`======================================================\n`);

});
