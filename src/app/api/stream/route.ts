export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbols = (searchParams.get("symbols") || "btcusdt").toLowerCase().split(",");

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const { WebSocket } = await import("ws");

            // ex: wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade
            const streams = symbols.map((s) => `${s}@trade`).join("/");
            const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

            const ws = new WebSocket(url);

            ws.on("message", (msg) => {
                try {
                    const data = JSON.parse(msg.toString());
                    const trade = data.data;
                    const price = parseFloat(trade.p);
                    const payload = { symbol: trade.s, price, time: trade.T };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                } catch {
                    // ignore parsing errors
                }
            });

            ws.on("close", () => {
                controller.close();
            });

            ws.on("error", () => {
                controller.enqueue(encoder.encode("event: error\ndata: ws error\n\n"));
                controller.close();
            });

            // cleanup
            return () => {
                ws.close();
            };
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
