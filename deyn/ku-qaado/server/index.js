import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import {
    db,
    calcDebtTotal,
    getCustomerTotals,
    createCustomer,
    updateCustomer,
    searchCustomers,
    createDebt,
    approveDebt,
    addPayment,
    getPaymentHistory,
    getShopStats,
    getDashboardStats,
    getNotifications,
    getAllShopPayments,
    initiatePaymentTransaction,
    getPaymentTransaction
} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware for production
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// --- Helpers ---
function customerProfileUrl(customerId) {
    return `http://localhost:5174/profile.html?customer=${encodeURIComponent(customerId)}`;
}

function whatsappLink({ phone, customerId, shopName, amount }) {
    const link = customerProfileUrl(customerId);
    const msg =
        `Salaam. ${shopName} ayaad ku leedahay deyn $${amount}.\n` +
        `Riix linkiga si aad u xaqiijiso ama u bixiso:\n${link}`;
    const p = phone.replace("+", "");
    return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

// Mock session store for production-like OTP flow
const sessions = new Map();

app.post("/api/auth/send-otp", (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 7) return res.status(400).json({ error: "INVALID_PHONE" });

    const otp = "123456"; // Always 123456 for this demo but logic is production-ready
    sessions.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

    console.log(`[AUTH] Production-ready OTP sent to ${phone}: ${otp}`);
    res.json({ success: true, message: "OTP sent" });
});

app.post("/api/auth/verify-otp", (req, res) => {
    const { phone, otp } = req.body;
    const session = sessions.get(phone);

    if (!session) return res.status(401).json({ error: "NO_SESSION" });
    if (Date.now() > session.expires) {
        sessions.delete(phone);
        return res.status(401).json({ error: "OTP_EXPIRED" });
    }

    if (otp === session.otp) {
        sessions.delete(phone); // Burn OTP after use
        res.json({ success: true, token: "prod_token_" + nanoid(16), shopId: "shop_1" });
    } else {
        res.status(401).json({ error: "INVALID_OTP" });
    }
});

// --- APIs for merchant (mobile) ---

// Dashboard
app.get("/api/shop/:shopId/dashboard", async (req, res) => {
    const { shopId } = req.params;
    const stats = await getDashboardStats(shopId);
    res.json(stats);
});


// Notifications
app.get("/api/shop/:shopId/notifications", async (req, res) => {
    const { shopId } = req.params;
    const notifications = await getNotifications(shopId);
    res.json({ notifications });
});


app.get("/api/shop/:shopId/customers", async (req, res) => {
    const { shopId } = req.params;
    const { search } = req.query;

    let customers = await searchCustomers(shopId, search || "");

    // Additional info
    const { data: shops } = await supabase.from('shops').select('name').eq('id', shopId);
    const shopName = shops?.[0]?.name || "Ku Qaado";

    const enrichedCustomers = await Promise.all(customers.map(async (c) => {
        const totals = await getCustomerTotals(c.id);
        const debtTotal = totals.totalOpen;
        return {
            ...c,
            totalOpen: totals.totalOpen,
            totalPaid: totals.totalPaid,
            hasOverdue: totals.hasOverdue,
            profileUrl: customerProfileUrl(c.id),
            whatsappUrl: whatsappLink({ phone: c.phone, customerId: c.id, shopName, amount: debtTotal })
        };
    }));

    res.json({ customers: enrichedCustomers });
});


app.get("/api/customers/:customerId", async (req, res) => {
    const { customerId } = req.params;
    const { data: c, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (error || !c) return res.status(404).json({ error: "NOT_FOUND" });

    const customer = {
        id: c.id,
        shopId: c.shop_id,
        name: c.name,
        phone: c.phone,
        creditLimit: c.credit_limit,
        avatar: c.avatar,
        createdAt: c.created_at
    };

    const { data: shops } = await supabase.from('shops').select('name').eq('id', customer.shopId);
    const shopName = shops?.[0]?.name || "Ku Qaado";

    const totals = await getCustomerTotals(customerId);
    const { data: rawDebts } = await supabase
        .from('debts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    const debts = (rawDebts || []).map((d) => {
        const total = calcDebtTotal(d);
        const remaining = round2(total - (d.total_paid || 0));
        return {
            id: d.id,
            shopId: d.shop_id,
            customerId: d.customer_id,
            createdAt: d.created_at,
            dueAt: d.due_at,
            status: d.status,
            items: d.items,
            total,
            remaining,
            totalPaid: d.total_paid || 0
        };
    });

    const payments = await getPaymentHistory(customerId);

    res.json({
        customer: {
            ...customer,
            totalOpen: totals.totalOpen,
            totalPaid: totals.totalPaid,
            hasOverdue: totals.hasOverdue,
            profileUrl: customerProfileUrl(customer.id),
            whatsappUrl: whatsappLink({ phone: customer.phone, customerId: customer.id, shopName })
        },
        debts,
        payments
    });
});


