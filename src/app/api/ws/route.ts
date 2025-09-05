import { NextRequest } from "next/server";
import type { WebSocket } from "ws";

export const config = {
    runtime: "nodejs",
};

export async function GET(req: NextRequest) {
    const { socket } = req as any;

    if (!socket || !socket.server) {
        return new Response("No socket found", { status: 500 });
    }

    if (!(socket.server as any).wss) {
        const { WebSocketServer } = await import("ws");
        (socket.server as any).wss = new WebSocketServer({ noServer: true });

        (socket.server as any).wss.on("connection", (ws: WebSocket, req: any) => {
            const url = new URL(req.url, "http://localhost");
            const ids = url.searchParams.get("ids") || "bitcoin";
            const vs = url.searchParams.get("vs") || "usd";

            const interval = setInterval(async () => {
                try {
                    const res = await fetch(
                        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`
                    );
                    if (res.ok) {
                        const data = await res.json();
                        ws.send(JSON.stringify({ ids, vs, data }));
                    }
                } catch {
                    ws.send(JSON.stringify({ error: "Fetch failed" }));
                }
            }, 5000);

            ws.on("close", () => clearInterval(interval));
        });

        (socket.server as any).on("upgrade", (req: any, sock: any, head: any) => {
            if (req.url.startsWith("/api/ws")) {
                (socket.server as any).wss.handleUpgrade(req, sock, head, (client: any) => {
                    (socket.server as any).wss.emit("connection", client, req);
                });
            }
        });
    }

    return new Response("WebSocket server running");
}
