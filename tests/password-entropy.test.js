"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateEntropy,
  countValidPasswords,
} from "../js/password-entropy.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DE ENTROPIA
   ---------------------------------------------------------
   Este arquivo verifica:

   - contagem exata do espaço válido;
   - aplicação do princípio de inclusão-exclusão;
   - impacto de excludeAmbiguous;
   - validação das entradas;
   - coerência entre contagem e entropia;
   - propriedades esperadas do espaço de senhas.

   O objetivo não é testar apenas exemplos isolados, mas
   também propriedades matemáticas importantes do módulo.
   ========================================================= */

/* =========================================================
   01. CONFIGURAÇÃO BASE
   ---------------------------------------------------------
   createOptions() fornece uma configuração válida mínima.

   Cada teste sobrescreve apenas os campos necessários,
   deixando o cenário mais fácil de ler.
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
   02. UTILITÁRIO DE COMPARAÇÃO
   ---------------------------------------------------------
   Entropia é representada como Number.

   Para comparações envolvendo ponto flutuante utilizamos
   tolerância, em vez de exigir igualdade exata.
   ========================================================= */

function assertApproximatelyEqual(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}.`,
  );
}

/* =========================================================
   03. UMA ÚNICA CATEGORIA
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

  assertApproximatelyEqual(actual, expected);
});

/* =========================================================
   04. DUAS CATEGORIAS
   ---------------------------------------------------------
   Uppercase + Numbers

   Pool total:
       26 + 10 = 36

   Queremos apenas strings que contenham pelo menos:
   - uma maiúscula;
   - um número.

   Inclusão-exclusão:

       válidas =
         36^L
         - 26^L
         - 10^L
   ========================================================= */

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
   05. TRÊS CATEGORIAS
   ---------------------------------------------------------
   Uppercase + Lowercase + Numbers

   Pool:
       26 + 26 + 10 = 62

   Inclusão-exclusão exige:
   - subtrair cada categoria ausente;
   - somar novamente as interseções de duas ausências.
   ========================================================= */

test("conta corretamente três categorias", () => {
  const length = 8n;

  const options = createOptions({
    length: Number(length),
    uppercase: true,
    lowercase: true,
    numbers: true,
  });

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
   06. QUATRO CATEGORIAS
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
      O pool completo possui 90 caracteres:

      26 uppercase
      26 lowercase
      10 numbers
      28 symbols

      Como exigimos pelo menos um caractere de cada categoria,
      o espaço válido precisa ser menor que 90^8.
    */

  assert.ok(result < 90n ** 8n);
});

/* =========================================================
   07. EXCLUDE AMBIGUOUS
   ========================================================= */

test("exclude ambiguous reduz corretamente o conjunto de maiúsculas", () => {
  const options = createOptions({
    length: 8,
    uppercase: true,
    excludeAmbiguous: true,
  });

  /*
      Maiúsculas: 26

      Removidos:
      I
      O

      Restam: 24
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
      Minúsculas: 26

      Removido:
      l

      Restam: 25
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
      Números: 10

      Removidos:
      1
      0

      Restam: 8
    */

  const expected = 8n ** 8n;

  assert.equal(countValidPasswords(options), expected);
});

/* =========================================================
   08. CONFIGURAÇÕES SEM ESPAÇO VÁLIDO
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

/* =========================================================
   09. VALIDAÇÃO
   ========================================================= */

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

test("rejeita comprimento negativo", () => {
  assert.throws(() => {
    countValidPasswords(
      createOptions({
        length: -1,
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

test("rejeita comprimento que não seja safe integer", () => {
  assert.throws(() => {
    countValidPasswords(
      createOptions({
        length: Number.MAX_SAFE_INTEGER + 1,
      }),
    );
  }, RangeError);
});

/* =========================================================
   10. CONSISTÊNCIA ENTRE CONTAGEM E ENTROPIA
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
      Para este caso a conversão para Number ainda é
      adequada para uma comparação aproximada do logaritmo.
    */

  const expected = Math.log2(Number(count));

  const actual = calculateEntropy(options);

  assertApproximatelyEqual(actual, expected);
});

/* =========================================================
   11. PROPRIEDADES DO ESPAÇO
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
   12. BIGINT / COMPRIMENTOS GRANDES
   ---------------------------------------------------------
   Este teste garante que o cálculo continue finito mesmo
   quando a quantidade de combinações ultrapassa amplamente
   a precisão inteira de Number.
   ========================================================= */

test("calcula entropia finita para espaços muito grandes", () => {
  const entropy = calculateEntropy(
    createOptions({
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    }),
  );

  assert.equal(Number.isFinite(entropy), true);

  assert.ok(entropy > 0);
});

/* =========================================================
   13. CASO REAL DO PROJETO
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