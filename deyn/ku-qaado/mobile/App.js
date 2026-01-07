import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView, View, Text, Pressable, FlatList, TextInput, Alert, Linking, ScrollView, Modal } from "react-native";

const API = "http://localhost:5173";
const SHOP_ID = "shop_1";

const colors = {
    primary: "#0d9488",
    primaryLight: "#14b8a6",
    bg: "#F7F8FA",
    card: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",
    green: "#22C55E",
    red: "#EF4444",
    amber: "#F59E0B",
    border: "rgba(17,24,39,0.08)"
};

function money(n) { return `$${Math.round(n * 100) / 100}`; }

function Badge({ type, label }) {
    const style = {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignSelf: "flex-start",
        backgroundColor:
            type === "ok" ? "rgba(34,197,94,0.14)" :
                type === "warn" ? "rgba(245,158,11,0.18)" :
                    "rgba(239,68,68,0.16)",
    };
    const color =
        type === "ok" ? "#0f7a3a" :
            type === "warn" ? "#8a5a00" :
                "#991b1b";

    return (
        <View style={style}>
            <Text style={{ color, fontWeight: "800", fontSize: 12 }}>{label}</Text>
        </View>
    );
}

// ============================================
// ONBOARDING SCREENS
// ============================================
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

    async function handleNext() {
        if (step < screens.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
                {/* Header */}
                <View style={{ alignItems: "center", marginTop: 60 }}>
                    <Text style={{ fontSize: 64, marginBottom: 20 }}>{current.icon || "🏪"}</Text>
                    <Text style={{ fontSize: 32, fontWeight: "900", color: colors.text, textAlign: "center" }}>
                        {current.title}
                    </Text>
                    <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8, textAlign: "center" }}>
                        {current.subtitle}
                    </Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
                    {current.description && (
                        <Text style={{ fontSize: 18, color: colors.text, textAlign: "center", lineHeight: 28 }}>
                            {current.description}
                        </Text>
                    )}

                    {current.steps && (
                        <View style={{ gap: 24 }}>
                            {current.steps.map((s, i) => (
                                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                                    <Text style={{ fontSize: 40 }}>{s.icon}</Text>
                                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>{s.text}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {current.checks && (
                        <View style={{ gap: 16 }}>
                            {current.checks.map((c, i) => (
                                <Text key={i} style={{ fontSize: 18, color: colors.text, lineHeight: 28 }}>
                                    {c}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View>
                    {/* Progress dots */}
                    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 }}>
                        {screens.map((_, i) => (
                            <View
                                key={i}
                                style={{
                                    width: i === step ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: i === step ? colors.primary : colors.border
                                }}
                            />
                        ))}
                    </View>

                    {/* Button */}
                    <Pressable
                        onPress={handleNext}
                        style={{
                            backgroundColor: colors.primary,
                            paddingVertical: 16,
                            borderRadius: 14,
                            alignItems: "center"
                        }}
                    >
                        <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                            {current.buttonText}
                        </Text>
                    </Pressable>

                    {step > 0 && (
                        <Pressable onPress={() => setStep(step - 1)} style={{ marginTop: 12, alignItems: "center" }}>
                            <Text style={{ color: colors.muted, fontWeight: "700" }}>Dib u noqo</Text>
                        </Pressable>
                    )}
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
            <ScrollView>
                {/* Header */}
                <View style={{ padding: 16, paddingBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                            <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>Ku Qaado</Text>
                            <Text style={{ color: colors.muted, marginTop: 4 }}>Dashboard</Text>
                        </View>
                        <Pressable onPress={() => onNavigate("notifications")}>
                            <Text style={{ fontSize: 24 }}>🔔</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Summary Cards */}
                {stats && (
                    <View style={{ padding: 16, gap: 12 }}>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Tänään</Text>
                                <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>{stats.todayDebts}</Text>
                                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>deyn</Text>
                            </View>

                            <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Wadarta</Text>
                                <Text style={{ fontSize: 24, fontWeight: "900", color: colors.red }}>{money(stats.totalOutstanding)}</Text>
                                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>deynta</Text>
                            </View>
                        </View>

                        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <View>
                                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Dhacay</Text>
                                    <Text style={{ fontSize: 32, fontWeight: "900", color: colors.red }}>{stats.overdueCustomers}</Text>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Macmiilal</Text>
                                    <Text style={{ fontSize: 32, fontWeight: "900", color: colors.text }}>{stats.totalCustomers}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Primary CTA */}
                <View style={{ padding: 16 }}>
                    <Pressable
                        onPress={() => onNavigate("createDebt")}
                        style={{
                            backgroundColor: colors.primary,
                            paddingVertical: 18,
                            borderRadius: 16,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 8
                        }}
                    >
                        <Text style={{ fontSize: 24 }}>+</Text>
                        <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>Ku dar Deyn</Text>
                    </Pressable>
                </View>

                {/* Recent Customers */}
                <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: "900" }}>Macmiil & Deyn</Text>
                        <Pressable onPress={() => onNavigate("customers")}>
                            <Text style={{ color: colors.primary, fontWeight: "700" }}>Dhammaan →</Text>
                        </Pressable>
                    </View>

                    {recentCustomers.map((c) => (
                        <Pressable
                            key={c.id}
                            onPress={() => onNavigate("customerProfile", c.id)}
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: 16,
                                padding: 14,
                                borderWidth: 1,
                                borderColor: colors.border,
                                marginBottom: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12
                            }}
                        >
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: `hsl(${c.name.charCodeAt(0) * 10}, 70%, 60%)`,
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <Text style={{ fontSize: 20, color: "white", fontWeight: "900" }}>
                                    {c.name.charAt(0)}
                                </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{c.name}</Text>
                                <Text style={{ color: colors.muted, fontSize: 13 }}>{c.phone}</Text>
                            </View>

                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={{ fontSize: 18, fontWeight: "900" }}>{money(c.totalOpen)}</Text>
                                {c.hasOverdue ? (
                                    <Badge type="bad" label="Dhacay" />
                                ) : c.totalOpen >= c.creditLimit ? (
                                    <Badge type="warn" label="Limit" />
                                ) : (
                                    <Badge type="ok" label="OK" />
                                )}
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
    const [showOnboarding, setShowOnboarding] = useState(true); // Show onboarding on first launch
    const [currentScreen, setCurrentScreen] = useState("dashboard");
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    function navigate(screen, customerId = null) {
        setCurrentScreen(screen);
        setSelectedCustomerId(customerId);
    }

    if (showOnboarding) {
        return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
    }

    // Main app with bottom navigation
    return (
        <View style={{ flex: 1 }}>
            {/* Content */}
            <View style={{ flex: 1 }}>
                {currentScreen === "dashboard" && <DashboardScreen onNavigate={navigate} />}
                {currentScreen === "customers" && <Text style={{ padding: 20 }}>Customers Screen (TODO)</Text>}
                {currentScreen === "notifications" && <Text style={{ padding: 20 }}>Notifications Screen (TODO)</Text>}
                {currentScreen === "createDebt" && <Text style={{ padding: 20 }}>Create Debt Screen (TODO)</Text>}
            </View>

            {/* Bottom Navigation */}
            <View style={{
                flexDirection: "row",
                backgroundColor: colors.card,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingBottom: 20,
                paddingTop: 10
            }}>
                <Pressable
                    onPress={() => navigate("dashboard")}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
                >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>💰</Text>
                    <Text style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: currentScreen === "dashboard" ? colors.primary : colors.muted
                    }}>
                        Deyn
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => navigate("customers")}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
                >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>👥</Text>
                    <Text style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: currentScreen === "customers" ? colors.primary : colors.muted
                    }}>
                        Macmiil
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => navigate("more")}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
                >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>⋯</Text>
                    <Text style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: currentScreen === "more" ? colors.primary : colors.muted
                    }}>
                        More
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
