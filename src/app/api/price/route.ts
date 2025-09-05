import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids"); // exemple: "bitcoin,ethereum"
    const vs = searchParams.get("vs") || "usd";

    if (!ids) {
        return new Response("Missing ids param", { status: 400 });
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`;
    const res = await fetch(url);

    if (!res.ok) {
        return new Response("Failed to fetch prices", { status: 500 });
    }

    const data = await res.json();
    return Response.json(data);
}
