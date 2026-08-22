import request from "supertest";
import { Server } from "socket.io";

// Define mock Prisma client structure
const mockPrisma = {
  conversation: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn().mockResolvedValue({ id: "conv-123", status: "open", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
    update: jest.fn().mockResolvedValue({}),
  },
  message: {
    count: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: "msg-123", sender: "customer", content: "", timestamp: new Date().toISOString() }),
    update: jest.fn().mockResolvedValue({}),
  },
  customer: {
    findMany: jest.fn(),
    findFirst: jest.fn().mockResolvedValue({ id: "cust-123", name: "John Doe", channel: "web", avatar: "" }),
    create: jest.fn().mockResolvedValue({ id: "cust-123", name: "John Doe", channel: "web", avatar: "" }),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  knowledgeBase: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

// Mock PrismaClient to isolate database
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  };
});

// Mock GoogleGenerativeAI to isolate external service
jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () => "Mock draft reply",
            },
          }),
        };
      }
    },
  };
});

import { app } from "./server";

const AUTH_TOKEN = "demo-auth-token-123";

describe("Backend API Integration Tests", () => {
  beforeEach(() => {
    // Reset test isolation mocks
  });

  describe("GET /api/health", () => {
    it("should return 200 and healthy status without authorization", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "healthy");
      expect(res.body).toHaveProperty("service", "ai-support-desk-backend");
    });
  });

  describe("GET /api/analytics", () => {
    it("should return 401 Unauthorized when no token is provided", async () => {
      const res = await request(app).get("/api/analytics");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized: Missing Authorization Header");
    });

    it("should return 401 Unauthorized when an invalid token is provided", async () => {
      const res = await request(app)
        .get("/api/analytics")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized: Invalid or expired token");
    });

    it("should return 200 and metrics when correct authorization is provided", async () => {
      // Mock database counts
      mockPrisma.conversation.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(5)  // open
        .mockResolvedValueOnce(15); // resolved
      mockPrisma.message.count.mockResolvedValueOnce(120);
      mockPrisma.customer.findMany.mockResolvedValueOnce([
        { channel: "whatsapp" },
        { channel: "web" },
      ]);
      mockPrisma.conversation.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get("/api/analytics")
        .set("Authorization", `Bearer ${AUTH_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalConversations", 20);
      expect(res.body).toHaveProperty("openCount", 5);
      expect(res.body).toHaveProperty("resolvedCount", 15);
      expect(res.body).toHaveProperty("totalMessages", 120);
      expect(res.body).toHaveProperty("avgResponseTime", 0);
      expect(res.body.channelDistribution).toEqual({ whatsapp: 1, web: 1 });
    });
  });

  describe("GET /api/settings", () => {
    it("should return 401 Unauthorized when no token is provided", async () => {
      const res = await request(app).get("/api/settings");
      expect(res.status).toBe(401);
    });

    it("should return 200 and settings with authorization", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set("Authorization", `Bearer ${AUTH_TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("defaultTone");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should return 400 when missing email or password", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Email and password are required");
    });
  });

  describe("Inbound Webhooks", () => {
    it("GET /api/webhooks/whatsapp should verify webhook with correct token", async () => {
      const res = await request(app)
        .get("/api/webhooks/whatsapp")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": "whatsapp-webhook-secret-token",
          "hub.challenge": "challenge_12345",
        });
      expect(res.status).toBe(200);
      expect(res.text).toBe("challenge_12345");
    });

    it("POST /api/webhooks/whatsapp should accept and process inbound WhatsApp message", async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);
      mockPrisma.customer.create.mockResolvedValueOnce({
        id: "cust-wa-1",
        name: "WhatsApp (+905551234567)",
        channel: "whatsapp",
        avatar: "",
      });
      mockPrisma.conversation.findFirst.mockResolvedValueOnce(null);
      mockPrisma.conversation.create.mockResolvedValueOnce({
        id: "conv-wa-1",
        customerId: "cust-wa-1",
        status: "open",
        messages: [],
      });
      mockPrisma.message.create.mockResolvedValueOnce({
        id: "msg-wa-1",
        conversationId: "conv-wa-1",
        sender: "customer",
        content: "Hello from WhatsApp",
      });

      const res = await request(app)
        .post("/api/webhooks/whatsapp")
        .send({
          from: "905551234567",
          name: "Test WA User",
          text: "Hello from WhatsApp",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("conversationId");
    });

    it("POST /api/webhooks/webchat should accept and process web chat message", async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);
      mockPrisma.customer.create.mockResolvedValueOnce({
        id: "cust-web-1",
        name: "Web Visitor",
        channel: "web",
        avatar: "",
      });
      mockPrisma.conversation.findFirst.mockResolvedValueOnce(null);
      mockPrisma.conversation.create.mockResolvedValueOnce({
        id: "conv-web-1",
        customerId: "cust-web-1",
        status: "open",
        messages: [],
      });
      mockPrisma.message.create.mockResolvedValueOnce({
        id: "msg-web-1",
        conversationId: "conv-web-1",
        sender: "customer",
        content: "Hi from website widget",
      });

      const res = await request(app)
        .post("/api/webhooks/webchat")
        .send({
          customerName: "Web Visitor",
          message: "Hi from website widget",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("conversationId");
    });
  });
});
