import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView, View, Text, Pressable, FlatList, TextInput, Alert, Linking, ScrollView, Modal } from "react-native";

const API = "http://localhost:5173";
const SHOP_ID = "shop_1";

const colors = {
    primary: "#1E293B",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    text: "#020617",
    muted: "#64748B",
    border: "#E5E7EB",
    status: {
        paid: "#2563EB",
        dueSoon: "#F59E0B",
        late: "#DC2626"
    }
};

const spacing = {
    padding: 16,
    gap: 12,
    radius: 16,
    buttonHeight: 52
};

function money(n) { return `$${Math.round(n * 100) / 100}`; }

const statusLabels = {
    "PENDING_ACCEPT": "Sugaya",
    "ACCEPTED": "La aqbalay",
    "PARTIALLY_PAID": "Qayb",
    "PAID": "Bixiyay",
    "CANCELED": "Joojiyay",
    "LATE": "Dib u dhacay"
};

function Badge({ type }) {
    const label = statusLabels[type] || type;
    const bg =
        type === "PAID" ? "#2563EB20" :
            (type === "LATE" || type === "CANCELED") ? "#DC262620" :
                type === "PENDING_ACCEPT" ? "#F59E0B20" :
                    type === "ACCEPTED" ? "#2563EB20" :
                        "#E5E7EB";
    const color =
        type === "PAID" ? "#2563EB" :
            (type === "LATE" || type === "CANCELED") ? "#DC2626" :
                type === "PENDING_ACCEPT" ? "#F59E0B" :
                    type === "ACCEPTED" ? "#2563EB" :
                        "#64748B";

    return (
        <View style={{
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: bg,
            alignSelf: "flex-start"
        }}>
            <Text style={{ color, fontWeight: "800", fontSize: 10, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
        </View>
    );
}

// ============================================
// COMPONENTS
// ============================================
function Button({ label, onPress, type = "primary", disabled = false, style = {} }) {
    const isPrimary = type === "primary";
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => ({
                backgroundColor: isPrimary ? colors.primary : "transparent",
                borderWidth: isPrimary ? 0 : 1,
                borderColor: isPrimary ? "transparent" : "#CBD5E1",
                height: spacing.buttonHeight,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: disabled ? 0.5 : (pressed ? 0.8 : 1),
                ...style
            })}
        >
            <Text style={{
                color: isPrimary ? "white" : colors.primary,
                fontWeight: "700",
                fontSize: 16
            }}>
                {label}
            </Text>
        </Pressable>
    );
}

function Input({ label, value, onChangeText, placeholder, type = "text", optional = false }) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>
                {label} {optional && <Text style={{ fontWeight: "400" }}>(Ikhtiyaari)</Text>}
            </Text>
            <TextInput
                style={{
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    height: 52,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: colors.text
                }}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                keyboardType={type === "phone" ? "phone-pad" : (type === "number" ? "numeric" : "default")}
            />
        </View>
    );
}

// ============================================
// SCREENS
// ============================================

