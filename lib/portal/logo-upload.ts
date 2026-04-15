import { randomUUID } from "node:crypto";
import path from "node:path";

type AllowedMime = "image/png" | "image/jpeg" | "image/webp";

type LogoMeta = {
  mime: AllowedMime;
  extension: "png" | "jpg" | "webp";
  width: number;
  height: number;
  size: number;
};

export const PORTAL_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const PORTAL_LOGO_MIN_DIMENSION = 32;
export const PORTAL_LOGO_MAX_DIMENSION = 2000;

const PORTAL_LOGO_PUBLIC_PREFIX = "/api/public/uploads/portal-logos";
const PORTAL_LOGO_LEGACY_PUBLIC_PREFIX = "/uploads/portal-logos";

const MIME_ALIAS_TO_ALLOWED: Record<string, AllowedMime> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/webp": "image/webp",
};

const MIME_TO_EXTENSION: Record<AllowedMime, LogoMeta["extension"]> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function isPng(buffer: Buffer) {
  if (buffer.length < 24) return false;
  const signature = [
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ];
  return signature.every((byte, index) => buffer[index] === byte);
}

function readPngSize(buffer: Buffer) {
  if (!isPng(buffer)) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function isJpeg(buffer: Buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function readJpegSize(buffer: Buffer) {
  if (!isJpeg(buffer)) return null;

  let offset = 2;
  while (offset + 4 <= buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    offset += 2;
    if (segmentLength < 2 || offset + segmentLength - 2 > buffer.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      if (segmentLength < 7) break;
      const height = buffer.readUInt16BE(offset + 1);
      const width = buffer.readUInt16BE(offset + 3);
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    offset += segmentLength - 2;
  }

  return null;
}

function isWebp(buffer: Buffer) {
  if (buffer.length < 12) return false;
  return (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

function readWebpSize(buffer: Buffer) {
  if (!isWebp(buffer)) return null;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;
    const chunkEnd = chunkDataOffset + chunkSize;
    if (chunkEnd > buffer.length) break;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      const width =
        1 +
        buffer[chunkDataOffset + 4] +
        (buffer[chunkDataOffset + 5] << 8) +
        (buffer[chunkDataOffset + 6] << 16);
      const height =
        1 +
        buffer[chunkDataOffset + 7] +
        (buffer[chunkDataOffset + 8] << 8) +
        (buffer[chunkDataOffset + 9] << 16);
      return { width, height };
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      const widthRaw = buffer.readUInt16LE(chunkDataOffset + 6);
      const heightRaw = buffer.readUInt16LE(chunkDataOffset + 8);
      const width = widthRaw & 0x3fff;
      const height = heightRaw & 0x3fff;
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    if (chunkType === "VP8L" && chunkSize >= 5) {
      const b0 = buffer[chunkDataOffset + 1];
      const b1 = buffer[chunkDataOffset + 2];
      const b2 = buffer[chunkDataOffset + 3];
      const b3 = buffer[chunkDataOffset + 4];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  return null;
}

function detectLogoMeta(buffer: Buffer): Omit<LogoMeta, "size"> | null {
  const png = readPngSize(buffer);
  if (png) {
    return {
      mime: "image/png",
      extension: "png",
      width: png.width,
      height: png.height,
    };
  }

  const jpeg = readJpegSize(buffer);
  if (jpeg) {
    return {
      mime: "image/jpeg",
      extension: "jpg",
      width: jpeg.width,
      height: jpeg.height,
    };
  }

  const webp = readWebpSize(buffer);
  if (webp) {
    return {
      mime: "image/webp",
      extension: "webp",
      width: webp.width,
      height: webp.height,
    };
  }

  return null;
}

export function validatePortalLogoUpload(
  buffer: Buffer,
  declaredMime: string | null | undefined,
) {
  if (buffer.length === 0) {
    return { ok: false as const, error: "Arquivo vazio." };
  }

  if (buffer.length > PORTAL_LOGO_MAX_BYTES) {
    return {
      ok: false as const,
      error: `Arquivo maior que ${Math.floor(PORTAL_LOGO_MAX_BYTES / (1024 * 1024))}MB.`,
    };
  }

  const detected = detectLogoMeta(buffer);
  if (!detected) {
    return {
      ok: false as const,
      error: "Formato invalido. Use PNG, JPG ou WEBP.",
    };
  }

  const normalizedDeclaredMime = String(declaredMime ?? "")
    .trim()
    .toLowerCase();
  if (normalizedDeclaredMime) {
    const expected = MIME_ALIAS_TO_ALLOWED[normalizedDeclaredMime];
    if (!expected || expected !== detected.mime) {
      return {
        ok: false as const,
        error: "Tipo de arquivo invalido ou inconsistente com o conteudo.",
      };
    }
  }

  if (
    detected.width < PORTAL_LOGO_MIN_DIMENSION ||
    detected.height < PORTAL_LOGO_MIN_DIMENSION
  ) {
    return {
      ok: false as const,
      error: `Dimensoes muito pequenas. Minimo ${PORTAL_LOGO_MIN_DIMENSION}x${PORTAL_LOGO_MIN_DIMENSION}.`,
    };
  }

  if (
    detected.width > PORTAL_LOGO_MAX_DIMENSION ||
    detected.height > PORTAL_LOGO_MAX_DIMENSION
  ) {
    return {
      ok: false as const,
      error: `Dimensoes muito grandes. Maximo ${PORTAL_LOGO_MAX_DIMENSION}x${PORTAL_LOGO_MAX_DIMENSION}.`,
    };
  }

  return {
    ok: true as const,
    meta: {
      ...detected,
      size: buffer.length,
    },
  };
}

export function buildPortalLogoFileName(mime: AllowedMime) {
  const extension = MIME_TO_EXTENSION[mime];
  return `logo-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
}

export function getPortalLogoUserDir(userId: number) {
  return path.join(process.cwd(), "public", "uploads", "portal-logos", String(userId));
}

export function buildPortalLogoPublicUrl(userId: number, fileName: string) {
  return `${PORTAL_LOGO_PUBLIC_PREFIX}/${userId}/${fileName}`;
}

export function normalizePortalLogoPublicUrl(logoUrl: string | null | undefined) {
  const normalizedUrl = String(logoUrl ?? "").trim();
  if (!normalizedUrl) return null;

  if (normalizedUrl.startsWith(`${PORTAL_LOGO_PUBLIC_PREFIX}/`)) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith(`${PORTAL_LOGO_LEGACY_PUBLIC_PREFIX}/`)) {
    return `${PORTAL_LOGO_PUBLIC_PREFIX}${normalizedUrl.slice(PORTAL_LOGO_LEGACY_PUBLIC_PREFIX.length)}`;
  }

  return normalizedUrl;
}

export function resolveOwnedPortalLogoAbsolutePath(logoUrl: string, userId: number) {
  const normalizedUrl = String(logoUrl ?? "").trim();
  const prefixes = [
    `${PORTAL_LOGO_PUBLIC_PREFIX}/${userId}/`,
    `${PORTAL_LOGO_LEGACY_PUBLIC_PREFIX}/${userId}/`,
  ];
  const matchedPrefix = prefixes.find((prefix) => normalizedUrl.startsWith(prefix));
  if (!matchedPrefix) return null;

  const relativeFileName = normalizedUrl.slice(matchedPrefix.length);
  if (!relativeFileName || relativeFileName.includes("..") || relativeFileName.includes("/")) {
    return null;
  }

  return path.join(getPortalLogoUserDir(userId), relativeFileName);
}
