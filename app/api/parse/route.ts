import { NextRequest, NextResponse } from "next/server";
import { parseResume, usingRealAI } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Last-resort text extraction for tagged PDFs (e.g. Canva): pull readable
 *  strings out of the structure tree / content. */
function extractPdfStrings(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const out: string[] = [];
  // /E (...) and /T (...) carry tagged text in many exported PDFs.
  const re = /\/(?:E|T|Alt|ActualText)\s*\(((?:[^()\\]|\\.)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const s = m[1].replace(/\\([()\\])/g, "$1").trim();
    if (s && s.length > 1) out.push(s);
  }
  return out.join("\n");
}

async function pdfToText(buf: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const result = await parser.getText();
    await parser.destroy?.();
    const text = (result?.text || "").trim();
    // Some PDFs (image/struct-only) yield little from the content stream.
    if (text.length > 80) return text;
    const fallback = extractPdfStrings(buf);
    return fallback.length > text.length ? fallback : text;
  } catch {
    return extractPdfStrings(buf);
  }
}

async function docxToText(buf: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    return (res.value || "").trim();
  } catch {
    return "";
  }
}

async function extractText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf") || type.includes("pdf")) return pdfToText(buf);
  if (name.endsWith(".docx") || type.includes("officedocument"))
    return docxToText(buf);
  // txt / md / unknown → treat as plain text
  return buf.toString("utf8");
}

export async function POST(req: NextRequest) {
  try {
    let text = "";
    const ct = req.headers.get("content-type") || "";

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
      }
      text = await extractText(file);
    } else {
      const body = await req.json().catch(() => ({}));
      text = body.text || "";
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            "Couldn't read enough text from that file. If it's an image-only or scanned PDF, paste the text instead.",
        },
        { status: 400 }
      );
    }

    const profile = await parseResume(text);
    return NextResponse.json({ profile, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to parse" },
      { status: 500 }
    );
  }
}