function LoginScreen({ onLogin }) {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("phone"); // 'phone' or 'otp'
    const [loading, setLoading] = useState(false);

    async function handleSendOtp() {
        if (!phone) return Alert.alert("Khalad", "Fadlan geli lambarkaaga");
        setLoading(true);
        try {
            await fetch(`${API}/api/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone })
            });
            setStep("otp");
        } catch (e) {
            Alert.alert("Khalad", "Ma suurtagalin in la diro koodhka");
        }
        setLoading(false);
    }

    async function handleVerifyOtp() {
        if (!otp) return Alert.alert("Khalad", "Fadlan geli koodhka");
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp })
            });
            const data = await res.json();
            if (res.ok) {
                onLogin(data);
            } else {
                const msgs = {
                    INVALID_OTP: "Koodhkaagu waa khalad",
                    OTP_EXPIRED: "Koodhku waa dhacay, fadlan mar kale dir",
                    NO_SESSION: "Fadlan mar kale codso koodh cusub"
                };
                Alert.alert("Khalad", msgs[data.error] || "Ma suurtagalin xaqiijinta");
            }
        } catch (e) {
            Alert.alert("Khalad", "Xidhiidhka ayaa go'ay");
        }
        setLoading(false);
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#1E293B" }}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
                    {/* Logo */}
                    <View style={{
                        width: 80,
                        height: 80,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 32,
                        alignSelf: "center"
                    }}>
                        <Text style={{ fontSize: 40 }}>🏪</Text>
                    </View>

                    {/* White Card */}
                    <View style={{
                        backgroundColor: "white",
                        borderRadius: 24,
                        padding: 24,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5
                    }}>
                        <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 8, color: colors.text }}>
                            {step === "phone" ? "Ku soo gal aboonkaaga" : "Geli Koodhka OTP"}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 24 }}>
                            {step === "phone" ? "Lambarka Taleefanka" : "Geli koodhka laguu soo diray lambarkaaga"}
                        </Text>

                        {step === "phone" ? (
                            <>
                                <Input
                                    label="Lambarka taleefanka"
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+252 61 2345678"
                                    type="phone"
                                />
                                <Button label="Dir Koodh OTP" onPress={handleSendOtp} disabled={loading} />
                                <Text style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: colors.muted }}>
                                    Dib u soo koodh
                                </Text>
                            </>
                        ) : (
                            <>
                                <Input
                                    label="Koodhka OTP"
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholder="123456"
                                    type="number"
                                />
                                <Button label="Xaqiiji" onPress={handleVerifyOtp} disabled={loading} />
                                <Pressable onPress={() => setStep("phone")} style={{ marginTop: 16, alignItems: "center" }}>
                                    <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 14 }}>Dib u soo koodh</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

function OnboardingScreen({ onComplete }) {
    const [step, setStep] = useState(0);

    const screens = [
        {
            title: "Ku Qaado",
            subtitle: "Maamul deynta ganacsigaaga",
            description: "Nidaamka ugu fudud ee maamulka deynta ganacsiga",
            icon: "🏪",
            buttonText: "Bilow isticmaalka"
        },
        {
            title: "Sidee u shaqeyso",
            subtitle: "3 tallaabo oo fudud",
            steps: [
                { icon: "👥", text: "Ku dar macmiil" },
                { icon: "💰", text: "Ku dar deyn" },
                { icon: "📱", text: "Dir link WhatsApp" }
            ],
            buttonText: "Sii wad"
        },
        {
            title: "Kalsooni & xeerar",
            subtitle: "Ammaan iyo sharuudo",
            checks: [
                "✔ Deyn kasta waa la ansixiyaa",
                "✔ Macmiilku arkaa wax walba",
                "✔ System-ku xakameeya limit-ka"
            ],
            buttonText: "Bilow isticmaalka"
        }
    ];

    const current = screens[step];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
                <View style={{ alignItems: "center", marginTop: 40 }}>
                    <Text style={{ fontSize: 64, marginBottom: 20 }}>{current.icon || "🏪"}</Text>
                    <Text style={{ fontSize: 32, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                        {current.title}
                    </Text>
                    <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8, textAlign: "center" }}>
                        {current.subtitle}
                    </Text>
                </View>

                <View style={{ flex: 1, justifyContent: "center" }}>
                    {current.description && (
                        <Text style={{ fontSize: 18, color: colors.text, textAlign: "center", lineHeight: 28 }}>
                            {current.description}
                        </Text>
                    )}
                    {current.steps && (
                        <View style={{ gap: 20 }}>
                            {current.steps.map((s, i) => (
                                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}>
                                        <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                                    </View>
                                    <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>{s.text}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {current.checks && (
                        <View style={{ gap: 12 }}>
                            {current.checks.map((c, i) => (
                                <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                                    <Text style={{ color: colors.status.paid, fontWeight: "800" }}>✓</Text>
                                    <Text style={{ fontSize: 16, color: colors.text }}>{c}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View>
                    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 }}>
                        {screens.map((_, i) => (
                            <View key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? colors.primary : colors.border }} />
                        ))}
                    </View>
                    <Button
                        label={current.buttonText}
                        onPress={() => step < screens.length - 1 ? setStep(step + 1) : onComplete()}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

// ============================================
// DASHBOARD SCREEN (TÄRKEIN SIVU)
// ============================================
function DashboardScreen({ onNavigate }) {
    const [stats, setStats] = useState(null);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    async function loadDashboard() {
        setLoading(true);
        try {
            const [statsRes, customersRes] = await Promise.all([
                fetch(`${API}/api/shop/${SHOP_ID}/dashboard`),
                fetch(`${API}/api/shop/${SHOP_ID}/customers`)
            ]);

            const statsData = await statsRes.json();
            const customersData = await customersRes.json();

            setStats(statsData);
            setRecentCustomers(customersData.customers.slice(0, 5));
        } catch (e) {
            Alert.alert("Khalad", "Ma suurtagalin in la soo raro xogta");
        }
        setLoading(false);
    }

    useEffect(() => { loadDashboard(); }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView style={{ flex: 1 }}>
                {/* Navy Header */}
                <View style={{ backgroundColor: "#1E293B", padding: 20, paddingTop: 10, paddingBottom: 24 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <View>
                            <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Ku soo dhowow,</Text>
                            <Text style={{ fontSize: 24, fontWeight: "800", color: "white" }}>Ali Merchant</Text>
                        </View>
                        <Pressable onPress={() => onNavigate("notifications")} style={{
                            width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)",
                            alignItems: "center", justifyContent: "center"
                        }}>
                            <Text style={{ fontSize: 20 }}>🔔</Text>
                        </Pressable>
                    </View>

                    {/* Hero Card - Total Owed */}
                    <View style={{
                        backgroundColor: "rgba(255,255,255,0.95)",
                        borderRadius: 20,
                        padding: 20,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 6
                    }}>
                        <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600", marginBottom: 8 }}>Total Owed</Text>
                        <Text style={{ fontSize: 40, fontWeight: "900", color: colors.primary, letterSpacing: -1 }}>
                            {stats ? money(stats.totalOutstanding) : "..."}
                        </Text>
                    </View>
                </View>

                {/* Stats Cards - Side by Side */}
                <View style={{ padding: 20, paddingTop: 16, flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: "white", padding: 16, borderRadius: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 8 }}>Open Debts</Text>
                        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>{stats ? money(stats.totalOutstanding) : "..."}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: "white", padding: 16, borderRadius: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 8 }}>Paid</Text>
                        <Text style={{ fontSize: 24, fontWeight: "800", color: "#2563EB" }}>{stats ? money(stats.paidToday) : "..."}</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={{ padding: 20, paddingTop: 0, gap: 12 }}>
                    <Pressable
                        onPress={() => onNavigate("createDebt")}
                        style={{ backgroundColor: colors.primary, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, elevation: 2 }}
                    >
                        <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>+ Samee Deyn</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onNavigate("customers")}
                        style={{ backgroundColor: "white", height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.border }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Liiska Deymaha</Text>
                    </Pressable>
                </View>

                {/* Recent Customers */}
                <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: "800" }}>Deymaha dhowaan</Text>
                    </View>

                    {recentCustomers.length === 0 ? (
                        <View style={{ padding: 40, alignItems: "center" }}>
                            <Text style={{ color: colors.muted }}>Deyn weli lama helin</Text>
                        </View>
                    ) : recentCustomers.map((c) => (
                        <Pressable
                            key={c.id}
                            onPress={() => onNavigate("customerDetail", c.id)}
                            style={{
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 14,
                                borderWidth: 1,
                                borderColor: colors.border,
                                marginBottom: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                elevation: 1
                            }}
                        >
                            <View style={{
                                width: 44, height: 44, borderRadius: 12, backgroundColor: "#F1F5F9",
                                alignItems: "center", justifyContent: "center"
                            }}>
                                <Text style={{ fontSize: 20, color: colors.primary, fontWeight: "800" }}>{c.name.charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{c.name}</Text>
                                <Text style={{ color: colors.muted, fontSize: 13 }}>{c.phone}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={{ fontSize: 16, fontWeight: "800" }}>{money(c.totalOpen)}</Text>
                                <Badge type={c.hasOverdue ? "LATE" : "PAID"} label={c.hasOverdue ? "Dhacay" : "OK"} />
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}


function CreateDebtScreen({ onBack, onComplete }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    async function handleShare() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/debts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shopId: SHOP_ID,
                    customerId: "cus_1",
                    dueAt: dueDate || undefined,
                    items: [{ name: "Deyn", qty: 1, unitPrice: parseFloat(amount) }]
                })
            });
            const data = await res.json();
            if (res.ok) {
                onComplete(data.whatsappUrl);
            } else {
                Alert.alert("Error", data.error);
                setIsConfirming(false);
            }
        } catch (e) {
            Alert.alert("Error", "FAILED");
            setIsConfirming(false);
        }
        setLoading(false);
    }

    if (isConfirming) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
                    <View style={{
                        backgroundColor: "white",
                        borderRadius: 32,
                        padding: 32,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 20,
                        elevation: 10,
                        alignItems: "center"
                    }}>
                        <View style={{
                            width: 64, height: 64, borderRadius: 32, backgroundColor: "#F1F5F9",
                            alignItems: "center", justifyContent: "center", marginBottom: 24
                        }}>
                            <Text style={{ fontSize: 32 }}>❓</Text>
                        </View>

                        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, marginBottom: 8, textAlign: "center" }}>Ma hubtaa?</Text>
                        <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", marginBottom: 32 }}>
                            Ma hubtaa inaad rabto inaad u dirtid heshiiska deynta macmiilka?
                        </Text>

                        <View style={{ width: "100%", backgroundColor: "#F8FAFC", borderRadius: 20, padding: 20, marginBottom: 32 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                                <Text style={{ color: colors.muted, fontWeight: "600" }}>Macmiilka:</Text>
                                <Text style={{ fontWeight: "800", color: colors.text }}>{name}</Text>
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                                <Text style={{ color: colors.muted, fontWeight: "600" }}>Lacagta:</Text>
                                <Text style={{ fontWeight: "900", color: colors.primary, fontSize: 18 }}>{money(parseFloat(amount))}</Text>
                            </View>
                        </View>

                        <View style={{ width: "100%", gap: 12 }}>
                            <Button label="Haa, Dir heshiiska" onPress={handleShare} disabled={loading} />
                            <Pressable
                                onPress={() => setIsConfirming(false)}
                                style={{ height: 52, alignItems: "center", justifyContent: "center" }}
                            >
                                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 16 }}>Maya, wax ka bedel</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            {/* Header */}
            <View style={{ padding: 20, paddingBottom: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable onPress={onBack} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 20 }}>←</Text>
                    </Pressable>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Samee Deyn</Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }}>
                {/* Form Card */}
                <View style={{
                    backgroundColor: "white",
                    borderRadius: 20,
                    padding: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                    marginBottom: 20
                }}>
                    <Input label="Customer Name" value={name} onChangeText={setName} placeholder="Ahmed Ismail" />
                    <Input label="Phone Number" value={phone} onChangeText={setPhone} type="phone" placeholder="+252 63 1234567" />
                    <Input label="Amount" value={amount} onChangeText={setAmount} type="number" placeholder="$ 500" />
                    <Input label="Due Date" value={dueDate} onChangeText={setDueDate} placeholder="Select Date" optional />
                </View>

                <Button
                    label="U dir heshiiska"
                    onPress={() => {
                        if (!name || !phone || !amount) return Alert.alert("Khalad", "Fadlan buuxi meelaha loo baahan yahay");
                        setIsConfirming(true);
                    }}
                />
            </ScrollView>
        </SafeAreaView>
    );

}

function CustomerDetailScreen({ customerId, onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [payModal, setPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState("");
    const [selectedDebtId, setSelectedDebtId] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/customers/${customerId}`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            Alert.alert("Error", "Failed to load customer details");
        }
        setLoading(false);
    }

    async function handlePayment() {
        if (!payAmount) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/debts/${selectedDebtId}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: parseFloat(payAmount), note: "Gacanta (Merchant)" })
            });
            if (res.ok) {
                setPayModal(false);
                setPayAmount("");
                load();
            } else {
                Alert.alert("Error", "Lacagta lama kaydin karo.");
            }
        } catch (e) { Alert.alert("Error", "Xidhiidhka ayaa go'ay."); }
        setLoading(false);
    }

    useEffect(() => { load(); }, [customerId]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            {/* Header */}
            <View style={{
                padding: 20,
                backgroundColor: "#1E293B",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <View>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Ali Merchant</Text>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "white" }}>Faahfaahin</Text>
                </View>
                <Pressable onPress={onBack} style={{
                    width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)",
                    alignItems: "center", justifyContent: "center"
                }}>
                    <Text style={{ fontSize: 18, color: "white" }}>✕</Text>
                </Pressable>
            </View>

            {data && (
                <ScrollView style={{ flex: 1 }}>
                    {/* Customer Info Card */}
                    <View style={{
                        backgroundColor: "white",
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{data.customer.name}</Text>
                            <Text style={{ color: colors.muted, fontSize: 14 }}>{data.customer.phone}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>Total Balance</Text>
                            <Text style={{ fontSize: 24, fontWeight: "900", color: colors.primary }}>{money(data.customer.totalOpen)}</Text>
                        </View>
                    </View>

                    {/* Debt List */}
                    <View style={{ padding: 16 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                            Deymaha
                        </Text>

                        {data.debts.length === 0 ? (
                            <View style={{ padding: 40, alignItems: "center" }}>
                                <Text style={{ color: colors.muted }}>Ma jirto deyn la helay.</Text>
                            </View>
                        ) : data.debts.map(d => (
                            <View key={d.id} style={{
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
                                    <View>
                                        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>{money(d.remaining || d.total)}</Text>
                                        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                                            Due: {d.dueAt ? new Date(d.dueAt).toLocaleDateString() : "No date"}
                                        </Text>
                                    </View>
                                    <Badge type={d.status} />
                                </View>

                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {d.status !== "PAID" && (
                                        <Pressable
                                            onPress={() => { setSelectedDebtId(d.id); setPayModal(true); }}
                                            style={{
                                                flex: 1,
                                                height: 48,
                                                backgroundColor: colors.primary,
                                                borderRadius: 12,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                shadowColor: colors.primary,
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 6,
                                                elevation: 3
                                            }}
                                        >
                                            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>Bixi Lacag</Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={() => Linking.openURL(data.customer.whatsappUrl)}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 12,
                                            backgroundColor: "#128C7E",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <Text style={{ fontSize: 22 }}>📱</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={{ padding: 20, marginBottom: 40 }}>
                        <Button label="+ Deyn Cusub" type="secondary" onPress={onBack} />
                    </View>
                </ScrollView>
            )}

            <Modal visible={payModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{
                        backgroundColor: "white",
                        padding: 24,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32
                    }}>
                        <View style={{ width: 40, height: 5, backgroundColor: "#E2E8F0", borderRadius: 10, alignSelf: "center", marginBottom: 20 }} />
                        <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8, color: colors.text }}>Lacag Bixinta</Text>
                        <Text style={{ color: colors.muted, marginBottom: 24, fontSize: 15 }}>Immisa ayaad ka soo qabatay macmiilka?</Text>

                        <Input label="Lacagta (USD)" value={payAmount} onChangeText={setPayAmount} type="number" placeholder="$ 0.00" />

                        <View style={{ marginTop: 12, gap: 12 }}>
                            <Button label="Xaqiiji Lacagta" onPress={handlePayment} disabled={loading} />
                            <Pressable
                                onPress={() => setPayModal(false)}
                                style={{ height: 52, alignItems: "center", justifyContent: "center" }}
                            >
                                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 16 }}>Jooji</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}


// ============================================
// MAIN APP
// ============================================
// ============================================
// NEW SCREENS
// ============================================

function CustomersListScreen({ onNavigate, onBack }) {
    const [search, setSearch] = useState("");
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/shop/${SHOP_ID}/customers?search=${search}`);
            const data = await res.json();
            setCustomers(data.customers || []);
        } catch (e) {
            Alert.alert("Error", "FAILED_TO_LOAD");
        }
        setLoading(false);
    }

    async function handleCreate() {
        if (!newName || !newPhone) return Alert.alert("Khalad", "Fadlan geli magaca iyo taleefanka");
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/customers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shopId: SHOP_ID, name: newName, phone: newPhone })
            });
            if (res.ok) {
                setShowModal(false);
                setNewName("");
                setNewPhone("");
                load();
            } else {
                const data = await res.json();
                const msgs = {
                    INVALID_NAME: "Magaca aad geliyeen aad buu u gaabanyahay",
                    INVALID_PHONE: "Lambarka taleefanka ma saxna",
                    MISSING_FIELDS: "Fadlan buuxi meelaha loo baahanyahay"
                };
                Alert.alert("Khalad", msgs[data.error] || "Waan ka xunnahay, hadda lama samayn karo.");
            }
        } catch (e) { Alert.alert("Khalad", "Xidhiidhka ayaa go'ay."); }
        setLoading(false);
    }

    useEffect(() => { load(); }, [search]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            {/* Header */}
            <View style={{
                padding: 20,
                backgroundColor: "white",
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable onPress={onBack} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 20, color: colors.text }}>←</Text>
                    </Pressable>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Liiska Deymaha</Text>
                </View>
                <Pressable
                    onPress={() => setShowModal(true)}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4
                    }}
                >
                    <Text style={{ color: "white", fontSize: 24, fontWeight: "600" }}>+</Text>
                </Pressable>
            </View>

            {/* Search Bar */}
            <View style={{ padding: 16 }}>
                <View style={{
                    backgroundColor: "white",
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    height: 52
                }}>
                    <Text style={{ marginRight: 8 }}>🔍</Text>
                    <TextInput
                        style={{ flex: 1, fontSize: 16, color: colors.text }}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Raadi macmiil..."
                        placeholderTextColor={colors.muted}
                    />
                </View>
            </View>

            <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                refreshing={loading}
                onRefresh={load}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => onNavigate("customerDetail", item.id)}
                        style={{
                            backgroundColor: "white",
                            borderRadius: 20,
                            padding: 16,
                            marginBottom: 12,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.04,
                            shadowRadius: 10,
                            elevation: 2,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 16,
                            borderWidth: 1,
                            borderColor: "#F1F5F9"
                        }}
                    >
                        {/* Status Circle / Logo */}
                        <View style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: item.hasOverdue ? "#FEE2E2" : "#E0E7FF",
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 4,
                            borderColor: "white"
                        }}>
                            <Text style={{ fontSize: 24, fontWeight: "900", color: item.hasOverdue ? "#DC2626" : colors.primary }}>
                                {item.name.charAt(0)}
                            </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 17, fontWeight: "800", color: "#1E293B" }}>{item.name}</Text>
                            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{item.phone}</Text>
                            <Text style={{ color: item.hasOverdue ? "#DC2626" : "#64748B", fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                                {item.hasOverdue ? "Dib u dhacay" : "Due: dhowaan"}
                            </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 6 }}>
                                {money(item.totalOpen)}
                            </Text>
                            <Badge type={item.hasOverdue ? "LATE" : "ACCEPTED"} />
                        </View>
                    </Pressable>
                )}
            />

            <Modal visible={showModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{
                        backgroundColor: "white",
                        padding: 24,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 20,
                    }}>
                        <View style={{ width: 40, height: 5, backgroundColor: "#E2E8F0", borderRadius: 10, alignSelf: "center", marginBottom: 20 }} />
                        <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 24, color: colors.text }}>Ku dar Macmiil Cusub</Text>
                        <Input label="Magaca Macmiilka" value={newName} onChangeText={setNewName} placeholder="Geli magaca" />
                        <Input label="Lambarka Taleefanka" value={newPhone} onChangeText={setNewPhone} type="phone" placeholder="+252..." />

                        <View style={{ marginTop: 12, gap: 12 }}>
                            <Button label="Kaydi Macmiilka" onPress={handleCreate} disabled={loading} />
                            <Pressable
                                onPress={() => setShowModal(false)}
                                style={{ height: 52, alignItems: "center", justifyContent: "center" }}
                            >
                                <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 16 }}>Iska daa</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}


function NotificationsScreen({ onNavigate, onBack }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/shop/${SHOP_ID}/notifications`);
            const data = await res.json();
            setNotifications(data.notifications);
        } catch (e) {
            Alert.alert("Error", "FAILED_TO_LOAD");
        }
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    const priorityColors = { high: "#DC2626", medium: "#F59E0B", low: "#64748B" };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable onPress={onBack} style={{ padding: 8 }}><Text style={{ fontSize: 20 }}>←</Text></Pressable>
                <Text style={{ fontSize: 24, fontWeight: "800" }}>Ogeysiisyada</Text>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshing={loading}
                onRefresh={load}
                renderItem={({ item }) => (
                    <View style={{
                        backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12,
                        borderWidth: 1, borderLeftWidth: 4, borderLeftColor: priorityColors[item.priority], borderColor: colors.border
                    }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: priorityColors[item.priority] }}>{item.type}</Text>
                            <Text style={{ fontSize: 11, color: colors.muted }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 12 }}>
                            {item.customerName}: {item.type === "PAYMENT_RECEIVED" ? `Lacag dhan ${money(item.amount)} ayaa la bixiyay` : `Deyn dhan ${money(item.amount)} ayaa dhacday`}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <Pressable onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent("Salaam " + item.customerName + ". Waxaan kuu soo xasuusinaynaa...")}`)} style={{ flex: 1 }}>
                                <Button label="WhatsApp" type="secondary" style={{ height: 40 }} pointerEvents="none" />
                            </Pressable>
                            <Pressable onPress={() => onNavigate("customerDetail", item.customerId)} style={{ flex: 1 }}>
                                <Button label="Eeg" style={{ height: 40 }} pointerEvents="none" />
                            </Pressable>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

function PaymentsScreen({ onNavigate }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/shop/${SHOP_ID}/payments`);
            const data = await res.json();
            setPayments(data.payments || []);
        } catch (e) {
            Alert.alert("Error", "FAILED_TO_LOAD_PAYMENTS");
        }
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: "800" }}>Lacagaha</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>Taariikhda lacagaha la qabtay</Text>
            </View>

            <FlatList
                data={payments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                refreshing={loading}
                onRefresh={load}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => onNavigate("customerDetail", item.customerId)}
                        style={{
                            backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12,
                            borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12
                        }}
                    >
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 18 }}>💰</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "700" }}>{item.customerName}</Text>
                            <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#059669" }}>+{money(item.amount)}</Text>
                            <Text style={{ fontSize: 10, color: colors.muted }}>{item.note || "Lacag bixin"}</Text>
                        </View>
                    </Pressable>
                )}
            />
        </SafeAreaView>
    );
}

