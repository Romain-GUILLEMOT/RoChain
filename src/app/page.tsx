"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { motion, AnimatePresence } from "framer-motion";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    Title,
    CategoryScale,
    Legend,
    Tooltip,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip);

interface Coin {
    id: string;
    symbol: string;
    name: string;
    color: string;
    icon: string;
}

interface Candle {
    time: string;
    close: number;
}

interface StreamMsg {
    symbol: string;
    price: number;
    time: number;
}

// Fond animé avec bulles
const AnimatedBackground = ({ selectedCoins, coins }: { selectedCoins: string[], coins: Coin[] }) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (typeof window !== "undefined") {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        }
    }, []);

    const bubbles = Array.from({ length: 15 }, (_, i) => i);

    return (
        <div className="fixed inset-0 overflow-hidden z-0">
            {dimensions.width > 0 && bubbles.map((bubble) => {
                const colors = selectedCoins.length > 0
                    ? selectedCoins.map(id => coins.find(c => c.id === id)?.color || '#3b82f6')
                    : ['#3b82f6', '#06b6d4', '#10b981'];

                const color = colors[bubble % colors.length];
                const delay = bubble * 0.8;
                const duration = 12 + (bubble % 4) * 3;
                const size = 40 + Math.random() * 100;

                return (
                    <motion.div
                        key={bubble}
                        className="absolute rounded-full opacity-20"
                        style={{
                            background: `radial-gradient(circle, ${color}40, transparent)`,
                            width: `${size}px`,
                            height: `${size}px`,
                        }}
                        animate={{
                            x: [
                                Math.random() * dimensions.width,
                                Math.random() * dimensions.width,
                                Math.random() * dimensions.width
                            ],
                            y: [
                                Math.random() * dimensions.height,
                                Math.random() * dimensions.height,
                                Math.random() * dimensions.height
                            ],
                            scale: [0.5, 1.2, 0.5],
                        }}
                        transition={{
                            duration,
                            delay,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                );
            })}
        </div>
    );
};


export default function HomePage() {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [selected, setSelected] = useState<string[]>(["btcusdt"]);
    const [interval, setInterval] = useState<string>("5m");
    const [mode, setMode] = useState<"history" | "live">("history");
    const [history, setHistory] = useState<Record<string, Candle[]>>({});
    const [liveData, setLiveData] = useState<Record<string, { time: string; price: number }[]>>({});
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        fetch("/api/coins")
            .then((res) => res.json())
            .then((data) => setCoins(data));
    }, []);

    useEffect(() => {
        if (mode !== "history" || selected.length === 0) return;

        let limit = 288;
        if (interval === "1m") limit = 60;
        if (interval === "1h") limit = 168;

        Promise.all(
            selected.map((symbol) =>
                fetch(`/api/history?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`)
                    .then((res) => res.json())
                    .then((data) => [symbol, data.candles] as [string, Candle[]])
            )
        ).then((results) => {
            const obj: Record<string, Candle[]> = {};
            results.forEach(([s, candles]) => (obj[s] = candles));
            setHistory(obj);
        });
    }, [selected, interval, mode]);

    useEffect(() => {
        if (mode !== "live" || selected.length === 0) return;

        const ev = new EventSource(`/api/stream?symbols=${selected.join(",")}`);
        ev.onmessage = (e) => {
            const msg: StreamMsg = JSON.parse(e.data);
            const time = new Date(msg.time).toLocaleTimeString();
            setLiveData((prev) => {
                const updated = { ...prev };
                const arr = updated[msg.symbol.toLowerCase()] || [];
                updated[msg.symbol.toLowerCase()] = [...arr.slice(-20), { time, price: msg.price }];
                return updated;
            });
        };

        return () => ev.close();
    }, [selected, mode]);

    const toggleCoin = (coinId: string) => {
        if (selected.includes(coinId)) {
            setSelected(selected.filter(id => id !== coinId));
        } else if (selected.length < 2) {
            setSelected([...selected, coinId]);
        }
    };

    const createChartData = (coinId: string) => {
        const coin = coins.find((c) => c.id === coinId);
        const color = coin?.color || "#3b82f6";

        if (mode === "history") {
            return {
                labels: history[coinId]?.map((c) => {
                    const date = new Date(c.time);
                    return date.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                    });
                }) || [],
                datasets: [{
                    label: `${coin?.name} (${coin?.symbol})`,
                    data: history[coinId]?.map((c) => c.close) || [],
                    borderColor: color,
                    backgroundColor: `${color}15`,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: color,
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    fill: true,
                }],
            };
        } else {
            return {
                labels: liveData[coinId]?.map((d) => d.time) || [],
                datasets: [{
                    label: `${coin?.name} (${coin?.symbol})`,
                    data: liveData[coinId]?.map((d) => d.price) || [],
                    borderColor: color,
                    backgroundColor: `${color}15`,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: color,
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    fill: true,
                }],
            };
        }
    };

    const getChartOptions = (coinId: string) => {
        const coin = coins.find((c) => c.id === coinId);
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index' as const,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top' as const,
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 14,
                            weight: 700
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: `${coin?.name} - ${mode === "history" ? "Données historiques" : "Temps réel"}`,
                    color: '#ffffff',
                    font: {
                        size: 18,
                        weight: 700
                    },
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: coin?.color || '#3b82f6',
                    borderWidth: 2,
                    cornerRadius: 12,
                    padding: 15,
                    displayColors: true,
                    callbacks: {
                        title: function(context: any) {
                            return `📅 ${context[0].label}`;
                        },
                        label: function(context: any) {
                            const value = context.parsed.y;
                            return ` 💰 Prix: $${value.toLocaleString('fr-FR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6
                            })} USD`;
                        },
                        footer: function(context: any) {
                            const coin = coins.find(c => c.id === coinId);
                            return coin ? `🔸 ${coin.symbol}` : '';
                        }
                    }
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '⏰ Temps',
                        color: '#cbd5e1',
                        font: {
                            size: 14,
                            weight: 700
                        }
                    },
                    grid: {
                        color: 'rgba(203, 213, 225, 0.1)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 11
                        },
                        maxTicksLimit: 8
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: '💵 Prix (USD)',
                        color: '#cbd5e1',
                        font: {
                            size: 14,
                            weight: 700
                        }
                    },
                    grid: {
                        color: 'rgba(203, 213, 225, 0.1)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 11
                        },
                        callback: function(value: any) {
                            return `$${Number(value).toLocaleString('fr-FR')}`;
                        },
                    },
                },
            },
        };
    };

    const getCurrentPrice = (coinId: string) => {
        if (mode === "history") {
            const candles = history[coinId];
            return candles && candles.length > 0 ? candles[candles.length - 1].close : null;
        } else {
            const data = liveData[coinId];
            return data && data.length > 0 ? data[data.length - 1].price : null;
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
            {/* Fond animé */}
            <AnimatedBackground selectedCoins={selected} coins={coins} />

            {/* Sidebar */}
            <motion.div
                initial={{ x: sidebarOpen ? 0 : -320 }}
                animate={{ x: sidebarOpen ? 0 : -320 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-80 bg-slate-800/95 backdrop-blur-lg border-r border-slate-700/50 shadow-2xl relative z-20 flex flex-col"
            >
                {/* Header Sidebar */}
                <div className="p-6 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                RoChain
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Analytics avancés</p>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Contrôles */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {/* Mode */}
                    <div className="mb-8">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                            Mode d'affichage
                        </h3>
                        <div className="space-y-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMode("history")}
                                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3 ${
                                    mode === "history"
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Historique</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMode("live")}
                                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3 ${
                                    mode === "live"
                                        ? "bg-green-600 text-white shadow-lg"
                                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${mode === "live" ? "bg-green-300 animate-pulse" : "bg-slate-400"}`} />
                                <span>Temps réel</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Intervalle */}
                    {mode === "history" && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8"
                        >
                            <h3 className="text-white font-semibold mb-4 flex items-center">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                                Période d'analyse
                            </h3>
                            <select
                                value={interval}
                                onChange={(e) => setInterval(e.target.value)}
                                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            >
                                <option value="1m">📊 1 heure (données 1min)</option>
                                <option value="5m">📈 1 jour (données 5min)</option>
                                <option value="1h">📉 7 jours (données 1h)</option>
                            </select>
                        </motion.div>
                    )}

                    {/* Cryptomonnaies */}
                    <div>
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                            Cryptomonnaies ({selected.length}/2)
                        </h3>
                        <div className="space-y-3">
                            {coins.map((coin) => (
                                <motion.div
                                    key={coin.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleCoin(coin.id)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                                        selected.includes(coin.id)
                                            ? 'bg-slate-700/70 shadow-lg'
                                            : 'bg-slate-700/30 hover:bg-slate-700/50 border-slate-600/30'
                                    }`}
                                    style={{
                                        borderColor: selected.includes(coin.id) ? coin.color : 'rgba(148, 163, 184, 0.3)',
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                                                style={{ backgroundColor: coin.color }}
                                            >
                                                {coin.icon}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{coin.name}</p>
                                                <p className="text-sm text-slate-400">{coin.symbol}</p>
                                                {getCurrentPrice(coin.id) && (
                                                    <p className="text-xs font-medium" style={{ color: coin.color }}>
                                                        ${getCurrentPrice(coin.id)?.toLocaleString('fr-FR')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {selected.includes(coin.id) && (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: coin.color }}
                                            >
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Contenu principal */}
            <div className="flex-1 relative z-10">
                {/* Header principal */}
                <div className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50 p-6">
                    <div className="flex items-center justify-between">
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        <div className="text-center flex-1">
                            <h2 className="text-3xl font-bold text-white mb-2">
                                Dashboard Analytics
                            </h2>
                            <p className="text-slate-400">
                                Suivi en temps réel de vos cryptomonnaies favorites
                            </p>
                        </div>
                        <div className={`px-4 py-2 rounded-full flex items-center space-x-2 ${
                            mode === "live" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-blue-300"
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                mode === "live" ? "bg-green-400 animate-pulse" : "bg-blue-400"
                            }`}></div>
                            <span className="text-sm font-medium">
                                {mode === "live" ? "Live" : "Historique"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Graphiques */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {selected.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-16 text-center"
                            >
                                <div className="text-6xl mb-6">📊</div>
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    Sélectionnez vos cryptomonnaies
                                </h3>
                                <p className="text-slate-400 text-lg">
                                    Utilisez la sidebar pour choisir jusqu'à 2 cryptomonnaies à analyser
                                </p>
                            </motion.div>
                        ) : selected.length === 1 ? (
                            <motion.div
                                key="single"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8"
                            >
                                <div style={{ height: "600px" }}>
                                    <Line data={createChartData(selected[0])} options={getChartOptions(selected[0])} />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="comparison"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 xl:grid-cols-2 gap-8"
                            >
                                {selected.map((coinId, index) => (
                                    <motion.div
                                        key={coinId}
                                        initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6"
                                    >
                                        <div style={{ height: "500px" }}>
                                            <Line data={createChartData(coinId)} options={getChartOptions(coinId)} />
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
