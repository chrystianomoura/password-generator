"use strict";

/* =========================================================
   PASSWORD GENERATOR — CLASSIFICAÇÃO DE SEGURANÇA
   ---------------------------------------------------------
   Responsabilidade única:
   converter uma estimativa de entropia em uma
   classificação simples para a interface.

   Os limites abaixo são uma heurística interna
   de produto, não níveis oficiais do NIST.
   ========================================================= */

const LEVELS = Object.freeze([
  {
    minimum: 0,
    label: "Weak",
    bars: 1,
  },
  {
    minimum: 40,
    label: "Fair",
    bars: 2,
  },
  {
    minimum: 60,
    label: "Strong",
    bars: 3,
  },
  {
    minimum: 80,
    label: "Very Strong",
    bars: 4,
  },
  {
    minimum: 120,
    label: "Exceptional",
    bars: 5,
  },
]);

export function evaluatePasswordStrength(entropy) {
  if (typeof entropy !== "number" || !Number.isFinite(entropy) || entropy < 0) {
    throw new TypeError("Entropy must be a non-negative finite number.");
  }

  let selectedLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (entropy >= level.minimum) {
      selectedLevel = level;
    }
  }

  return {
    label: selectedLevel.label,
    bars: selectedLevel.bars,
  };
}