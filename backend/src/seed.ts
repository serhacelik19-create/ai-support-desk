import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[Seed] Cleaning up old data from DB...");
  await prisma.conversation.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.knowledgeBase.deleteMany({});

  console.log("[Seed] Seeding default users (Admin & Agents)...");
  
  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@company.com",
      password: adminPassword,
      role: "admin",
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: "Ahmet Yılmaz",
      email: "temsilci1@company.com",
      password: agentPassword,
      role: "agent",
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: "Elif Kaya",
      email: "temsilci2@company.com",
      password: agentPassword,
      role: "agent",
    },
  });

  console.log("[Seed] Seeding default customers...");

  await prisma.customer.create({
    data: {
      name: "Mehmet Yılmaz",
      channel: "web",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet",
    }
  });

  await prisma.customer.create({
    data: {
      name: "Jane Smith",
      channel: "whatsapp",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jane",
    }
  });

  await prisma.customer.create({
    data: {
      name: "Can Demir",
      channel: "whatsapp",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Can",
    }
  });

  console.log("[Seed] Seeding default knowledge base...");
  await prisma.knowledgeBase.create({
    data: {
      title: "İade ve İptal Kuralları",
      content: "Müşteri iade veya iptal talep ettiğinde onlara teselli ve jest olarak 100 TL değerinde hediye kuponu kodu olan JEST100 teklif edin."
    }
  });

  console.log("[Seed] Database seeding successful!");
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
