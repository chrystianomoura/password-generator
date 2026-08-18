"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import { generatePassword, PASSWORD_LIMITS } from "../js/password-generator.js";

import {
  CHARACTER_SETS,
  AMBIGUOUS_CHARACTERS,
} from "../js/password-character-sets.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DO MOTOR
   ---------------------------------------------------------
   Este arquivo verifica:

   - limites de comprimento;
   - presença das categorias selecionadas;
   - exclusão de caracteres ambíguos;
   - validação das opções;
   - respeito ao pool permitido;
   - variação entre gerações;
   - falha segura sem CSPRNG.

   Os testes validam o contrato público do gerador sem
   depender da implementação interna.
   ========================================================= */

/* =========================================================
   01. CONFIGURAÇÃO BASE
   ========================================================= */

const DEFAULT_OPTIONS = Object.freeze({
  length: 24,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
});

const ITERATIONS = Object.freeze({
  categoryChecks: 1000,
  ambiguousChecks: 5000,
  allowedCharacters: 5000,
  uniqueness: 1000,
});

/* =========================================================
   02. UTILITÁRIOS
   ========================================================= */

function createOptions(overrides = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...overrides,
  };
}

function passwordContainsCharacterFrom(password, characterSet) {
  return [...password].some((character) => characterSet.includes(character));
}

function getCompleteCharacterPool() {
  return Object.values(CHARACTER_SETS).join("");
}

/* =========================================================
   03. COMPRIMENTO
   ========================================================= */

test("gera senha com o comprimento solicitado", () => {
  const password = generatePassword(DEFAULT_OPTIONS);

  assert.equal(password.length, DEFAULT_OPTIONS.length);
});

test("aceita o comprimento mínimo", () => {
  const password = generatePassword(
    createOptions({
      length: PASSWORD_LIMITS.minimum,
    }),
  );

  assert.equal(password.length, PASSWORD_LIMITS.minimum);
});

test("aceita o comprimento máximo", () => {
  const password = generatePassword(
    createOptions({
      length: PASSWORD_LIMITS.maximum,
    }),
  );

  assert.equal(password.length, PASSWORD_LIMITS.maximum);
});

test("rejeita comprimento abaixo do mínimo", () => {
  assert.throws(() => {
    generatePassword(
      createOptions({
        length: PASSWORD_LIMITS.minimum - 1,
      }),
    );
  }, RangeError);
});

test("rejeita comprimento acima do máximo", () => {
  assert.throws(() => {
    generatePassword(
      createOptions({
        length: PASSWORD_LIMITS.maximum + 1,
      }),
    );
  }, RangeError);
});

/* =========================================================
   04. CATEGORIAS INDIVIDUAIS
   ---------------------------------------------------------
   Quando apenas uma categoria está ativa, todos os
   caracteres gerados precisam pertencer a ela.

   Além de verificar a presença da categoria, isso também
   confirma que nenhuma categoria desabilitada aparece.
   ========================================================= */

test("gera somente letras maiúsculas quando apenas uppercase está ativo", () => {
  const options = createOptions({
    uppercase: true,
    lowercase: false,
    numbers: false,
    symbols: false,
  });

  for (let index = 0; index < ITERATIONS.categoryChecks; index += 1) {
    const password = generatePassword(options);

    assert.match(password, /^[A-Z]+$/);
  }
});

test("gera somente letras minúsculas quando apenas lowercase está ativo", () => {
  const options = createOptions({
    uppercase: false,
    lowercase: true,
    numbers: false,
    symbols: false,
  });

  for (let index = 0; index < ITERATIONS.categoryChecks; index += 1) {
    const password = generatePassword(options);

    assert.match(password, /^[a-z]+$/);
  }
});

test("gera somente números quando apenas numbers está ativo", () => {
  const options = createOptions({
    uppercase: false,
    lowercase: false,
    numbers: true,
    symbols: false,
  });

  for (let index = 0; index < ITERATIONS.categoryChecks; index += 1) {
    const password = generatePassword(options);

    assert.match(password, /^[0-9]+$/);
  }
});

test("gera somente símbolos quando apenas symbols está ativo", () => {
  const options = createOptions({
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: true,
  });

  for (let index = 0; index < ITERATIONS.categoryChecks; index += 1) {
    const password = generatePassword(options);

    for (const character of password) {
      assert.equal(CHARACTER_SETS.symbols.includes(character), true);
    }
  }
});

