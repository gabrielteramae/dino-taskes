import { createFileRoute } from "@tanstack/react-router";
import { icsFor } from "@/lib/agenda";
import { noonUtc, withClock } from "@/lib/dates";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{2}:\d{2}$/;

export const Route = createFileRoute("/api/agenda")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const start = url.searchParams.get("start") ?? "";
        const end = url.searchParams.get("end") || start;
        const startClock = url.searchParams.get("startClock") ?? "";
        const endClock = url.searchParams.get("endClock") ?? "";
        if (!DAY.test(start) || !DAY.test(end)) return new Response("Dia inválido", { status: 400 });
        if ((startClock && !CLOCK.test(startClock)) || (endClock && !CLOCK.test(endClock))) {
          return new Response("Hora inválida", { status: 400 });
        }
        const text = (url.searchParams.get("text") ?? "Tarefa").replace(/[\r\n]/g, " ").slice(0, 80);
        const ics = icsFor({
          id: `${start}-${end}`,
          text,
          dueAt: startClock ? withClock(start, startClock) : noonUtc(start),
          endsAt: endClock ? withClock(end, endClock) : noonUtc(end),
        });
        if (!ics) return new Response("Dia inválido", { status: 400 });
        return new Response(ics, {
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "content-disposition": 'inline; filename="tarefa.ics"',
          },
        });
      },
    },
  },
});
