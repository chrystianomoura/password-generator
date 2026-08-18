"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import { evaluatePasswordStrength } from "../js/password-strength.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DE CLASSIFICAÇÃO
   ---------------------------------------------------------
   Este arquivo verifica:

   - fronteiras exatas entre os níveis;
   - valores imediatamente abaixo dos thresholds;
   - validação de entradas inválidas;
   - crescimento consistente das barras;
   - formato do objeto retornado.

   Como evaluatePasswordStrength() é uma função pura e
   determinística, usamos casos tabelados sempre que isso
   deixa o comportamento mais fácil de enxergar.
   ========================================================= */

/* =========================================================
   01. CASOS DE CLASSIFICAÇÃO
   ========================================================= */

const CLASSIFICATION_CASES = Object.freeze([
  Object.freeze({
    entropy: 0,
    expected: {
      label: "Weak",
      bars: 1,
    },
  }),

  Object.freeze({
    entropy: 39.999,
    expected: {
      label: "Weak",
      bars: 1,
    },
  }),

  Object.freeze({
    entropy: 40,
    expected: {
      label: "Fair",
      bars: 2,
    },
  }),

  Object.freeze({
    entropy: 59.999,
    expected: {
      label: "Fair",
      bars: 2,
    },
  }),

  Object.freeze({
    entropy: 60,
    expected: {
      label: "Strong",
      bars: 3,
    },
  }),

  Object.freeze({
    entropy: 79.999,
    expected: {
      label: "Strong",
      bars: 3,
    },
  }),

  Object.freeze({
    entropy: 80,
    expected: {
      label: "Very Strong",
      bars: 4,
    },
  }),

  Object.freeze({
    entropy: 119.999,
    expected: {
      label: "Very Strong",
      bars: 4,
    },
  }),

  Object.freeze({
    entropy: 120,
    expected: {
      label: "Exceptional",
      bars: 5,
    },
  }),

  Object.freeze({
    entropy: 415,
    expected: {
      label: "Exceptional",
      bars: 5,
    },
  }),
]);

/* =========================================================
   02. LIMITES DOS NÍVEIS
   ========================================================= */

for (const { entropy, expected } of CLASSIFICATION_CASES) {
  test(`classifica ${entropy} bits como ${expected.label}`, () => {
    assert.deepEqual(evaluatePasswordStrength(entropy), expected);
  });
}

/* =========================================================
   03. VALIDAÇÃO DE ENTRADA
   ========================================================= */

test("rejeita entropia negativa", () => {
  assert.throws(() => {
    evaluatePasswordStrength(-1);
  }, TypeError);
});

test("rejeita NaN", () => {
  assert.throws(() => {
    evaluatePasswordStrength(NaN);
  }, TypeError);
});

test("rejeita Infinity", () => {
  assert.throws(() => {
    evaluatePasswordStrength(Infinity);
  }, TypeError);
});

test("rejeita -Infinity", () => {
  assert.throws(() => {
    evaluatePasswordStrength(-Infinity);
  }, TypeError);
});

test("rejeita valores que não são números", () => {
  const invalidValues = ["120", null, undefined, true, {}, []];

  for (const value of invalidValues) {
    assert.throws(() => {
      evaluatePasswordStrength(value);
    }, TypeError);
  }
});

/* =========================================================
   04. CONSISTÊNCIA DA CLASSIFICAÇÃO
   ========================================================= */

test("a quantidade de barras cresce junto com o nível", () => {
  const entropies = [0, 40, 60, 80, 120];

  const bars = entropies.map(
    (entropy) => evaluatePasswordStrength(entropy).bars,
  );

  assert.deepEqual(bars, [1, 2, 3, 4, 5]);
});

test("todos os níveis retornam label e bars válidos", () => {
  const entropies = [0, 40, 60, 80, 120, 300];

  for (const entropy of entropies) {
    const result = evaluatePasswordStrength(entropy);

    assert.equal(typeof result.label, "string");

    assert.ok(result.label.length > 0);

    assert.equal(Number.isInteger(result.bars), true);

    assert.ok(result.bars >= 1 && result.bars <= 5);
  }
});