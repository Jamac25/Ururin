import { readFileSync, writeFileSync, existsSync } from "fs";
import { nanoid } from "nanoid";

const DB_FILE = "./database.json";

// Initialize database
let db = {
  shops: [],
  customers: [],
  debts: [],
  payments: [],
  users: []
};

// Load from file if exists
if (existsSync(DB_FILE)) {
  try {
    db = JSON.parse(readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to load database, using defaults");
  }
} else {
  // Initialize with sample data
  db = {
    shops: [{ id: "shop_1", name: "Axmed Shop", currency: "USD", logo: null }],
    customers: [
      {
        id: "cus_1",
        shopId: "shop_1",
        name: "Cabdi Axmed",
        phone: "+252619000111",
        creditLimit: 50,
        avatar: null,
        createdAt: new Date().toISOString()
      },
      {
        id: "cus_2",
        shopId: "shop_1",
        name: "Maxamed Ali",
        phone: "+252619000222",
        creditLimit: 30,
        avatar: null,
        createdAt: new Date().toISOString()
      }
    ],
    debts: [
      {
        id: "debt_1",
        shopId: "shop_1",
        customerId: "cus_1",
        createdAt: "2024-04-09T10:00:00.000Z",
        dueAt: "2024-04-20T10:00:00.000Z",
        status: "APPROVED",
        items: [
          { name: "Sonkor", qty: 2, unitPrice: 6 },
          { name: "Shaah", qty: 1, unitPrice: 2 }
        ],
        approvedAt: "2024-04-09T11:00:00.000Z",
        paidAt: null,
        totalPaid: 0
      },
      {
        id: "debt_2",
        shopId: "shop_1",
        customerId: "cus_1",
        createdAt: "2024-04-11T10:00:00.000Z",
        dueAt: "2024-04-15T10:00:00.000Z",
        status: "PENDING",
        items: [{ name: "Bariis", qty: 3, unitPrice: 3.67 }],
        approvedAt: null,
        paidAt: null,
        totalPaid: 0
      }
    ],
    payments: [],
    users: []
  };
  saveDb();
}

function saveDb() {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save database:", e);
  }
}

export function calcDebtTotal(debt) {
  return debt.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
}

export function getCustomerTotals(customerId) {
  const debts = db.debts.filter((d) => d.customerId === customerId);
  const now = new Date();

  let totalOpen = 0;
  let totalPaid = 0;
  let hasOverdue = false;

  for (const d of debts) {
    const debtTotal = calcDebtTotal(d);
    const remaining = debtTotal - (d.totalPaid || 0);

    // Mark overdue on read
    if (remaining > 0 && d.status !== "PAID" && new Date(d.dueAt) < now) {
      if (d.status !== "OVERDUE") {
        d.status = "OVERDUE";
        saveDb();
      }
    }

    if (d.status !== "PAID") {
      totalOpen += remaining;
    } else {
      totalPaid += debtTotal;
    }

    if (d.status === "OVERDUE") hasOverdue = true;
  }

  return { totalOpen: round2(totalOpen), totalPaid: round2(totalPaid), hasOverdue };
}

export function canCreateDebt(customerId) {
  const c = db.customers.find((x) => x.id === customerId);
  if (!c) return { ok: false, reason: "CUSTOMER_NOT_FOUND" };

  const { totalOpen, hasOverdue } = getCustomerTotals(customerId);

  if (hasOverdue) return { ok: false, reason: "HAS_OVERDUE", totalOpen };
  if (totalOpen >= c.creditLimit) return { ok: false, reason: "LIMIT_REACHED", totalOpen };

  return { ok: true, totalOpen };
}

export function createCustomer({ shopId, name, phone, creditLimit, avatar }) {
  const id = `cus_${nanoid(8)}`;
  const c = {
    id,
    shopId,
    name,
    phone,
    creditLimit: creditLimit ?? 50,
    avatar: avatar || null,
    createdAt: new Date().toISOString()
  };
  db.customers.push(c);
  saveDb();
  return c;
}

export function updateCustomer(customerId, updates) {
  const c = db.customers.find((x) => x.id === customerId);
  if (!c) return null;

  Object.assign(c, updates);
  saveDb();
  return c;
}

export function searchCustomers(shopId, query) {
  const q = query.toLowerCase();
  return db.customers
    .filter((c) => c.shopId === shopId)
    .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
}

export function createDebt({ shopId, customerId, dueAt, items }) {
  const gate = canCreateDebt(customerId);
  if (!gate.ok) {
    return { error: gate.reason, meta: gate };
  }

  const id = `debt_${nanoid(10)}`;
  const d = {
    id,
    shopId,
    customerId,
    createdAt: new Date().toISOString(),
    dueAt: new Date(dueAt).toISOString(),
    status: "PENDING",
    items: items ?? [],
    approvedAt: null,
    paidAt: null,
    totalPaid: 0
  };
  db.debts.push(d);
  saveDb();
  return { debt: d };
}

export function approveDebt(debtId) {
  const d = db.debts.find((x) => x.id === debtId);
  if (!d) return null;
  if (d.status === "PAID") return d;
  d.status = "APPROVED";
  d.approvedAt = new Date().toISOString();
  saveDb();
  return d;
}

