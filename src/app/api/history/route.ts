import { NextRequest } from "next/server";
export const runtime = "nodejs";

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
            const text = await res.text();
            return new Response(
                JSON.stringify({
                    error: "Failed to fetch history",
                    status: res.status,
                    statusText: res.statusText,
                    body: text,
                }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
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
