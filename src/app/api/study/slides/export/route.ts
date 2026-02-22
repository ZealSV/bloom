import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import PptxGenJS from "pptxgenjs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deckId, slideIds, template } = (await req.json()) as {
    deckId?: string;
    slideIds?: string[];
    template?: "minimal_light" | "modern_ink" | "classic_lecture" | "dark_night" | "studio_green";
  };

  if (!deckId) {
    return new Response("Missing deckId", { status: 400 });
  }

  const { data: deck, error: deckError } = await supabase
    .from("slide_decks")
    .select("id, title, user_id, template")
    .eq("id", deckId)
    .single();

  if (deckError || !deck || deck.user_id !== user.id) {
    return new Response("Deck not found", { status: 404 });
  }

  let slidesQuery = supabase
    .from("slides")
    .select("id, slide_index, title, bullets, speaker_notes, image_url, layout, hero_bullet")
    .eq("deck_id", deckId)
    .order("slide_index", { ascending: true });

  if (Array.isArray(slideIds) && slideIds.length > 0) {
    slidesQuery = slidesQuery.in("id", slideIds);
  }

  const { data: slides, error: slidesError } = await slidesQuery;

  if (slidesError || !slides || slides.length === 0) {
    return new Response("No slides found", { status: 400 });
  }

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "bloom";
  const themes: Record<string, {
    titleColor: string;
    textColor: string;
    accent: string;
    titleFont: string;
    bodyFont: string;
    background: string;
  }> = {
    minimal_light: {
      titleColor: "1F2937",
      textColor: "334155",
      accent: "10B981",
      titleFont: "Aptos Display",
      bodyFont: "Aptos",
      background: "FFFFFF",
    },
    modern_ink: {
      titleColor: "0F172A",
      textColor: "0F172A",
      accent: "6366F1",
      titleFont: "Aptos Display",
      bodyFont: "Aptos",
      background: "F8FAFC",
    },
    classic_lecture: {
      titleColor: "111827",
      textColor: "1F2937",
      accent: "0EA5E9",
      titleFont: "Cambria",
      bodyFont: "Calibri",
      background: "FFFFFF",
    },
    dark_night: {
      titleColor: "F8FAFC",
      textColor: "E2E8F0",
      accent: "22D3EE",
      titleFont: "Aptos Display",
      bodyFont: "Aptos",
      background: "0B0F19",
    },
    studio_green: {
      titleColor: "0F172A",
      textColor: "0F172A",
      accent: "16A34A",
      titleFont: "Aptos Display",
      bodyFont: "Aptos",
      background: "F0FDF4",
    },
  };

  const theme =
    themes[template || deck.template || "minimal_light"] || themes.minimal_light;

  const getLayout = (idx: number, layout?: string | null) => {
    if (layout) return layout;
    const sequence =
      template === "dark_night"
        ? ["full-visual", "split-visual", "title-overlay", "title-top"]
        : ["split-visual", "title-top", "image-right", "title-left", "captioned"];
    return sequence[idx % sequence.length];
  };

  const computeBulletFont = (count: number) => {
    if (count <= 3) return 24;
    if (count <= 5) return 20;
    return 18;
  };

  const inferSlideType = (title: string, bullets: string[]) => {
    const text = `${title} ${bullets.join(" ")}`.toLowerCase();
    if (/define|definition|what is|overview|intro/.test(text)) return "Definition";
    if (/process|steps|workflow|pipeline|how to|mechanism/.test(text)) return "Process";
    if (/compare|versus|vs\.|difference|contrast/.test(text)) return "Comparison";
    if (/example|case|application|scenario/.test(text)) return "Example";
    if (/pitfall|mistake|misconception|avoid/.test(text)) return "Pitfall";
    if (/summary|recap|takeaway|key points/.test(text)) return "Summary";
    if (/checklist|criteria|rubric|must/.test(text)) return "Checklist";
    return "Concept";
  };

  const addTypeChip = (s: PptxGenJS.Slide, label: string) => {
    const iconShape =
      label === "Process"
        ? pptx.ShapeType.triangle
        : label === "Comparison"
          ? pptx.ShapeType.rect
          : label === "Definition"
            ? pptx.ShapeType.ellipse
            : label === "Pitfall"
              ? pptx.ShapeType.diamond
              : pptx.ShapeType.roundRect;
    s.addShape(iconShape, {
      x: 0.32,
      y: 0.12,
      w: 0.22,
      h: 0.22,
      fill: { color: theme.accent, transparency: 5 },
      line: { color: theme.accent },
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 0.1,
      w: 2.2,
      h: 0.35,
      fill: { color: theme.accent, transparency: 10 },
      line: { color: theme.accent },
      rectRadius: 0.08,
    });
    s.addText(label.toUpperCase(), {
      x: 0.7,
      y: 0.15,
      w: 2.0,
      h: 0.25,
      fontFace: theme.bodyFont,
      fontSize: 12,
      color: theme.background === "0B0F19" ? "0B0F19" : "FFFFFF",
      bold: true,
      valign: "middle",
    });
  };

  const computeTitleFont = (title: string) => {
    const len = title.trim().length;
    if (len <= 18) return 36;
    if (len <= 30) return 32;
    return 28;
  };

  const addHeroCallout = (
    s: PptxGenJS.Slide,
    heroText: string | null | undefined
  ) => {
    if (!heroText) return;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7,
      y: 6.2,
      w: 6.2,
      h: 0.9,
      fill: { color: theme.accent, transparency: 10 },
      line: { color: theme.accent },
      rectRadius: 0.08,
    });
    s.addText(`Key idea: ${heroText}`, {
      x: 0.9,
      y: 6.35,
      w: 5.8,
      h: 0.6,
      fontFace: theme.bodyFont,
      fontSize: 16,
      color: theme.background === "0B0F19" ? "0B0F19" : "FFFFFF",
      bold: true,
      valign: "middle",
    });
  };

  const addComparison = (
    s: PptxGenJS.Slide,
    bullets: string[],
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const pickHeader = (items: string[], fallback: string) => {
      const withColon = items.find((b) => b.includes(":"));
      if (withColon) return withColon.split(":")[0].trim();
      const first = items[0];
      if (!first) return fallback;
      return first.split(" ").slice(0, 2).join(" ");
    };
    const mid = Math.ceil(bullets.length / 2);
    const left = bullets.slice(0, mid);
    const right = bullets.slice(mid);
    const colW = (w - 0.4) / 2;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h,
      fill: { color: theme.background },
      line: { color: "E2E8F0" },
    });
    s.addShape(pptx.ShapeType.line, {
      x: x + colW + 0.2,
      y,
      w: 0,
      h,
      line: { color: "E2E8F0", width: 1 },
    });
    const leftHeader = pickHeader(left, "Left");
    const rightHeader = pickHeader(right, "Right");
    s.addText(leftHeader.toUpperCase(), {
      x: x + 0.2,
      y: y + 0.1,
      w: colW - 0.3,
      h: 0.3,
      fontFace: theme.bodyFont,
      fontSize: 12,
      color: theme.accent,
      bold: true,
      valign: "top",
    });
    s.addText(rightHeader.toUpperCase(), {
      x: x + colW + 0.4,
      y: y + 0.1,
      w: colW - 0.3,
      h: 0.3,
      fontFace: theme.bodyFont,
      fontSize: 12,
      color: theme.accent,
      bold: true,
      valign: "top",
    });
    s.addText(left.map((b) => `• ${b}`).join("\n"), {
      x: x + 0.2,
      y: y + 0.5,
      w: colW - 0.3,
      h: h - 0.7,
      fontFace: theme.bodyFont,
      fontSize: computeBulletFont(left.length),
      color: theme.textColor,
      valign: "top",
    });
    s.addText(right.map((b) => `• ${b}`).join("\n"), {
      x: x + colW + 0.4,
      y: y + 0.5,
      w: colW - 0.3,
      h: h - 0.7,
      fontFace: theme.bodyFont,
      fontSize: computeBulletFont(right.length),
      color: theme.textColor,
      valign: "top",
    });
  };

  const addProcessSteps = (
    s: PptxGenJS.Slide,
    bullets: string[],
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const useTimeline = bullets.length <= 4;
    if (useTimeline) {
      const stepW = w / Math.max(bullets.length, 1);
      const lineY = y + 0.5;
      s.addShape(pptx.ShapeType.line, {
        x,
        y: lineY,
        w,
        h: 0,
        line: { color: theme.accent, width: 2 },
      });
      bullets.forEach((step, idx) => {
        const cx = x + idx * stepW + stepW / 2 - 0.2;
        s.addShape(pptx.ShapeType.ellipse, {
          x: cx,
          y: lineY - 0.18,
          w: 0.4,
          h: 0.4,
          fill: { color: theme.accent, transparency: 10 },
          line: { color: theme.accent },
        });
        s.addText(`${idx + 1}`, {
          x: cx,
          y: lineY - 0.16,
          w: 0.4,
          h: 0.36,
          fontFace: theme.bodyFont,
          fontSize: 14,
          color: theme.background === "0B0F19" ? "0B0F19" : "FFFFFF",
          bold: true,
          align: "center",
          valign: "middle",
        });
        s.addText(step, {
          x: x + idx * stepW + 0.1,
          y: lineY + 0.25,
          w: stepW - 0.2,
          h: h - 0.8,
          fontFace: theme.bodyFont,
          fontSize: 18,
          color: theme.textColor,
          valign: "top",
          align: "center",
        });
      });
      return;
    }

    const stepFont = bullets.length <= 4 ? 22 : 18;
    const rowH = h / Math.max(bullets.length, 1);
    bullets.forEach((step, idx) => {
      const yPos = y + idx * rowH + 0.1;
      s.addShape(pptx.ShapeType.ellipse, {
        x,
        y: yPos,
        w: 0.4,
        h: 0.4,
        fill: { color: theme.accent, transparency: 10 },
        line: { color: theme.accent },
      });
      s.addText(`${idx + 1}`, {
        x,
        y: yPos + 0.02,
        w: 0.4,
        h: 0.36,
        fontFace: theme.bodyFont,
        fontSize: 14,
        color: theme.background === "0B0F19" ? "0B0F19" : "FFFFFF",
        bold: true,
        align: "center",
        valign: "middle",
      });
      s.addText(step, {
        x: x + 0.55,
        y: yPos - 0.04,
        w: w - 0.6,
        h: rowH,
        fontFace: theme.bodyFont,
        fontSize: stepFont,
        color: theme.textColor,
        valign: "top",
      });
    });
  };

  const addTemplateBackdrop = (s: PptxGenJS.Slide) => {
    if (template === "modern_ink") {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 0.6,
        fill: { color: theme.accent, transparency: 10 },
        line: { color: theme.accent },
      });
    } else if (template === "classic_lecture") {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 0.45,
        fill: { color: "E2E8F0", transparency: 20 },
        line: { color: "E2E8F0" },
      });
    } else if (template === "dark_night") {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 7.5,
        fill: { color: "111827", transparency: 35 },
        line: { color: "111827" },
      });
    } else if (template === "studio_green") {
      s.addShape(pptx.ShapeType.rect, {
        x: 12.2,
        y: 0,
        w: 1.1,
        h: 7.5,
        fill: { color: theme.accent, transparency: 20 },
        line: { color: theme.accent },
      });
    }
  };

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.background = { fill: theme.background };
    addTemplateBackdrop(s);

    const imageUrl = (slide as any).image_url as string | null | undefined;
    const baseLayout = getLayout(slide.slide_index || 0, (slide as any).layout);
    const hero = (slide as any).hero_bullet as string | null | undefined;
    const bullets: string[] = Array.isArray(slide.bullets) ? slide.bullets : [];
    const slideType = inferSlideType(slide.title || "Slide", bullets);
    const bulletText = bullets.length
      ? bullets.map((b) => `• ${slideType === "Checklist" ? `[ ] ${b}` : b}`).join("\n")
      : "• (No bullet points)";
    const bulletFontSize = computeBulletFont(bullets.length);

    const addTitle = (x: number, y: number, w: number, overlay = false) => {
      if (overlay) {
        s.addShape(pptx.ShapeType.rect, {
          x: x - 0.2,
          y: y - 0.1,
          w: w + 0.4,
          h: 0.7,
          fill: { color: theme.background, transparency: 20 },
          line: { color: theme.background },
        });
      }
      s.addText(slide.title || "Slide", {
        x,
        y,
        w,
        h: 0.6,
        fontFace: theme.titleFont,
        fontSize: computeTitleFont(slide.title || "Slide"),
        color: theme.titleColor,
        bold: true,
      });
    };

    const addBullets = (
      x: number,
      y: number,
      w: number,
      h: number,
      overlay = false
    ) => {
      if (overlay) {
        s.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w,
          h,
          fill: { color: theme.background, transparency: 25 },
          line: { color: theme.background },
        });
      }
      if (slideType === "Comparison" && bullets.length >= 2) {
        addComparison(s, bullets, x, y, w, h);
        return;
      }
      if (slideType === "Process" && bullets.length >= 3) {
        addProcessSteps(s, bullets, x + 0.1, y + 0.1, w - 0.2, h - 0.2);
        return;
      }
      s.addText(bulletText, {
        x: x + 0.2,
        y: y + 0.2,
        w: w - 0.4,
        h: h - 0.4,
        fontFace: theme.bodyFont,
        fontSize: bulletFontSize,
        color: theme.textColor,
        valign: "top",
        lineSpacingMultiple: 1.1,
      });
    };

    const addDefinitionTerms = (x: number, y: number, w: number) => {
      const terms = bullets
        .map((b) => b.split(":")[0].trim())
        .filter(Boolean)
        .slice(0, 3);
      if (terms.length === 0) return;
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w,
        h: 0.5,
        fill: { color: "E2E8F0", transparency: 30 },
        line: { color: "E2E8F0" },
        rectRadius: 0.08,
      });
      s.addText(`Key terms: ${terms.join(" • ")}`, {
        x: x + 0.2,
        y: y + 0.1,
        w: w - 0.4,
        h: 0.3,
        fontFace: theme.bodyFont,
        fontSize: 14,
        color: theme.textColor,
        valign: "middle",
      });
    };

    addTypeChip(s, slideType);

    const resolvedLayout = (() => {
      if (!imageUrl) return baseLayout;
      if (slideType === "Process") return "image-right";
      if (slideType === "Comparison") return "image-left";
      if (slideType === "Summary") return "captioned";
      if (slideType === "Definition") return "title-overlay";
      return baseLayout;
    })();

    if (slideType === "Definition") {
      addDefinitionTerms(6.6, 0.15, 6.5);
    }

    if (resolvedLayout === "full-visual" && imageUrl) {
      s.addImage({
        data: imageUrl,
        x: 0,
        y: 0,
        w: 13.33,
        h: 7.5,
      });
      addTitle(0.7, 0.4, 12, true);
      addBullets(0.7, 1.3, 6.4, 4.7, true);
      addHeroCallout(s, hero);
    } else if (resolvedLayout === "title-overlay" && imageUrl) {
      s.addImage({
        data: imageUrl,
        x: 0,
        y: 0,
        w: 13.33,
        h: 7.5,
      });
      addTitle(0.9, 0.6, 11.6, true);
      addBullets(0.9, 1.6, 7.0, 4.7, true);
      addHeroCallout(s, hero);
    } else if (resolvedLayout === "split-visual" && imageUrl) {
      addTitle(0.6, 0.4, 6.0);
      addBullets(0.6, 1.3, 6.0, 4.7);
      addHeroCallout(s, hero);
      s.addImage({
        data: imageUrl,
        x: 7.1,
        y: 1.1,
        w: 5.8,
        h: 4.8,
      });
    } else if (resolvedLayout === "image-left" && imageUrl) {
      s.addImage({
        data: imageUrl,
        x: 0.6,
        y: 1.1,
        w: 5.8,
        h: 4.8,
      });
      addTitle(6.9, 0.4, 6.0);
      addBullets(6.9, 1.3, 6.0, 4.7);
      addHeroCallout(s, hero);
    } else if (resolvedLayout === "image-right" && imageUrl) {
      addTitle(0.6, 0.4, 6.0);
      addBullets(0.6, 1.3, 6.0, 4.7);
      addHeroCallout(s, hero);
      s.addImage({
        data: imageUrl,
        x: 7.1,
        y: 1.1,
        w: 5.8,
        h: 4.8,
      });
    } else if (resolvedLayout === "captioned" && imageUrl) {
      addTitle(0.6, 0.3, 12.0);
      s.addImage({
        data: imageUrl,
        x: 0.7,
        y: 1.1,
        w: 12.0,
        h: 3.4,
      });
      addBullets(0.8, 4.7, 11.6, 1.9);
      addHeroCallout(s, hero);
    } else if (resolvedLayout === "title-left") {
      addTitle(0.6, 0.4, 12.0);
      s.addShape(pptx.ShapeType.line, {
        x: 0.6,
        y: 1.1,
        w: 12.0,
        h: 0,
        line: { color: theme.accent, width: 1 },
      });
      addBullets(0.8, 1.4, 11.6, 4.6);
      addHeroCallout(s, hero);
    } else {
      // title-top
      addTitle(0.6, 0.3, 12.0);
      s.addShape(pptx.ShapeType.line, {
        x: 0.6,
        y: 1.0,
        w: 12.0,
        h: 0,
        line: { color: theme.accent, width: 1 },
      });
      addBullets(0.8, 1.3, 11.6, 4.6);
      addHeroCallout(s, hero);
      if (imageUrl) {
        s.addImage({
          data: imageUrl,
          x: 7.1,
          y: 3.3,
          w: 5.0,
          h: 3.6,
        });
      }
    }

    if (slide.speaker_notes) {
      s.addNotes(slide.speaker_notes);
    }
  }

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${deck.title || "deck"}.pptx"`,
    },
  });
}
