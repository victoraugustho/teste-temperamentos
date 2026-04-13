export type Temperament = "melancolico" | "sanguineo" | "fleumatico" | "colerico";
export type Scores = Record<Temperament, number>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function parseScores(raw: unknown): Scores | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const parsed: Scores = {
    melancolico: Number(data.melancolico ?? 0),
    sanguineo: Number(data.sanguineo ?? 0),
    fleumatico: Number(data.fleumatico ?? 0),
    colerico: Number(data.colerico ?? 0),
  };

  for (const value of Object.values(parsed)) {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
  }

  return parsed;
}

export function toPercentages(scores: Scores): Scores {
  const total = Object.values(scores).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );

  if (total <= 0) {
    return { melancolico: 0, sanguineo: 0, fleumatico: 0, colerico: 0 };
  }

  const raw: Scores = {
    melancolico: (scores.melancolico / total) * 100,
    sanguineo: (scores.sanguineo / total) * 100,
    fleumatico: (scores.fleumatico / total) * 100,
    colerico: (scores.colerico / total) * 100,
  };

  const rounded: Scores = {
    melancolico: Math.round(raw.melancolico * 100) / 100,
    sanguineo: Math.round(raw.sanguineo * 100) / 100,
    fleumatico: Math.round(raw.fleumatico * 100) / 100,
    colerico: Math.round(raw.colerico * 100) / 100,
  };

  const sum =
    rounded.melancolico + rounded.sanguineo + rounded.fleumatico + rounded.colerico;
  const diff = Math.round((100 - sum) * 100) / 100;

  if (diff !== 0) {
    const entries = Object.entries(rounded) as Array<[Temperament, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries[0][0];
    rounded[top] = Math.round((rounded[top] + diff) * 100) / 100;
  }

  return {
    melancolico: clamp(rounded.melancolico, 0, 100),
    sanguineo: clamp(rounded.sanguineo, 0, 100),
    fleumatico: clamp(rounded.fleumatico, 0, 100),
    colerico: clamp(rounded.colerico, 0, 100),
  };
}
