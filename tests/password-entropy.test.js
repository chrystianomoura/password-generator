"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateEntropy,
  countValidPasswords,
} from "../js/password-entropy.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DE ENTROPIA
   ========================================================= */

/* =========================================================
   01. CONFIGURAÇÕES AUXILIARES
   ========================================================= */

function createOptions(overrides = {}) {
  return {
    length: 8,
    uppercase: true,
    lowercase: false,
    numbers: false,
    symbols: false,
    excludeAmbiguous: false,
    ...overrides,
  };
}

/* =========================================================
   02. UMA ÚNICA CATEGORIA
   ========================================================= */

test("conta corretamente senhas usando apenas maiúsculas", () => {
  const options = createOptions({
    length: 8,
    uppercase: true,
  });

  const expected = 26n ** 8n;

  assert.equal(countValidPasswords(options), expected);
});

test("calcula corretamente a entropia de uma única categoria", () => {
  const options = createOptions({
    length: 8,
    uppercase: true,
  });

  const expected = 8 * Math.log2(26);

  const actual = calculateEntropy(options);

  assert.ok(Math.abs(actual - expected) < 1e-10);
});

/* =========================================================
   03. DUAS CATEGORIAS
   ========================================================= */

/*
  Uppercase + Numbers.

  Pool total:
      26 + 10 = 36

  Queremos strings que contenham pelo menos:
  - uma maiúscula;
  - um número.

  Inclusão-exclusão:

      válidas =
        36^L
        - 26^L
        - 10^L
*/

test("conta corretamente duas categorias com inclusão-exclusão", () => {
  const length = 8n;

  const options = createOptions({
    length: Number(length),
    uppercase: true,
    numbers: true,
  });

  const expected = 36n ** length - 26n ** length - 10n ** length;

  assert.equal(countValidPasswords(options), expected);
});

/* =========================================================
   04. TRÊS CATEGORIAS
   ========================================================= */

test("conta corretamente três categorias", () => {
  const length = 8n;

  const options = createOptions({
    length: Number(length),
    uppercase: true,
    lowercase: true,
    numbers: true,
  });

  /*
    Pool:
      26 + 26 + 10 = 62

    Inclusão-exclusão:

      todas
      - sem uppercase
      - sem lowercase
      - sem numbers
      + sem uppercase/lowercase
      + sem uppercase/numbers
      + sem lowercase/numbers
  */

  const expected =
    62n ** length -
    36n ** length -
    36n ** length -
    52n ** length +
    10n ** length +
    26n ** length +
    26n ** length;

  assert.equal(countValidPasswords(options), expected);
});

/* =========================================================
   05. QUATRO CATEGORIAS
   ========================================================= */

test("conta corretamente todas as categorias ativas", () => {
  const options = createOptions({
    length: 8,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const result = countValidPasswords(options);

  assert.ok(result > 0n);

  /*
    O espaço válido precisa ser menor que o
    espaço ingênuo de 90^8, porque descartamos
    strings que não contêm todas as categorias.
  */

  assert.ok(result < 90n ** 8n);
});

/* =========================================================
   06. EXCLUDE AMBIGUOUS
   ========================================================= */

test("exclude ambiguous reduz corretamente o conjunto de maiúsculas", () => {
  const options = createOptions({
    length: 8,
    uppercase: true,
    excludeAmbiguous: true,
  });

  /*
    Maiúsculas:
      26

    Removidos:
      I
      O

    Restam:
      24
  */

  const expected = 24n ** 8n;

  assert.equal(countValidPasswords(options), expected);
});

test("exclude ambiguous reduz corretamente o conjunto de minúsculas", () => {
  const options = createOptions({
    length: 8,
    uppercase: false,
    lowercase: true,
    excludeAmbiguous: true,
  });

  /*
    Minúsculas:
      26

    Removido:
      l

    Restam:
      25
  */

  const expected = 25n ** 8n;

  assert.equal(countValidPasswords(options), expected);
});

test("exclude ambiguous reduz corretamente o conjunto numérico", () => {
  const options = createOptions({
    length: 8,
    uppercase: false,
    numbers: true,
    excludeAmbiguous: true,
  });

  /*
    Números:
      10

    Removidos:
      1
      0

    Restam:
      8
  */

  const expected = 8n ** 8n;

  assert.equal(countValidPasswords(options), expected);
});

/* =========================================================
   07. CONFIGURAÇÕES INVÁLIDAS
   ========================================================= */

test("retorna zero quando nenhuma categoria está ativa", () => {
  const options = createOptions({
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false,
  });

  assert.equal(countValidPasswords(options), 0n);

  assert.equal(calculateEntropy(options), 0);
});

test("retorna zero quando o comprimento é menor que o número de categorias", () => {
  const options = createOptions({
    length: 3,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  assert.equal(countValidPasswords(options), 0n);

  assert.equal(calculateEntropy(options), 0);
});

test("rejeita opções ausentes", () => {
  assert.throws(() => {
    countValidPasswords();
  }, TypeError);
});

test("rejeita comprimento não positivo", () => {
  assert.throws(() => {
    countValidPasswords(
      createOptions({
        length: 0,
      }),
    );
  }, RangeError);
});

test("rejeita comprimento não inteiro", () => {
  assert.throws(() => {
    calculateEntropy(
      createOptions({
        length: 8.5,
      }),
    );
  }, RangeError);
});

/* =========================================================
   08. CONSISTÊNCIA ENTRE CONTAGEM E ENTROPIA
   ========================================================= */

test("calculateEntropy corresponde ao log2 do espaço válido", () => {
  const options = createOptions({
    length: 12,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const count = countValidPasswords(options);

  /*
    Este valor cabe dentro da precisão útil de Number
    para comparação aproximada de logaritmos.
  */

  const expected = Math.log2(Number(count));

  const actual = calculateEntropy(options);

  assert.ok(Math.abs(actual - expected) < 1e-10);
});

/* =========================================================
   09. PROPRIEDADES DO ESPAÇO
   ========================================================= */

test("a entropia aumenta quando o comprimento aumenta", () => {
  const shortEntropy = calculateEntropy(
    createOptions({
      length: 8,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    }),
  );

  const longEntropy = calculateEntropy(
    createOptions({
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    }),
  );

  assert.ok(longEntropy > shortEntropy);
});

test("exclude ambiguous reduz a entropia", () => {
  const regularEntropy = calculateEntropy(
    createOptions({
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
    }),
  );

  const reducedEntropy = calculateEntropy(
    createOptions({
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true,
    }),
  );

  assert.ok(reducedEntropy < regularEntropy);
});

test("ativar mais categorias aumenta o espaço em comprimentos adequados", () => {
  const uppercaseOnly = calculateEntropy(
    createOptions({
      length: 24,
      uppercase: true,
    }),
  );

  const allCategories = calculateEntropy(
    createOptions({
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    }),
  );

  assert.ok(allCategories > uppercaseOnly);
});

/* =========================================================
   10. CASO REAL DO PROJETO
   ========================================================= */

test("default de 24 caracteres possui entropia positiva e inferior ao limite ingênuo", () => {
  const options = createOptions({
    length: 24,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });

  const entropy = calculateEntropy(options);

  const naiveEntropy = 24 * Math.log2(90);

  assert.ok(entropy > 0);

  /*
    Como exigimos pelo menos um caractere de cada
    categoria, o espaço válido é subconjunto de 90^24.
  */

  assert.ok(entropy < naiveEntropy);
});