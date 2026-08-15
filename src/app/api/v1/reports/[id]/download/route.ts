import { downloadReport } from "@/server/reports/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await downloadReport(request.headers, id, new URL(request.url).searchParams);

  if (response.status === 200) {
    const body = response.body as { pdf: Buffer; fileName: string; contentType: string };
    return new Response(new Uint8Array(body.pdf), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${body.fileName}"`,
        "Content-Length": String(body.pdf.length),
        "Content-Type": body.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return Response.json(response.body, { status: response.status });
}