/* =========================================================
   05. COMBINAÇÃO DE CATEGORIAS
   ========================================================= */

test("garante todas as categorias selecionadas", () => {
  for (let index = 0; index < ITERATIONS.categoryChecks; index += 1) {
    const password = generatePassword(DEFAULT_OPTIONS);

    assert.equal(
      passwordContainsCharacterFrom(password, CHARACTER_SETS.uppercase),
      true,
    );

    assert.equal(
      passwordContainsCharacterFrom(password, CHARACTER_SETS.lowercase),
      true,
    );

    assert.equal(
      passwordContainsCharacterFrom(password, CHARACTER_SETS.numbers),
      true,
    );

    assert.equal(
      passwordContainsCharacterFrom(password, CHARACTER_SETS.symbols),
      true,
    );
  }
});

/* =========================================================
   06. EXCLUSÃO DE CARACTERES AMBÍGUOS
   ========================================================= */

test("remove caracteres ambíguos quando solicitado", () => {
  const options = createOptions({
    excludeAmbiguous: true,
  });

  for (let index = 0; index < ITERATIONS.ambiguousChecks; index += 1) {
    const password = generatePassword(options);

    for (const character of AMBIGUOUS_CHARACTERS) {
      assert.equal(password.includes(character), false);
    }
  }
});

/* =========================================================
   07. CONFIGURAÇÕES INVÁLIDAS
   ========================================================= */

test("rejeita geração sem categorias ativas", () => {
  assert.throws(
    () => {
      generatePassword(
        createOptions({
          uppercase: false,
          lowercase: false,
          numbers: false,
          symbols: false,
        }),
      );
    },
    {
      message: "At least one character category must be enabled.",
    },
  );
});

test("rejeita comprimento não inteiro", () => {
  assert.throws(() => {
    generatePassword(
      createOptions({
        length: 24.5,
      }),
    );
  }, RangeError);
});

test("rejeita comprimento que não seja safe integer", () => {
  assert.throws(() => {
    generatePassword(
      createOptions({
        length: Number.MAX_SAFE_INTEGER + 1,
      }),
    );
  }, RangeError);
});

test("rejeita configuração sem objeto", () => {
  assert.throws(() => {
    generatePassword();
  }, TypeError);
});

test("rejeita propriedades booleanas inválidas", () => {
  const booleanOptions = [
    "uppercase",
    "lowercase",
    "numbers",
    "symbols",
    "excludeAmbiguous",
  ];

  for (const optionName of booleanOptions) {
    assert.throws(() => {
      generatePassword(
        createOptions({
          [optionName]: "true",
        }),
      );
    }, TypeError);
  }
});

/* =========================================================
   08. CARACTERES PERMITIDOS
   ========================================================= */

test("não gera caracteres fora do conjunto permitido", () => {
  const allowedCharacters = getCompleteCharacterPool();

  for (let index = 0; index < ITERATIONS.allowedCharacters; index += 1) {
    const password = generatePassword(DEFAULT_OPTIONS);

    for (const character of password) {
      assert.equal(
        allowedCharacters.includes(character),
        true,
        `Caractere inesperado encontrado: ${character}`,
      );
    }
  }
});

/* =========================================================
   09. VARIAÇÃO DAS SENHAS
   ---------------------------------------------------------
   Este teste não tenta provar aleatoriedade estatística.

   Ele apenas protege contra regressões óbvias, como uma
   implementação que passe a devolver sempre o mesmo valor.
   ========================================================= */

test("gera senhas diferentes em chamadas sucessivas", () => {
  const passwords = new Set();

  for (let index = 0; index < ITERATIONS.uniqueness; index += 1) {
    passwords.add(generatePassword(DEFAULT_OPTIONS));
  }

  assert.equal(passwords.size, ITERATIONS.uniqueness);
});

/* =========================================================
   10. INDISPONIBILIDADE DO CSPRNG
   ---------------------------------------------------------
   Segurança tem prioridade sobre disponibilidade.

   Se crypto.getRandomValues() não existir, o gerador deve
   falhar em vez de recorrer a Math.random().
   ========================================================= */

test("falha com segurança quando crypto.getRandomValues não está disponível", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "crypto",
  );

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: undefined,
  });

  try {
    assert.throws(
      () => {
        generatePassword(DEFAULT_OPTIONS);
      },
      {
        message: "Cryptographically secure randomness is unavailable.",
      },
    );
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalDescriptor);
    } else {
      delete globalThis.crypto;
    }
  }
});