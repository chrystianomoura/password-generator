"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import { evaluatePasswordStrength } from "../js/password-strength.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DE CLASSIFICAÇÃO
   ========================================================= */

/* =========================================================
   01. LIMITES DOS NÍVEIS
   ========================================================= */

test("classifica valores abaixo de 40 bits como Weak", () => {
  assert.deepEqual(evaluatePasswordStrength(0), {
    label: "Weak",
    bars: 1,
  });

  assert.deepEqual(evaluatePasswordStrength(39.999), {
    label: "Weak",
    bars: 1,
  });
});

test("classifica 40 bits como Fair", () => {
  assert.deepEqual(evaluatePasswordStrength(40), {
    label: "Fair",
    bars: 2,
  });
});

test("classifica valores entre 40 e 60 bits como Fair", () => {
  assert.deepEqual(evaluatePasswordStrength(59.999), {
    label: "Fair",
    bars: 2,
  });
});

test("classifica 60 bits como Strong", () => {
  assert.deepEqual(evaluatePasswordStrength(60), {
    label: "Strong",
    bars: 3,
  });
});

test("classifica valores entre 60 e 80 bits como Strong", () => {
  assert.deepEqual(evaluatePasswordStrength(79.999), {
    label: "Strong",
    bars: 3,
  });
});

test("classifica 80 bits como Very Strong", () => {
  assert.deepEqual(evaluatePasswordStrength(80), {
    label: "Very Strong",
    bars: 4,
  });
});

test("classifica valores entre 80 e 120 bits como Very Strong", () => {
  assert.deepEqual(evaluatePasswordStrength(119.999), {
    label: "Very Strong",
    bars: 4,
  });
});

test("classifica 120 bits ou mais como Exceptional", () => {
  assert.deepEqual(evaluatePasswordStrength(120), {
    label: "Exceptional",
    bars: 5,
  });

  assert.deepEqual(evaluatePasswordStrength(415), {
    label: "Exceptional",
    bars: 5,
  });
});

/* =========================================================
   02. VALIDAÇÃO DE ENTRADA
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

test("rejeita valores que não são números", () => {
  assert.throws(() => {
    evaluatePasswordStrength("120");
  }, TypeError);

  assert.throws(() => {
    evaluatePasswordStrength(null);
  }, TypeError);

  assert.throws(() => {
    evaluatePasswordStrength();
  }, TypeError);
});

/* =========================================================
   03. CONSISTÊNCIA DA CLASSIFICAÇÃO
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