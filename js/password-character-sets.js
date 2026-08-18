"use strict";

/* =========================================================
   PASSWORD GENERATOR — CONJUNTOS DE CARACTERES
   ---------------------------------------------------------
   Fonte única de verdade para os caracteres utilizados
   pelo gerador e pelos módulos de análise.

   Este módulo:
   - não acessa o DOM;
   - não gera senhas;
   - não realiza cálculos de entropia;
   - não possui estado mutável.
   ========================================================= */

/* =========================================================
   01. CONJUNTOS BASE
   ========================================================= */

export const CHARACTER_SETS = Object.freeze({
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
});

/* =========================================================
   02. CARACTERES AMBÍGUOS
   ========================================================= */

export const AMBIGUOUS_CHARACTERS = Object.freeze(["I", "l", "1", "O", "0"]);

const AMBIGUOUS_CHARACTER_SET = new Set(AMBIGUOUS_CHARACTERS);

/* =========================================================
   03. FILTRAGEM
   ========================================================= */

function removeAmbiguousCharacters(characterSet) {
  return [...characterSet]
    .filter((character) => !AMBIGUOUS_CHARACTER_SET.has(character))
    .join("");
}

/* =========================================================
   04. CONJUNTOS ATIVOS
   ========================================================= */

/*
  Retorna os conjuntos realmente disponíveis para a
  configuração recebida.

  Cada item preserva:
  - nome da categoria;
  - caracteres efetivamente permitidos.
*/

export function getActiveCharacterSets(options) {
  const activeSets = [];

  const addCharacterSet = (name, enabled) => {
    if (!enabled) {
      return;
    }

    const baseSet = CHARACTER_SETS[name];

    const characters = options.excludeAmbiguous
      ? removeAmbiguousCharacters(baseSet)
      : baseSet;

    if (characters.length === 0) {
      throw new Error(`Character set "${name}" cannot be empty.`);
    }

    activeSets.push(
      Object.freeze({
        name,
        characters,
      }),
    );
  };

  addCharacterSet("uppercase", options.uppercase);

  addCharacterSet("lowercase", options.lowercase);

  addCharacterSet("numbers", options.numbers);

  addCharacterSet("symbols", options.symbols);

  return activeSets;
}