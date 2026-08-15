import PDFDocument from "pdfkit";

import type { CalculationResult } from "@/domain/calculators/types";

export type ReportPdfInput = {
  title: string;
  calculatorName: string;
  savedName: string;
  savedCreatedAt: string;
  generatedAt: string;
  result: CalculationResult;
};

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-LK", { maximumFractionDigits: 6 }).format(value);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    const sign = value.startsWith("-") ? "-" : "";
    const unsigned = sign ? value.slice(1) : value;
    const [integer, fraction] = unsigned.split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
  }

  return value;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type Document = PDFKit.PDFDocument;

function contentWidth(document: Document): number {
  return document.page.width - document.page.margins.left - document.page.margins.right;
}

function ensureSpace(document: Document, height: number) {
  if (document.y + height > document.page.height - document.page.margins.bottom) {
    document.addPage();
  }
}

function sectionTitle(document: Document, text: string) {
  ensureSpace(document, 40);
  document.moveDown(1.2);
  document.font("Helvetica-Bold").fontSize(12).fillColor("#1a1a1a").text(text);
  document.moveDown(0.4);
}

function writeLines(document: Document, lines: string[]) {
  for (const line of lines) {
    document
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#333333")
      .text(line, { width: contentWidth(document), continued: false });
    document.moveDown(0.15);
  }
}

export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const document = new PDFDocument({ margin: 48 });

  const chunks: Buffer[] = [];
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.font("Helvetica-Bold").fontSize(20).fillColor("#1a1a1a").text("LankaCalc");
    document.font("Helvetica").fontSize(10).fillColor("#666666").text("Calculation report");
    document.moveDown(0.8);
    document.moveTo(document.page.margins.left, document.y).lineTo(document.page.width - document.page.margins.right, document.y)
      .strokeColor("#d0d0d0").lineWidth(1).stroke();
    document.moveDown(0.8);

    document.font("Helvetica-Bold").fontSize(15).fillColor("#1a1a1a").text(input.title, { width: contentWidth(document) });
    document.moveDown(0.4);
    writeLines(document, [
      `Saved calculation: ${input.savedName} · saved ${formatDateTime(input.savedCreatedAt)}`,
      `Calculator: ${input.calculatorName} v${input.result.calculationVersion}`,
      `Generated: ${formatDateTime(input.generatedAt)}`,
    ]);
    document.moveDown(0.4);

    if (input.result.asOfDate) {
      writeLines(document, [`Calculation date: ${input.result.asOfDate}`]);
      document.moveDown(0.4);
    }

    sectionTitle(document, "Result");
    for (const item of input.result.breakdown) {
      ensureSpace(document, 36);
      const label = `${item.label}${item.unit ? ` (${item.unit})` : ""}`;
      document.font("Helvetica").fontSize(10).fillColor("#333333").text(label, { width: contentWidth(document) });
      document.font("Helvetica-Bold").fontSize(12).fillColor("#111111").text(
        formatValue(item.value),
        { width: contentWidth(document) },
      );
      if (item.expression) {
        document.font("Helvetica").fontSize(9).fillColor("#888888").text(item.expression, { width: contentWidth(document) });
      }
      document.moveDown(0.5);
    }

    if (input.result.assumptions.length > 0) {
      sectionTitle(document, "Assumptions");
      writeLines(document, input.result.assumptions.map((note) => `• ${note}`));
    }

    if (input.result.warnings.length > 0) {
      sectionTitle(document, "Check before deciding");
      writeLines(document, input.result.warnings.map((note) => `• ${note}`));
    }

    if (input.result.ruleVersions.length > 0) {
      sectionTitle(document, "Rule versions");
      writeLines(document, input.result.ruleVersions.map((rule) => {
        const range = rule.effectiveTo ? ` to ${rule.effectiveTo}` : "";
        return `${rule.key} ${rule.version}, effective ${rule.effectiveFrom}${range}`;
      }));
    }

    if (input.result.sources.length > 0) {
      sectionTitle(document, "Sources");
      for (const source of input.result.sources) {
        writeLines(document, [
          `${source.authority}: ${source.title}`,
          `${source.url} · verified ${source.verifiedAt}${source.publishedOn ? ` · published ${source.publishedOn}` : ""}`,
        ]);
        document.moveDown(0.2);
      }
    }

    if (input.result.verifiedAt) {
      document.moveDown(0.8);
      writeLines(document, [`Last verified ${input.result.verifiedAt}`]);
    }

    ensureSpace(document, 60);
    document.moveDown(1.5);
    document.moveTo(document.page.margins.left, document.y).lineTo(document.page.width - document.page.margins.right, document.y)
      .strokeColor("#d0d0d0").lineWidth(1).stroke();
    document.moveDown(0.5);
    document.font("Helvetica").fontSize(8).fillColor("#888888").text(
      `Generated with ${input.calculatorName} v${input.result.calculationVersion} · LankaCalc`,
      { width: contentWidth(document) },
    );

    document.end();
  });

  return buffer;
}
