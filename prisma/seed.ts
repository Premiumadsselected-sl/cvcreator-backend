import { PrismaClient, PlanType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Leer variables de entorno para los planes
  const trialPlanName = process.env.TRIAL_PLAN_NAME || "Trial";
  const trialPlanPrice = parseFloat(process.env.TRIAL_PLAN_PRICE || "60");
  const trialPlanCurrency = process.env.TRIAL_PLAN_CURRENCY || "EUR";
  const trialPlanDescription =
    process.env.TRIAL_PLAN_DESCRIPTION ||
    "Plan de prueba inicial con acceso limitado.";
  const trialPlanFeatures = JSON.stringify(
    process.env.TRIAL_PLAN_FEATURES?.split(",").map((f) => f.trim()) || [
      "Acceso a funciones básicas",
      "Acceso a plantillas basicas",
      "Creación ilimitada de CVs",
    ]
  );

  const standardPlanName = process.env.STANDARD_PLAN_NAME || "Standard";
  const standardPlanPrice = parseFloat(
    process.env.STANDARD_PLAN_PRICE || "4999"
  );
  const standardPlanCurrency = process.env.STANDARD_PLAN_CURRENCY || "EUR";
  const standardPlanDescription =
    process.env.STANDARD_PLAN_DESCRIPTION ||
    "Plan Estándar con acceso a todas las funcionalidades principales.";
  const standardPlanFeatures = JSON.stringify(
    process.env.STANDARD_PLAN_FEATURES?.split(",").map((f) => f.trim()) || [
      "Acceso completo a todas las plantillas",
      "Creación ilimitada de CVs",
      "Creación ilimitada de Cartas de Presentación",
      "Soporte estándar",
    ]
  );

  const premiumPlanName = process.env.PREMIUM_PLAN_NAME || "Premium";
  const premiumPlanPrice = parseFloat(process.env.PREMIUM_PLAN_PRICE || "9999");
  const premiumPlanCurrency = process.env.PREMIUM_PLAN_CURRENCY || "EUR";
  const premiumPlanDescription =
    process.env.PREMIUM_PLAN_DESCRIPTION ||
    "Plan Premium con funcionalidades avanzadas.";
  const premiumPlanFeatures = JSON.stringify(
    process.env.PREMIUM_PLAN_FEATURES?.split(",").map((f) => f.trim()) || [
      "Todas las funciones del plan Estándar",
      "Plantillas Premium",
      "Soporte prioritario",
      "Analíticas Avanzadas",
    ]
  );

  const enterprisePlanName = process.env.ENTERPRISE_PLAN_NAME || "Enterprise";
  const enterprisePlanPrice = parseFloat(
    process.env.ENTERPRISE_PLAN_PRICE || "19999"
  );
  const enterprisePlanCurrency = process.env.ENTERPRISE_PLAN_CURRENCY || "EUR";
  const enterprisePlanDescription =
    process.env.ENTERPRISE_PLAN_DESCRIPTION ||
    "Plan Enterprise con funcionalidades avanzadas y soporte personalizado.";
  const enterprisePlanFeatures = JSON.stringify(
    process.env.ENTERPRISE_PLAN_FEATURES?.split(",").map((f) => f.trim()) || [
      "Todas las funciones del plan Premium",
      "Soporte personalizado",
      "Integraciones avanzadas",
      "Analíticas empresariales",
    ]
  );

  // Seed Plan: Trial
  const trialPlan = await prisma.plan.upsert({
    where: { name: trialPlanName },
    update: {
      price: trialPlanPrice,
      currency: trialPlanCurrency,
      billing_interval: "month",
      type: PlanType.TRIAL_PLAN,
      active: true,
      description: trialPlanDescription,
      features: trialPlanFeatures,
    },
    create: {
      name: trialPlanName,
      price: trialPlanPrice,
      currency: trialPlanCurrency,
      billing_interval: "month",
      type: PlanType.TRIAL_PLAN,
      active: true,
      description: trialPlanDescription,
      features: trialPlanFeatures,
    },
  });

  console.log(`Created/updated plan: ${trialPlan.name} (ID: ${trialPlan.id})`);

  // Seed Plan: Standard
  const standardPlan = await prisma.plan.upsert({
    where: { name: standardPlanName },
    update: {
      price: standardPlanPrice,
      currency: standardPlanCurrency,
      billing_interval: "month",
      type: PlanType.NORMAL_PLAN,
      active: true,
      description: standardPlanDescription,
      features: standardPlanFeatures,
    },
    create: {
      name: standardPlanName,
      price: standardPlanPrice,
      currency: standardPlanCurrency,
      billing_interval: "month",
      type: PlanType.NORMAL_PLAN,
      active: true,
      description: standardPlanDescription,
      features: standardPlanFeatures,
    },
  });
  console.log(
    `Created/updated plan: ${standardPlan.name} (ID: ${standardPlan.id})`
  );

  // Seed Plan: Premium
  const premiumPlan = await prisma.plan.upsert({
    where: { name: premiumPlanName },
    update: {
      price: premiumPlanPrice,
      currency: premiumPlanCurrency,
      billing_interval: "month",
      type: PlanType.PREMIUM_PLAN,
      active: true,
      description: premiumPlanDescription,
      features: premiumPlanFeatures,
    },
    create: {
      name: premiumPlanName,
      price: premiumPlanPrice,
      currency: premiumPlanCurrency,
      billing_interval: "month",
      type: PlanType.PREMIUM_PLAN,
      active: true,
      description: premiumPlanDescription,
      features: premiumPlanFeatures,
    },
  });
  console.log(
    `Created/updated plan: ${premiumPlan.name} (ID: ${premiumPlan.id})`
  );

  // Seed Plan : Enterprise
  const enterprisePlan = await prisma.plan.upsert({
    where: { name: "Enterprise" },
    update: {
      price: enterprisePlanPrice,
      currency: enterprisePlanCurrency,
      billing_interval: "month",
      type: PlanType.ENTERPRISE_PLAN,
      active: true,
      description: enterprisePlanDescription,
      features: enterprisePlanFeatures,
    },
    create: {
      name: enterprisePlanName,
      price: enterprisePlanPrice,
      currency: enterprisePlanCurrency,
      billing_interval: "month",
      type: PlanType.ENTERPRISE_PLAN,
      active: true,
      description: enterprisePlanDescription,
      features: enterprisePlanFeatures,
    },
  });
  console.log(
    `Created/updated plan: ${enterprisePlan.name} (ID: ${enterprisePlan.id})`
  );

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch((e) => {
      console.error("Error disconnecting Prisma:", e);
      process.exit(1);
    });
  });
