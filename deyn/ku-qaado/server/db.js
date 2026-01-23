import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('[DB] Connected to Supabase:', supabaseUrl);

// Legacy db object for compatibility (will be removed gradually)
const db = {
  shops: [],
  customers: [],
  debts: [],
  payments: [],
  paymentTransactions: []
};

// No longer needed with Supabase
function saveDb() {
  // Deprecated: Supabase auto-saves
}

export function calcDebtTotal(debt) {
  return debt.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
}

export async function getCustomerTotals(customerId) {
  await checkExpirations(); // Ensure statuses are up to date

  const { data: debts, error } = await supabase
    .from('debts')
    .select('*')
    .eq('customer_id', customerId);

  if (error) throw new Error(`Failed to get customer debts: ${error.message}`);

  const now = new Date();

  let totalOpen = 0;
  let totalPaid = 0;
  let hasOverdue = false;

  for (const d of debts) {
    if (d.status === "CANCELED" || d.status === "EXPIRED") continue;

    const debtTotal = calcDebtTotal(d);
    const remaining = debtTotal - (d.total_paid || 0);

    if (remaining > 0 && d.status !== "PAID") {
      totalOpen += remaining;
      // ACCEPTED debts past due date are overdue
      if (new Date(d.due_at) < now && d.status !== "PENDING_ACCEPT") {
        hasOverdue = true;
      }
    } else if (d.status === "PAID") {
      totalPaid += debtTotal;
    }
  }

  return { totalOpen: round2(totalOpen), totalPaid: round2(totalPaid), hasOverdue };
}


export async function checkExpirations() {
  const now = new Date();
  const cutoff = new Date(now - 48 * 60 * 60 * 1000).toISOString();

  // Update all PENDING_ACCEPT debts older than 48 hours to EXPIRED
  const { error } = await supabase
    .from('debts')
    .update({ status: 'EXPIRED' })
    .eq('status', 'PENDING_ACCEPT')
    .lt('created_at', cutoff);

  if (error) console.error('Failed to update expired debts:', error.message);
}


export async function canCreateDebt(customerId) {
  const { data: c, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !c) return { ok: false, reason: "CUSTOMER_NOT_FOUND" };

  const { totalOpen, hasOverdue } = await getCustomerTotals(customerId);

  if (hasOverdue) return { ok: false, reason: "HAS_OVERDUE", totalOpen };
  if (totalOpen >= c.credit_limit) return { ok: false, reason: "LIMIT_REACHED", totalOpen };

  return { ok: true, totalOpen };
}


