export async function GET() {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const send = async () => {
                try {
                    const res = await fetch(
                        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
                    );
                    const data = await res.json();

                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                    );
                } catch {
                    controller.enqueue(encoder.encode("event: error\ndata: fetch failed\n\n"));
                }
            };

            // Premier envoi immédiat
            send();
            const interval = setInterval(send, 5000);

            // Nettoyage quand le client ferme la connexion
            stream.cancel = () => {
                clearInterval(interval);
                try {
                    controller.close();
                } catch {
                    // ignore si déjà fermé
                }
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