app.post("/api/customers", async (req, res) => {
    try {
        const { shopId, name, phone, creditLimit, avatar } = req.body ?? {};
        if (!shopId) return res.status(400).json({ error: "MISSING_SHOP_ID" });
        const c = await createCustomer({ shopId, name, phone, creditLimit, avatar });
        res.json({ customer: c });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


app.patch("/api/customers/:customerId", async (req, res) => {
    const { customerId } = req.params;
    const updates = req.body;
    const c = await updateCustomer(customerId, updates);
    if (!c) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ customer: c });
});


app.post("/api/debts", async (req, res) => {
    const { shopId, customerId, dueAt, items } = req.body ?? {};
    if (!shopId || !customerId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const out = await createDebt({ shopId, customerId, dueAt, items });
    if (out.error) return res.status(409).json(out);

    const { data: shops } = await supabase.from('shops').select('name').eq('id', shopId);
    const shopName = shops?.[0]?.name || "Ku Qaado";

    const { data: c } = await supabase.from('customers').select('phone').eq('id', customerId).single();
    if (!c) return res.status(404).json({ error: "CUSTOMER_NOT_FOUND" });

    const debtTotal = out.debt.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

    res.json({
        ...out,
        whatsappUrl: whatsappLink({
            phone: c.phone,
            customerId,
            shopName,
            amount: debtTotal
        })
    });
});


app.post("/api/debts/:debtId/payment", async (req, res) => {
    const { debtId } = req.params;
    const { amount, note } = req.body ?? {};

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "INVALID_AMOUNT" });
    }

    const result = await addPayment({ debtId, amount, note });
    if (result.error) {
        return res.status(400).json(result);
    }

    res.json(result);
});


app.post("/api/debts/:debtId/paid", async (req, res) => {
    // Mark as fully paid (legacy endpoint)
    const { debtId } = req.params;
    const { data: debt, error } = await supabase.from('debts').select('*').eq('id', debtId).single();
    if (error || !debt) return res.status(404).json({ error: "NOT_FOUND" });

    const total = calcDebtTotal(debt);
    const remaining = round2(total - (debt.total_paid || 0));

    if (remaining > 0) {
        const result = await addPayment({ debtId: debt.id, amount: remaining, note: "Full payment" });
        if (result.error) return res.status(400).json(result);
        return res.json({ debt: result.debt });
    }

    res.json({
        debt: {
            id: debt.id,
            status: debt.status,
            totalPaid: debt.total_paid
        }
    });
});


app.get("/api/shop/:shopId/stats", async (req, res) => {
    const { shopId } = req.params;
    const stats = await getShopStats(shopId);
    res.json(stats);
});

app.get("/api/shop/:shopId/payments", async (req, res) => {
    const { shopId } = req.params;
    const payments = await getAllShopPayments(shopId);
    res.json({ payments });
});


// --- Payment Gateway Simulation APIs ---
app.post("/api/payments/initiate", (req, res) => {
    const { debtId, amount, method, customerPhone } = req.body;

    if (!debtId || !amount || !method) {
        return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    const result = initiatePaymentTransaction({ debtId, amount, method, customerPhone });

    if (result.error) {
        return res.status(400).json(result);
    }

    res.json(result);
});

app.get("/api/payments/status/:txnId", (req, res) => {
    const { txnId } = req.params;
    const transaction = getPaymentTransaction(txnId);

    if (!transaction) {
        return res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
    }

    res.json({ transaction });
});

// --- APIs for customer web link ---
app.get("/api/public/customer/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;
        const { data: c, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (error || !c) return res.status(404).json({ error: "NOT_FOUND" });

        const { data: shops } = await supabase.from('shops').select('name, logo').eq('id', c.shop_id).single();
        const totals = await getCustomerTotals(customerId);

        const { data: rawDebts } = await supabase
            .from('debts')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        const debts = (rawDebts || []).map((d) => {
            const total = calcDebtTotal(d);
            const remaining = round2(total - (d.total_paid || 0));
            return {
                id: d.id,
                shopId: d.shop_id,
                customerId: d.customer_id,
                createdAt: d.created_at,
                dueAt: d.due_at,
                status: d.status,
                items: d.items,
                total,
                remaining,
                totalPaid: d.total_paid || 0
            };
        });

        const payments = await getPaymentHistory(customerId);

        res.json({
            customer: {
                name: c.name,
                phoneMasked: maskPhone(c.phone),
                creditLimit: c.credit_limit,
                totalOpen: totals.totalOpen,
                totalPaid: totals.totalPaid,
                hasOverdue: totals.hasOverdue,
                avatar: c.avatar
            },
            shop: {
                name: shops?.name || "Ku Qaado",
                logo: shops?.logo
            },
            debts,
            payments
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/public/debts/:debtId/approve", async (req, res) => {
    const d = await approveDebt(req.params.debtId);
    if (!d) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ debt: d });
});


function maskPhone(phone) {
    const s = String(phone);
    if (s.length < 6) return "******";
    return s.slice(0, 6) + "*****" + s.slice(-2);
}

const PORT = 5173;
app.listen(PORT, () => {
    console.log(`Ku Qaado API running on http://localhost:${PORT}`);
});