export function addPayment({ debtId, amount, note }) {
  const d = db.debts.find((x) => x.id === debtId);
  if (!d) return { error: "DEBT_NOT_FOUND" };

  const debtTotal = calcDebtTotal(d);
  const remaining = debtTotal - (d.totalPaid || 0);

  if (amount > remaining) {
    return { error: "AMOUNT_TOO_LARGE", remaining };
  }

  const paymentId = `pay_${nanoid(10)}`;
  const payment = {
    id: paymentId,
    debtId,
    customerId: d.customerId,
    amount: round2(amount),
    note: note || "",
    createdAt: new Date().toISOString()
  };

  db.payments.push(payment);
  d.totalPaid = round2((d.totalPaid || 0) + amount);

  // Check if fully paid
  if (d.totalPaid >= debtTotal) {
    d.status = "PAID";
    d.paidAt = new Date().toISOString();
  }

  saveDb();
  return { payment, debt: d };
}

export function getPaymentHistory(customerId) {
  return db.payments
    .filter((p) => p.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getShopStats(shopId) {
  const customers = db.customers.filter((c) => c.shopId === shopId);
  const debts = db.debts.filter((d) => d.shopId === shopId);

  let totalOutstanding = 0;
  let totalPaid = 0;
  let overdueCount = 0;

  for (const c of customers) {
    const totals = getCustomerTotals(c.id);
    totalOutstanding += totals.totalOpen;
    totalPaid += totals.totalPaid;
    if (totals.hasOverdue) overdueCount++;
  }

  return {
    totalCustomers: customers.length,
    totalOutstanding: round2(totalOutstanding),
    totalPaid: round2(totalPaid),
    overdueCustomers: overdueCount,
    totalDebts: debts.length
  };
}

export function getDashboardStats(shopId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const debts = db.debts.filter((d) => d.shopId === shopId);
  const customers = db.customers.filter((c) => c.shopId === shopId);

  // Tänään luodut velat
  const todayDebts = debts.filter((d) => {
    const created = new Date(d.createdAt);
    return created >= today;
  });

  const todayTotal = todayDebts.reduce((sum, d) => sum + calcDebtTotal(d), 0);

  // Kokonaisvelka
  let totalOutstanding = 0;
  let overdueCount = 0;

  for (const c of customers) {
    const totals = getCustomerTotals(c.id);
    totalOutstanding += totals.totalOpen;
    if (totals.hasOverdue) overdueCount++;
  }

  return {
    todayDebts: todayDebts.length,
    todayTotal: round2(todayTotal),
    totalOutstanding: round2(totalOutstanding),
    overdueCustomers: overdueCount,
    totalCustomers: customers.length
  };
}

export function getNotifications(shopId) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const debts = db.debts.filter((d) => d.shopId === shopId);
  const notifications = [];

  for (const d of debts) {
    const customer = db.customers.find((c) => c.id === d.customerId);
    if (!customer) continue;

    const dueDate = new Date(d.dueAt);
    const debtTotal = calcDebtTotal(d);
    const remaining = debtTotal - (d.totalPaid || 0);

    // Erääntyneet
    if (d.status === "OVERDUE" && remaining > 0) {
      notifications.push({
        id: `notif_${d.id}_overdue`,
        type: "OVERDUE",
        debtId: d.id,
        customerId: d.customerId,
        customerName: customer.name,
        amount: round2(remaining),
        dueAt: d.dueAt,
        createdAt: d.createdAt,
        priority: "high"
      });
    }

    // Erääntymässä (3 päivän sisällä)
    if (d.status !== "PAID" && d.status !== "OVERDUE" && dueDate <= threeDaysFromNow && dueDate > now && remaining > 0) {
      notifications.push({
        id: `notif_${d.id}_due_soon`,
        type: "DUE_SOON",
        debtId: d.id,
        customerId: d.customerId,
        customerName: customer.name,
        amount: round2(remaining),
        dueAt: d.dueAt,
        createdAt: d.createdAt,
        priority: "medium"
      });
    }

    // Odottaa hyväksyntää
    if (d.status === "PENDING") {
      notifications.push({
        id: `notif_${d.id}_pending`,
        type: "PENDING_APPROVAL",
        debtId: d.id,
        customerId: d.customerId,
        customerName: customer.name,
        amount: debtTotal,
        createdAt: d.createdAt,
        priority: "low"
      });
    }
  }

  // Viimeisimmät maksut (viimeisen 7 päivän aikana)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentPayments = db.payments.filter((p) => {
    const debt = debts.find((d) => d.id === p.debtId);
    return debt && new Date(p.createdAt) >= sevenDaysAgo;
  });

  for (const p of recentPayments) {
    const customer = db.customers.find((c) => c.id === p.customerId);
    if (!customer) continue;

    notifications.push({
      id: `notif_${p.id}_payment`,
      type: "PAYMENT_RECEIVED",
      paymentId: p.id,
      customerId: p.customerId,
      customerName: customer.name,
      amount: p.amount,
      createdAt: p.createdAt,
      priority: "low"
    });
  }

  // Järjestä prioriteetin ja ajan mukaan
  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export { db };