function SettingsScreen({ onLogout, onNavigate }) {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: "800" }}>Asetinka</Text>
            </View>

            <ScrollView style={{ padding: 16 }}>
                <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 32 }}>🏪</Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: "800" }}>Axmed Shop</Text>
                            <Text style={{ color: colors.muted }}>ID: {SHOP_ID}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ backgroundColor: "white", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
                    <Pressable style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ fontWeight: "600" }}>Luuqadda (Language)</Text>
                        <Text style={{ color: colors.primary, fontWeight: "700" }}>Somali</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => Linking.openURL("https://wa.me/252630000000?text=Salaam, waxaan u baahanahay caawin Ku Qaado.")}
                        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border }}
                    >
                        <Text style={{ fontWeight: "600" }}>La xidhiidh Taageerada</Text>
                        <Text style={{ fontSize: 18 }}>📱</Text>
                    </Pressable>
                    <Pressable style={{ padding: 16, flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontWeight: "600" }}>Shuruudaha Adeegga</Text>
                        <Text style={{ fontSize: 16 }}>📄</Text>
                    </Pressable>
                </View>

                <Button label="Ka Bax (Logout)" type="secondary" onPress={onLogout} style={{ borderColor: "#FECACA" }} color="#DC2626" />

                <View style={{ alignItems: "center", marginTop: 40 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Ku Qaado v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentScreen, setCurrentScreen] = useState("dashboard");
    const [selectedId, setSelectedId] = useState(null);

    function navigate(screen, id = null) {
        setCurrentScreen(screen);
        setSelectedId(id);
    }

    if (showOnboarding) {
        return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
    }

    if (!isLoggedIn) {
        return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
    }

    // Main app with bottom navigation
    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ flex: 1 }}>
                {currentScreen === "dashboard" && <DashboardScreen onNavigate={navigate} />}
                {currentScreen === "payments" && <PaymentsScreen onNavigate={navigate} />}
                {currentScreen === "createDebt" && (
                    <CreateDebtScreen
                        onBack={() => navigate("dashboard")}
                        onComplete={(url) => {
                            Alert.alert("Heshiiska waa la diray WhatsApp", "Ma la furay WhatsApp?", [
                                { text: "Haa, fur", onPress: () => Linking.openURL(url) },
                                { text: "Hadda maya", onPress: () => navigate("dashboard") },
                                { text: "SMS u dir", onPress: () => navigate("dashboard"), style: "cancel" }
                            ]);
                        }}
                    />
                )}
                {currentScreen === "settings" && (
                    <SettingsScreen onLogout={() => setIsLoggedIn(false)} onNavigate={navigate} />
                )}
                {currentScreen === "customerDetail" && (
                    <CustomerDetailScreen customerId={selectedId} onBack={() => navigate("dashboard")} />
                )}
                {currentScreen === "customers" && (
                    <CustomersListScreen onNavigate={navigate} onBack={() => navigate("dashboard")} />
                )}
                {currentScreen === "notifications" && (
                    <NotificationsScreen onNavigate={navigate} onBack={() => navigate("dashboard")} />
                )}
            </View>

            {/* Bottom Navigation */}
            <View style={{
                flexDirection: "row",
                backgroundColor: "white",
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingBottom: 25,
                paddingTop: 12
            }}>
                {[
                    { id: "dashboard", label: "Deyn", icon: "💰" },
                    { id: "payments", label: "Lacag", icon: "🧾" },
                    { id: "customers", label: "Macmiil", icon: "👥" },
                    { id: "settings", label: "Asetin", icon: "⚙️" }
                ].map(tab => (
                    <Pressable
                        key={tab.id}
                        onPress={() => navigate(tab.id)}
                        style={{ flex: 1, alignItems: "center", gap: 4 }}
                    >
                        <Text style={{ fontSize: 20, opacity: currentScreen === tab.id ? 1 : 0.4 }}>{tab.icon}</Text>
                        <Text style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: currentScreen === tab.id ? colors.primary : colors.muted
                        }}>
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}
