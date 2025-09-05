export async function GET() {
    const coins = [
        { id: "btcusdt", symbol: "BTC", name: "Bitcoin", color: "#f7931a", icon: "₿" },
        { id: "ethusdt", symbol: "ETH", name: "Ethereum", color: "#627eea", icon: "Ξ" },
        { id: "solusdt", symbol: "SOL", name: "Solana", color: "#14f195", icon: "◎" },
        { id: "dogeusdt", symbol: "DOGE", name: "Dogecoin", color: "#c2a633", icon: "Ð" },
        { id: "adausdt", symbol: "ADA", name: "Cardano", color: "#0033ad", icon: "₳" },
        { id: "xrpusdt", symbol: "XRP", name: "XRP", color: "#23292f", icon: "✕" },
    ];
    return Response.json(coins);
}