export async function createCustomer({ shopId, name, phone, creditLimit, avatar }) {
  if (!name || name.trim().length < 2) throw new Error("INVALID_NAME");
  if (!phone || phone.length < 7) throw new Error("INVALID_PHONE");

  const id = `cus_${nanoid(8)}`;
  const c = {
    id,
    shop_id: shopId,
    name: name.trim(),
    phone: phone.trim(),
    credit_limit: creditLimit ?? 50,
    avatar: avatar || null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('customers').insert(c).select().single();
  if (error) throw new Error(`Failed to create customer: ${error.message}`);

  // Return in camelCase format for API compatibility
  return {
    id: data.id,
    shopId: data.shop_id,
    name: data.name,
    phone: data.phone,
    creditLimit: data.credit_limit,
    avatar: data.avatar,
    createdAt: data.created_at
  };
}


export async function updateCustomer(customerId, updates) {
  // Map camelCase to snake_case for Supabase
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;

  const { data, error } = await supabase
    .from('customers')
    .update(dbUpdates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) return null;

  return {
    id: data.id,
    shopId: data.shop_id,
    name: data.name,
    phone: data.phone,
    creditLimit: data.credit_limit,
    avatar: data.avatar,
    createdAt: data.created_at
  };
}


export async function searchCustomers(shopId, query) {
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .or(`name.ilike.${q},phone.ilike.${q}`);

  if (error) throw new Error(`Failed to search customers: ${error.message}`);

  // Convert to camelCase
  return data.map(c => ({
    id: c.id,
    shopId: c.shop_id,
    name: c.name,
    phone: c.phone,
    creditLimit: c.credit_limit,
    avatar: c.avatar,
    createdAt: c.created_at
  }));
}


export async function createDebt({ shopId, customerId, dueAt, items }) {
  const gate = await canCreateDebt(customerId);
  if (!gate.ok) {
    return { error: gate.reason, meta: gate };
  }

  const id = `debt_${nanoid(10)}`;
  const d = {
    id,
    shop_id: shopId,
    customer_id: customerId,
    created_at: new Date().toISOString(),
    due_at: dueAt ? new Date(dueAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "PENDING_ACCEPT",
    items: items ?? [],
    approved_at: null,
    paid_at: null,
    total_paid: 0
  };

  const { data, error } = await supabase.from('debts').insert(d).select().single();
  if (error) throw new Error(`Failed to create debt: ${error.message}`);

  // Return in camelCase
  return {
    debt: {
      id: data.id,
      shopId: data.shop_id,
      customerId: data.customer_id,
      createdAt: data.created_at,
      dueAt: data.due_at,
      status: data.status,
      items: data.items,
      approvedAt: data.approved_at,
      paidAt: data.paid_at,
      totalPaid: data.total_paid
    }
  };
}


export async function approveDebt(debtId) {
  const { data: d, error: fetchError } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .single();

  if (fetchError || !d) return null;
  if (d.status !== "PENDING_ACCEPT") return {
    id: d.id,
    status: d.status,
    totalPaid: d.total_paid
  };

  const { data, error } = await supabase
    .from('debts')
    .update({
      status: "ACCEPTED",
      approved_at: new Date().toISOString()
    })
    .eq('id', debtId)
    .select()
    .single();

  if (error) return null;

  return {
    id: data.id,
    status: data.status,
    totalPaid: data.total_paid,
    approvedAt: data.approved_at
  };
}


export async function addPayment({ debtId, amount, note }) {
  const { data: d, error: fetchError } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .single();

  if (fetchError || !d) return { error: "DEBT_NOT_FOUND" };
  if (d.status === "PENDING_ACCEPT") return { error: "NOT_ACCEPTED_YET" };

  const debtTotal = calcDebtTotal(d);
  const remaining = debtTotal - (d.total_paid || 0);

  if (amount > remaining + 0.01) { // Add small epsilon for floating point
    return { error: "AMOUNT_TOO_LARGE", remaining };
  }

  const paymentId = `pay_${nanoid(10)}`;
  const paymentData = {
    id: paymentId,
    debt_id: debtId,
    customer_id: d.customer_id,
    amount: round2(amount),
    note: note || "",
    created_at: new Date().toISOString()
  };

  const { error: payError } = await supabase.from('payments').insert(paymentData);
  if (payError) throw new Error(`Failed to add payment: ${payError.message}`);

  const newTotalPaid = round2((d.total_paid || 0) + amount);
  let newStatus = "PARTIALLY_PAID";
  let paidAt = d.paid_at;

  if (newTotalPaid >= debtTotal - 0.01) {
    newStatus = "PAID";
    paidAt = new Date().toISOString();
  }

  const { data: updatedDebt, error: updateError } = await supabase
    .from('debts')
    .update({
      total_paid: newTotalPaid,
      status: newStatus,
      paid_at: paidAt
    })
    .eq('id', debtId)
    .select()
    .single();

  if (updateError) throw new Error(`Failed to update debt: ${updateError.message}`);

  return {
    payment: {
      id: paymentData.id,
      debtId: paymentData.debt_id,
      customerId: paymentData.customer_id,
      amount: paymentData.amount,
      note: paymentData.note,
      createdAt: paymentData.created_at
    },
    debt: {
      id: updatedDebt.id,
      status: updatedDebt.status,
      totalPaid: updatedDebt.total_paid
    }
  };
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
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const debts = db.debts.filter((d) => d.shopId === shopId);
  const customers = db.customers.filter((c) => c.shopId === shopId);
  const payments = db.payments.filter((p) => {
    const debt = debts.find(d => d.id === p.debtId);
    return debt && p.createdAt >= todayStart;
  });

  const paidToday = payments.reduce((sum, p) => sum + p.amount, 0);

  // Stats for: Open Total, Paid Today, Overdue
  let totalOutstanding = 0;
  let overdueCount = 0;

  for (const c of customers) {
    const totals = getCustomerTotals(c.id);
    totalOutstanding += totals.totalOpen;
    if (totals.hasOverdue) overdueCount++;
  }

  return {
    todayDebts: debts.filter(d => d.createdAt >= todayStart).length, // Additional info
    paidToday: round2(paidToday),
    totalOutstanding: round2(totalOutstanding),
    overdueCustomers: overdueCount,
    totalCustomers: customers.length
  };
}

export async function getNotifications(shopId) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: debts, error } = await supabase
    .from('debts')
    .select('*, customers(name)')
    .eq('shop_id', shopId);

  if (error) return [];

  const notifications = [];

  for (const d of debts) {
    const customerName = d.customers?.name || "Macmiil";
    const debtTotal = calcDebtTotal(d);
    const remaining = round2(debtTotal - (d.total_paid || 0));

    if (remaining <= 0) continue;

    const dueDate = new Date(d.due_at);

    // Overdue
    if (dueDate < now && d.status !== "PAID" && d.status !== "PENDING_ACCEPT" && d.status !== "CANCELED") {
      notifications.push({
        id: `notif_${d.id}_overdue`,
        type: "OVERDUE",
        debtId: d.id,
        customerId: d.customer_id,
        customerName: customerName,
        amount: remaining,
        dueAt: d.due_at,
        createdAt: d.created_at,
        priority: "high"
      });
    }

    // Due Soon
    if (d.status !== "PAID" && d.status !== "PENDING_ACCEPT" && d.status !== "CANCELED" && d.status !== "EXPIRED" &&
      dueDate <= new Date(threeDaysFromNow) && dueDate > now) {
      notifications.push({
        id: `notif_${d.id}_due_soon`,
        type: "DUE_SOON",
        debtId: d.id,
        customerId: d.customer_id,
        customerName: customerName,
        amount: remaining,
        dueAt: d.due_at,
        createdAt: d.created_at,
        priority: "medium"
      });
    }

    // New/Pending
    if (d.status === "PENDING_ACCEPT") {
      notifications.push({
        id: `notif_${d.id}_pending`,
        type: "PENDING_APPROVAL",
        debtId: d.id,
        customerId: d.customer_id,
        customerName: customerName,
        amount: remaining,
        dueAt: d.due_at,
        createdAt: d.created_at,
        priority: "low"
      });
    }
  }

  // Payments
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: payments } = await supabase
    .from('payments')
    .select('*, customers(name), debts!inner(shop_id)')
    .eq('debts.shop_id', shopId)
    .gte('created_at', sevenDaysAgo);

  for (const p of (payments || [])) {
    notifications.push({
      id: `notif_${p.id}_payment`,
      type: "PAYMENT_RECEIVED",
      paymentId: p.id,
      customerId: p.customer_id,
      customerName: p.customers?.name || "Macmiil",
      amount: p.amount,
      createdAt: p.created_at,
      priority: "low"
    });
  }

  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}


