import express from "express";
import cors from "cors";
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
    getNotifications
} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// --- Helpers ---
function customerProfileUrl(customerId) {
    return `http://localhost:5174/profile.html?customer=${encodeURIComponent(customerId)}`;
}

function whatsappLink({ phone, customerId, shopName }) {
    const link = customerProfileUrl(customerId);
    const msg =
        `Salaam. Tani waa profile-kaaga deynta (${shopName}).\n` +
        `Eeg dhammaan wax iibsigaaga oo oggolow:\n${link}`;
    const p = phone.replace("+", "");
    return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

// --- APIs for merchant (mobile) ---

// Dashboard
app.get("/api/shop/:shopId/dashboard", (req, res) => {
    const { shopId } = req.params;
    const stats = getDashboardStats(shopId);
    res.json(stats);
});

// Notifications
app.get("/api/shop/:shopId/notifications", (req, res) => {
    const { shopId } = req.params;
    const notifications = getNotifications(shopId);
    res.json({ notifications });
});

app.get("/api/shop/:shopId/customers", (req, res) => {
    const { shopId } = req.params;
    const { search } = req.query;

    let customers = db.customers.filter((c) => c.shopId === shopId);

    // Apply search filter
    if (search) {
        const q = search.toLowerCase();
        customers = customers.filter(
            (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
        );
    }

    const shop = db.shops.find((s) => s.id === shopId);

    customers = customers.map((c) => {
        const totals = getCustomerTotals(c.id);
        return {
            ...c,
            totalOpen: totals.totalOpen,
            totalPaid: totals.totalPaid,
            hasOverdue: totals.hasOverdue,
            profileUrl: customerProfileUrl(c.id),
            whatsappUrl: whatsappLink({ phone: c.phone, customerId: c.id, shopName: shop?.name || "Ku Qaado" })
        };
    });

    res.json({ customers });
});

app.get("/api/customers/:customerId", (req, res) => {
    const { customerId } = req.params;
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) return res.status(404).json({ error: "NOT_FOUND" });

    const shop = db.shops.find((s) => s.id === c.shopId);
    const totals = getCustomerTotals(customerId);
    const debts = db.debts
        .filter((d) => d.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((d) => {
            const total = calcDebtTotal(d);
            const remaining = total - (d.totalPaid || 0);
            return {
                ...d,
                total,
                remaining,
                totalPaid: d.totalPaid || 0
            };
        });

    const payments = getPaymentHistory(customerId);

    res.json({
        customer: {
            ...c,
            totalOpen: totals.totalOpen,
            totalPaid: totals.totalPaid,
            hasOverdue: totals.hasOverdue,
            profileUrl: customerProfileUrl(c.id),
            whatsappUrl: whatsappLink({ phone: c.phone, customerId: c.id, shopName: shop?.name || "Ku Qaado" })
        },
        debts,
        payments
    });
});

app.post("/api/customers", (req, res) => {
    const { shopId, name, phone, creditLimit, avatar } = req.body ?? {};
    if (!shopId || !name || !phone) return res.status(400).json({ error: "MISSING_FIELDS" });
    const c = createCustomer({ shopId, name, phone, creditLimit, avatar });
    res.json({ customer: c });
});

app.patch("/api/customers/:customerId", (req, res) => {
    const { customerId } = req.params;
    const updates = req.body;
    const c = updateCustomer(customerId, updates);
    if (!c) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ customer: c });
});

app.post("/api/debts", (req, res) => {
    const { shopId, customerId, dueAt, items } = req.body ?? {};
    if (!shopId || !customerId || !dueAt || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const out = createDebt({ shopId, customerId, dueAt, items });
    if (out.error) return res.status(409).json(out);
    res.json(out);
});

app.post("/api/debts/:debtId/payment", (req, res) => {
    const { debtId } = req.params;
    const { amount, note } = req.body ?? {};

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "INVALID_AMOUNT" });
    }

    const result = addPayment({ debtId, amount, note });
    if (result.error) {
        return res.status(400).json(result);
    }

    res.json(result);
});

app.post("/api/debts/:debtId/paid", (req, res) => {
    // Mark as fully paid (legacy endpoint)
    const debt = db.debts.find((d) => d.id === req.params.debtId);
    if (!debt) return res.status(404).json({ error: "NOT_FOUND" });

    const total = calcDebtTotal(debt);
    const remaining = total - (debt.totalPaid || 0);

    if (remaining > 0) {
        const result = addPayment({ debtId: debt.id, amount: remaining, note: "Full payment" });
        if (result.error) return res.status(400).json(result);
        return res.json({ debt: result.debt });
    }

    res.json({ debt });
});

app.get("/api/shop/:shopId/stats", (req, res) => {
    const { shopId } = req.params;
    const stats = getShopStats(shopId);
    res.json(stats);
});

// --- APIs for customer web link ---
app.get("/api/public/customer/:customerId", (req, res) => {
    const { customerId } = req.params;
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) return res.status(404).json({ error: "NOT_FOUND" });

    const shop = db.shops.find((s) => s.id === c.shopId);
    const totals = getCustomerTotals(customerId);
    const debts = db.debts
        .filter((d) => d.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((d) => {
            const total = calcDebtTotal(d);
            const remaining = total - (d.totalPaid || 0);
            return {
                ...d,
                total,
                remaining,
                totalPaid: d.totalPaid || 0
            };
        });

    const payments = getPaymentHistory(customerId);

    res.json({
        customer: {
            name: c.name,
            phoneMasked: maskPhone(c.phone),
            creditLimit: c.creditLimit,
            totalOpen: totals.totalOpen,
            totalPaid: totals.totalPaid,
            hasOverdue: totals.hasOverdue,
            avatar: c.avatar
        },
        shop: {
            name: shop?.name || "Ku Qaado",
            logo: shop?.logo
        },
        debts,
        payments
    });
});

app.post("/api/public/debts/:debtId/approve", (req, res) => {
    const d = approveDebt(req.params.debtId);
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
