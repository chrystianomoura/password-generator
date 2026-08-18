"use strict";

import { getActiveCharacterSets } from "./password-character-sets.js";

/* =========================================================
   PASSWORD GENERATOR — MOTOR DE GERAÇÃO
   ---------------------------------------------------------
   Responsabilidade única:
   gerar senhas criptograficamente seguras a partir
   das configurações recebidas.

   Estratégia:
   - cada posição é escolhida uniformemente do pool;
   - usamos CSPRNG;
   - eliminamos modulo bias;
   - rejeitamos senhas que não contenham todas as
     categorias selecionadas.

   Como todas as strings do pool possuem inicialmente
   a mesma probabilidade e a rejeição depende apenas
   de sua validade, todas as senhas aceitas permanecem
   equiprováveis dentro do conjunto válido.

   Este módulo:
   - não acessa o DOM;
   - não armazena senhas;
   - não realiza requisições;
   - não utiliza Math.random().
   ========================================================= */

/* =========================================================
   01. LIMITES
   ========================================================= */

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

const UINT32_RANGE = 0x100000000;

/* =========================================================
   02. VALIDAÇÃO DAS OPÇÕES
   ========================================================= */

function validateOptions(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("Password options must be provided.");
  }

  if (
    !Number.isSafeInteger(options.length) ||
    options.length < MIN_LENGTH ||
    options.length > MAX_LENGTH
  ) {
    throw new RangeError(
      `Password length must be between ${MIN_LENGTH} and ${MAX_LENGTH}.`,
    );
  }

  const booleanOptions = [
    "uppercase",
    "lowercase",
    "numbers",
    "symbols",
    "excludeAmbiguous",
  ];

  for (const option of booleanOptions) {
    if (typeof options[option] !== "boolean") {
      throw new TypeError(`${option} must be a boolean.`);
    }
  }
}

/* =========================================================
   03. ALEATORIEDADE CRIPTOGRÁFICA
   ========================================================= */

/*
  Retorna um inteiro uniforme no intervalo:

      0 <= resultado < maximum

  Um simples:

      randomValue % maximum

  pode criar modulo bias quando maximum não divide
  exatamente o espaço de valores de Uint32.

  Por isso descartamos a região excedente antes
  da operação de módulo.
*/

function getSecureRandomInteger(maximum) {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) {
    throw new RangeError("Maximum must be a positive safe integer.");
  }

  if (maximum > UINT32_RANGE) {
    throw new RangeError("Maximum exceeds the supported random range.");
  }

  if (
    typeof globalThis.crypto === "undefined" ||
    typeof globalThis.crypto.getRandomValues !== "function"
  ) {
    throw new Error("Cryptographically secure randomness is unavailable.");
  }

  const randomBuffer = new Uint32Array(1);

  const rejectionLimit = UINT32_RANGE - (UINT32_RANGE % maximum);

  let randomValue;

  do {
    globalThis.crypto.getRandomValues(randomBuffer);

    randomValue = randomBuffer[0];
  } while (randomValue >= rejectionLimit);

  return randomValue % maximum;
}

/* =========================================================
   04. SELEÇÃO SEGURA DE CARACTER
   ========================================================= */

function getSecureRandomCharacter(characterSet) {
  if (typeof characterSet !== "string" || characterSet.length === 0) {
    throw new Error("Cannot select from an empty character set.");
  }

  const index = getSecureRandomInteger(characterSet.length);

  return characterSet[index];
}

/* =========================================================
   05. CONSTRUÇÃO DE UMA TENTATIVA
   ========================================================= */

/*
  Todas as posições são escolhidas do mesmo pool completo.

  Portanto, antes da filtragem por categorias obrigatórias,
  cada string possível de determinado comprimento possui
  exatamente a mesma probabilidade.
*/

function generateCandidate(length, completePool) {
  const characters = [];

  for (let index = 0; index < length; index += 1) {
    characters.push(getSecureRandomCharacter(completePool));
  }

  return characters.join("");
}

/* =========================================================
   06. VALIDAÇÃO DA TENTATIVA
   ========================================================= */

/*
  Uma senha só é aceita se possuir pelo menos um
  caractere pertencente a cada categoria ativa.
*/

function containsAllActiveSets(password, activeSets) {
  return activeSets.every(({ characters }) =>
    [...password].some((character) => characters.includes(character)),
  );
}

/* =========================================================
   07. GERAÇÃO DA SENHA
   ========================================================= */

export function generatePassword(options) {
  validateOptions(options);

  const activeSets = getActiveCharacterSets(options);

  if (activeSets.length === 0) {
    throw new Error("At least one character category must be enabled.");
  }

  if (options.length < activeSets.length) {
    throw new Error(
      "Password length is too short for the selected categories.",
    );
  }

  const completePool = activeSets.map(({ characters }) => characters).join("");

  /*
    Rejection sampling sobre strings completas.

    Toda tentativa é uniforme no espaço completePool^length.

    Rejeitar apenas as strings que não satisfazem as
    categorias mantém distribuição uniforme entre todas
    as senhas válidas restantes.
  */

  while (true) {
    const candidate = generateCandidate(options.length, completePool);

    if (containsAllActiveSets(candidate, activeSets)) {
      return candidate;
    }
  }
}

/* =========================================================
   08. METADADOS PÚBLICOS
   ========================================================= */

export const PASSWORD_LIMITS = Object.freeze({
  minimum: MIN_LENGTH,
  maximum: MAX_LENGTH,
});