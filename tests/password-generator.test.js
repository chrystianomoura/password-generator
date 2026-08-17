"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import { generatePassword, PASSWORD_LIMITS } from "../js/password-generator.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES
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

const AMBIGUOUS_CHARACTERS = ["I", "l", "1", "O", "0"];

/* =========================================================
   02. COMPRIMENTO
   ========================================================= */

test("gera senha com o comprimento solicitado", () => {
  const password = generatePassword(DEFAULT_OPTIONS);

  assert.equal(password.length, 24);
});

test("aceita o comprimento mínimo", () => {
  const password = generatePassword({
    ...DEFAULT_OPTIONS,
    length: PASSWORD_LIMITS.minimum,
  });

  assert.equal(password.length, PASSWORD_LIMITS.minimum);
});

test("aceita o comprimento máximo", () => {
  const password = generatePassword({
    ...DEFAULT_OPTIONS,
    length: PASSWORD_LIMITS.maximum,
  });

  assert.equal(password.length, PASSWORD_LIMITS.maximum);
});

test("rejeita comprimento abaixo do mínimo", () => {
  assert.throws(() => {
    generatePassword({
      ...DEFAULT_OPTIONS,
      length: PASSWORD_LIMITS.minimum - 1,
    });
  }, RangeError);
});

test("rejeita comprimento acima do máximo", () => {
  assert.throws(() => {
    generatePassword({
      ...DEFAULT_OPTIONS,
      length: PASSWORD_LIMITS.maximum + 1,
    });
  }, RangeError);
});

/* =========================================================
   03. CATEGORIAS
   ========================================================= */

test("garante pelo menos uma letra maiúscula", () => {
  for (let index = 0; index < 1000; index += 1) {
    const password = generatePassword({
      ...DEFAULT_OPTIONS,
      uppercase: true,
      lowercase: false,
      numbers: false,
      symbols: false,
    });

    assert.match(password, /[A-Z]/);
  }
});

test("garante pelo menos uma letra minúscula", () => {
  for (let index = 0; index < 1000; index += 1) {
    const password = generatePassword({
      ...DEFAULT_OPTIONS,
      uppercase: false,
      lowercase: true,
      numbers: false,
      symbols: false,
    });

    assert.match(password, /[a-z]/);
  }
});

test("garante pelo menos um número", () => {
  for (let index = 0; index < 1000; index += 1) {
    const password = generatePassword({
      ...DEFAULT_OPTIONS,
      uppercase: false,
      lowercase: false,
      numbers: true,
      symbols: false,
    });

    assert.match(password, /[0-9]/);
  }
});

test("garante pelo menos um símbolo", () => {
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  for (let index = 0; index < 1000; index += 1) {
    const password = generatePassword({
      ...DEFAULT_OPTIONS,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: true,
    });

    assert.ok([...password].some((character) => symbols.includes(character)));
  }
});

/* =========================================================
   04. COMBINAÇÃO DE CATEGORIAS
   ========================================================= */

test("garante todas as categorias selecionadas", () => {
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  for (let index = 0; index < 1000; index += 1) {
    const password = generatePassword(DEFAULT_OPTIONS);

    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /[0-9]/);

    assert.ok([...password].some((character) => symbols.includes(character)));
  }
});

/* =========================================================
   05. EXCLUSÃO DE CARACTERES AMBÍGUOS
   ========================================================= */

test("remove caracteres ambíguos quando solicitado", () => {
  for (let index = 0; index < 5000; index += 1) {
    const password = generatePassword({
      ...DEFAULT_OPTIONS,
      excludeAmbiguous: true,
    });

    for (const character of AMBIGUOUS_CHARACTERS) {
      assert.equal(password.includes(character), false);
    }
  }
});

/* =========================================================
   06. CONFIGURAÇÕES INVÁLIDAS
   ========================================================= */

test("rejeita geração sem categorias ativas", () => {
  assert.throws(
    () => {
      generatePassword({
        ...DEFAULT_OPTIONS,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
      });
    },
    {
      message: "At least one character category must be enabled.",
    },
  );
});

test("rejeita comprimento não inteiro", () => {
  assert.throws(() => {
    generatePassword({
      ...DEFAULT_OPTIONS,
      length: 24.5,
    });
  }, RangeError);
});

test("rejeita configuração sem objeto", () => {
  assert.throws(() => {
    generatePassword();
  }, TypeError);
});

test("rejeita propriedades booleanas inválidas", () => {
  assert.throws(() => {
    generatePassword({
      ...DEFAULT_OPTIONS,
      uppercase: "true",
    });
  }, TypeError);
});

/* =========================================================
   07. CARACTERES PERMITIDOS
   ========================================================= */

test("não gera caracteres fora do conjunto permitido", () => {
  const allowedCharacters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "0123456789" +
    "!@#$%^&*()_+-=[]{}|;:,.<>?";

  for (let index = 0; index < 5000; index += 1) {
    const password = generatePassword(DEFAULT_OPTIONS);

    for (const character of password) {
      assert.ok(
        allowedCharacters.includes(character),
        `Caractere inesperado encontrado: ${character}`,
      );
    }
  }
});

/* =========================================================
   08. VARIAÇÃO DAS SENHAS
   ========================================================= */

test("gera senhas diferentes em chamadas sucessivas", () => {
  const passwords = new Set();

  for (let index = 0; index < 1000; index += 1) {
    passwords.add(generatePassword(DEFAULT_OPTIONS));
  }

  assert.equal(passwords.size, 1000);
});