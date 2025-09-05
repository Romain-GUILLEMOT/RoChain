export async function GET() {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
    if (!res.ok) {
        return new Response("Failed to fetch coin list", { status: 500 });
    }

    const data = await res.json();
    return Response.json(data);
}
