import { readJson, writeJson } from "@/lib/kv";

import {
  FREE_STEP_PRICE,
  IP_PRICE,
  OFFICIAL_DIRECT_PRICE,
  SMS_PRICE,
  UCARD_PRICE,
  UCARD_SELF_PAY,
  stepById,
  type Order,
  type StepId,
  type StepPrice,
} from "@/lib/catalog";

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readAll(): Promise<Order[]> {
  const parsed = await readJson<unknown>("orders", []);
  return Array.isArray(parsed) ? parsed.filter(isOrder) : [];
}

function isStepPrice(value: unknown): value is StepPrice {
  return (
    value === UCARD_PRICE ||
    value === UCARD_SELF_PAY ||
    value === IP_PRICE ||
    value === FREE_STEP_PRICE ||
    value === OFFICIAL_DIRECT_PRICE ||
    value === SMS_PRICE
  );
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<Order>;
  return (
    typeof order.id === "string" &&
    typeof order.sessionId === "string" &&
    typeof order.createdAt === "string" &&
    (order.step === 1 ||
      order.step === 2 ||
      order.step === 3 ||
      order.step === 4 ||
      order.step === 5) &&
    typeof order.stepTitle === "string" &&
    isStepPrice(order.serviceFee) &&
    typeof order.vendorPayable === "string" &&
    order.status === "占位已记录"
  );
}

export function listOrders(sessionId?: string): Promise<Order[]> {
  return enqueue(async () => {
    const orders = await readAll();
    const filtered = sessionId
      ? orders.filter((order) => order.sessionId === sessionId)
      : orders;
    return filtered.sort(
      (a, b) => a.step - b.step || a.createdAt.localeCompare(b.createdAt),
    );
  });
}

export function recordOrder(sessionId: string, step: StepId): Promise<Order> {
  return enqueue(async () => {
    const orders = await readAll();
    const existing = orders.find(
      (order) => order.sessionId === sessionId && order.step === step,
    );
    if (existing) return existing;

    const definition = stepById(step);
    const order: Order = {
      id: crypto.randomUUID(),
      sessionId,
      createdAt: new Date().toISOString(),
      step,
      stepTitle: definition.title,
      serviceFee: definition.priceAmount,
      vendorPayable: definition.vendorPayable,
      status: "占位已记录",
    };

    await writeJson("orders", [...orders, order]);
    return order;
  });
}
