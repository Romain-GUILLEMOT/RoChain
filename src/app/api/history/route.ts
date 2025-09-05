import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();
    const interval = searchParams.get("interval") || "5m"; // default 5m
    const limit = parseInt(searchParams.get("limit") || "288"); // 288 x 5m = 24h

    try {
        const res = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        if (!res.ok) {
            return new Response("Failed to fetch history", { status: 500 });
        }
        const data = await res.json();

        // Simplifier la réponse → [time, open, high, low, close]
        const candles = data.map((c: any) => ({
            time: new Date(c[0]).toISOString(),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
        }));

        return Response.json({ symbol, interval, candles });
    } catch {
        return new Response("Error fetching history", { status: 500 });
    }
}
