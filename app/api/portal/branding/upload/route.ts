import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal/auth";
import {
  buildPortalLogoFileName,
  buildPortalLogoPublicUrl,
  getPortalLogoUserDir,
  resolveOwnedPortalLogoAbsolutePath,
  validatePortalLogoUpload,
} from "@/lib/portal/logo-upload";
import { ensurePortalSchema } from "@/lib/portal/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    await ensurePortalSchema();

    const formData = await req.formData();
    const input = formData.get("logo");

    if (!(input instanceof File)) {
      return NextResponse.json({ error: "Arquivo de logo obrigatorio." }, { status: 400 });
    }

    const bytes = Buffer.from(await input.arrayBuffer());
    const validation = validatePortalLogoUpload(bytes, input.type);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const [current] = await db<{ logo_url: string | null }[]>`
      SELECT logo_url
      FROM public.portal_user_branding
      WHERE owner_user_id = ${user.id}
      LIMIT 1
    `;

    const fileName = buildPortalLogoFileName(validation.meta.mime);
    const userDir = getPortalLogoUserDir(user.id);
    const filePath = path.join(userDir, fileName);
    const logoUrl = buildPortalLogoPublicUrl(user.id, fileName);

    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(filePath, bytes);

    await db`
      INSERT INTO public.portal_user_branding (
        owner_user_id,
        logo_url,
        updated_at
      )
      VALUES (
        ${user.id},
        ${logoUrl},
        NOW()
      )
      ON CONFLICT (owner_user_id)
      DO UPDATE SET
        logo_url = EXCLUDED.logo_url,
        updated_at = NOW()
    `;

    const previousLogoPath = resolveOwnedPortalLogoAbsolutePath(
      String(current?.logo_url ?? ""),
      user.id,
    );
    if (previousLogoPath && previousLogoPath !== filePath) {
      await fs.unlink(previousLogoPath).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      logoUrl,
      meta: {
        mime: validation.meta.mime,
        size: validation.meta.size,
        width: validation.meta.width,
        height: validation.meta.height,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao enviar logo." }, { status: 500 });
  }
}
