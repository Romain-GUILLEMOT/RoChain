import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "btcusdt").toUpperCase();

    try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        if (!res.ok) {
            return new Response("Failed to fetch price", { status: 500 });
        }
        const data = await res.json();
        return Response.json({ symbol: data.symbol, price: parseFloat(data.price) });
    } catch {
        return new Response("Error fetching price", { status: 500 });
    }
}
