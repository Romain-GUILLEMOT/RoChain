"use client";

import { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
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

ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    Title,
    CategoryScale,
    Legend,
    Tooltip
);

interface Coin {
    id: string;
    symbol: string;
    name: string;
}

interface PriceMessage {
    ids: string;
    vs: string;
    data: Record<string, { usd: number }>;
}

export default function HomePage() {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [selected, setSelected] = useState<string[]>(["bitcoin"]);
    const [prices, setPrices] = useState<{ time: string; values: Record<string, number> }[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    // Récupérer la liste des coins
    useEffect(() => {
        fetch("/api/coins")
            .then((res) => res.json())
            .then((data) => setCoins(data.slice(0, 50))); // pour pas cramer la page
    }, []);

    // Connexion SSR
    useEffect(() => {
        const ev = new EventSource("/api/stream");
        ev.onmessage = (e) => console.log("Data:", JSON.parse(e.data));
        return () => ev.close();
    }, []);



    // Préparer les datasets pour Chart.js
    const chartData = {
        labels: prices.map((p) => p.time),
        datasets: selected.map((id, idx) => ({
            label: id,
            data: prices.map((p) => p.values[id]),
            borderColor: idx === 0 ? "rgb(75, 192, 192)" : "rgb(255, 99, 132)",
            backgroundColor: idx === 0 ? "rgba(75, 192, 192, 0.2)" : "rgba(255, 99, 132, 0.2)",
            fill: false,
        })),
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">📈 RoChain - Live Crypto Tracker</h1>

            <div className="flex gap-4 mb-6">
                <select
                    multiple
                    className="border p-2 rounded w-64"
                    value={selected}
                    onChange={(e) =>
                        setSelected(Array.from(e.target.selectedOptions, (opt) => opt.value).slice(0, 2))
                    }
                >
                    {coins.map((coin) => (
                        <option key={coin.id} value={coin.id}>
                            {coin.name} ({coin.symbol})
                        </option>
                    ))}
                </select>
                <p className="text-sm text-gray-500 self-center">
                    Select up to 2 coins to compare
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
                <Line data={chartData} />
            </div>
        </div>
    );
}
