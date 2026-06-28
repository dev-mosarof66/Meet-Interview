import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { ResumeDoc } from "./types";

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: "999999", space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 22 }),
    ],
  });
}

/** ATS-friendly resume: single column, standard headings, no tables/graphics. */
export async function buildResumeDocx(r: ResumeDoc): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: r.name || "Your Name", bold: true, size: 36 })],
    })
  );
  if (r.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: r.title, size: 24, color: "444444" })],
      })
    );
  }
  const contact = [r.email, r.phone, r.location].filter(Boolean).join("  |  ");
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 20, color: "666666" })],
      })
    );
  }

  if (r.summary) {
    children.push(sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: r.summary, size: 20 })] })
    );
  }

  if (r.skills?.length) {
    children.push(sectionHeading("Skills"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: r.skills.join(" · "), size: 20 })],
      })
    );
  }

  if (r.experiences?.length) {
    children.push(sectionHeading("Experience"));
    for (const e of r.experiences) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({ text: e.role || "", bold: true, size: 22 }),
            new TextRun({
              text: e.company ? `  —  ${e.company}` : "",
              size: 22,
            }),
            new TextRun({
              text: e.dates ? `   (${e.dates})` : "",
              italics: true,
              size: 18,
              color: "666666",
            }),
          ],
        })
      );
      for (const b of e.bullets || []) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: b, size: 20 })],
          })
        );
      }
    }
  }

  if (r.education) {
    children.push(sectionHeading("Education"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: r.education, size: 20 })] })
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri" } } },
    },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

export async function buildCoverDocx(
  text: string,
  name: string
): Promise<Buffer> {
  const children: Paragraph[] = [];
  if (name) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: name, bold: true, size: 28 })],
      })
    );
  }
  for (const para of text.split(/\n{2,}/)) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: para
          .split("\n")
          .map(
            (line, i) =>
              new TextRun({ text: line, size: 22, break: i > 0 ? 1 : 0 })
          ),
      })
    );
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}