export async function getAllShopPayments(shopId) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, amount, note, created_at, 
      debts!inner(shop_id),
      customers(name)
    `)
    .eq('debts.shop_id', shopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shop payments:', error.message);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    amount: p.amount,
    note: p.note,
    createdAt: p.created_at,
    customerName: p.customers?.name || "Macmiil"
  }));
}


export function round2(n) {
  return Math.round(n * 100) / 100;
}

// Payment Gateway Simulation Functions
export async function initiatePaymentTransaction({ debtId, amount, method, customerPhone }) {
  const { data: debt, error } = await supabase.from('debts').select('*').eq('id', debtId).single();
  if (error || !debt) return { error: "DEBT_NOT_FOUND" };

  const txnId = `txn_${nanoid(12)}`;
  const transaction = {
    id: txnId,
    debtId,
    customerId: debt.customer_id,
    amount: round2(amount),
    method, // "zaad" or "edahab"
    customerPhone,
    status: "PENDING", // PENDING, COMPLETED, FAILED
    createdAt: new Date().toISOString(),
    completedAt: null,
    failureReason: null
  };

  db.paymentTransactions.push(transaction);

  // Simulate async payment processing (in real world, this would be a webhook)
  setTimeout(async () => {
    await confirmPaymentTransaction(txnId, true);
  }, 3000); // 3 second delay to simulate payment processing

  return { transaction };
}

export async function confirmPaymentTransaction(txnId, success, failureReason = null) {
  const txn = db.paymentTransactions.find(t => t.id === txnId);
  if (!txn) return { error: "TRANSACTION_NOT_FOUND" };

  if (success) {
    txn.status = "COMPLETED";
    txn.completedAt = new Date().toISOString();

    // Automatically add payment to debt
    await addPayment({
      debtId: txn.debtId,
      amount: txn.amount,
      note: `${txn.method.toUpperCase()} payment - ${txn.id}`
    });
  } else {
    txn.status = "FAILED";
    txn.failureReason = failureReason || "Unknown error";
  }

  return { transaction: txn };
}

export function getPaymentTransaction(txnId) {
  return db.paymentTransactions.find(t => t.id === txnId);
}


export { db };

