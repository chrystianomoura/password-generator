"use strict";

/* =========================================================
   PASSWORD GENERATOR — MOTOR DE GERAÇÃO
   ---------------------------------------------------------
   Responsabilidade única:
   gerar senhas criptograficamente seguras a partir
   das configurações recebidas.

   Este módulo:
   - não acessa o DOM;
   - não armazena senhas;
   - não realiza requisições;
   - não utiliza Math.random().
   ========================================================= */

/* =========================================================
   01. CONJUNTOS DE CARACTERES
   ========================================================= */

const CHARACTER_SETS = Object.freeze({
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
});

/*
  Caracteres visualmente parecidos que podem causar
  confusão durante leitura ou digitação manual.
*/

const AMBIGUOUS_CHARACTERS = new Set([
  "I",
  "l",
  "1",
  "O",
  "0",
]);

/* =========================================================
   02. LIMITES
   ========================================================= */

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

const UINT32_RANGE = 0x100000000;

/* =========================================================
   03. ALEATORIEDADE CRIPTOGRÁFICA
   ========================================================= */

/*
  Retorna um inteiro aleatório no intervalo:

  0 <= resultado < maximum

  Não utilizamos simplesmente:

  randomValue % maximum

  porque isso pode introduzir modulo bias quando o tamanho
  do intervalo não divide exatamente o espaço do Uint32.

  Rejection sampling descarta a pequena região excedente
  antes de aplicar o módulo.
*/

function getSecureRandomInteger(maximum) {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) {
    throw new RangeError(
      "Maximum must be a positive safe integer.",
    );
  }

  if (maximum > UINT32_RANGE) {
    throw new RangeError(
      "Maximum exceeds the supported random range.",
    );
  }

  if (
    typeof globalThis.crypto === "undefined" ||
    typeof globalThis.crypto.getRandomValues !== "function"
  ) {
    throw new Error(
      "Cryptographically secure randomness is unavailable.",
    );
  }

  const randomBuffer = new Uint32Array(1);

  const rejectionLimit =
    UINT32_RANGE -
    (UINT32_RANGE % maximum);

  let randomValue;

  do {
    globalThis.crypto.getRandomValues(randomBuffer);
    randomValue = randomBuffer[0];
  } while (randomValue >= rejectionLimit);

  return randomValue % maximum;
}

/* =========================================================
   04. FILTRAGEM DE CARACTERES
   ========================================================= */

function removeAmbiguousCharacters(characterSet) {
  return [...characterSet]
    .filter(
      (character) =>
        !AMBIGUOUS_CHARACTERS.has(character),
    )
    .join("");
}

/* =========================================================
   05. CONSTRUÇÃO DOS CONJUNTOS ATIVOS
   ========================================================= */

function buildActiveCharacterSets(options) {
  const activeSets = [];

  const addCharacterSet = (enabled, characterSet) => {
    if (!enabled) {
      return;
    }

    const finalSet = options.excludeAmbiguous
      ? removeAmbiguousCharacters(characterSet)
      : characterSet;

    if (finalSet.length === 0) {
      throw new Error(
        "An enabled character set cannot be empty.",
      );
    }

    activeSets.push(finalSet);
  };

  addCharacterSet(
    options.uppercase,
    CHARACTER_SETS.uppercase,
  );

  addCharacterSet(
    options.lowercase,
    CHARACTER_SETS.lowercase,
  );

  addCharacterSet(
    options.numbers,
    CHARACTER_SETS.numbers,
  );

  addCharacterSet(
    options.symbols,
    CHARACTER_SETS.symbols,
  );

  return activeSets;
}

/* =========================================================
   06. VALIDAÇÃO
   ========================================================= */

function validateOptions(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError(
      "Password options must be provided.",
    );
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
      throw new TypeError(
        `${option} must be a boolean.`,
      );
    }
  }
}

/* =========================================================
   07. SELEÇÃO SEGURA DE CARACTERES
   ========================================================= */

function getSecureRandomCharacter(characterSet) {
  if (
    typeof characterSet !== "string" ||
    characterSet.length === 0
  ) {
    throw new Error(
      "Cannot select from an empty character set.",
    );
  }

  const index = getSecureRandomInteger(
    characterSet.length,
  );

  return characterSet[index];
}

/* =========================================================
   08. EMBARALHAMENTO SEGURO
   ========================================================= */

/*
  Fisher-Yates utilizando nossa fonte criptográfica.

  Isso é importante porque inicialmente inserimos um
  caractere obrigatório de cada categoria ativa.

  O embaralhamento remove a posição previsível desses
  caracteres.
*/

function secureShuffle(characters) {
  for (
    let index = characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      getSecureRandomInteger(index + 1);

    [
      characters[index],
      characters[randomIndex],
    ] = [
      characters[randomIndex],
      characters[index],
    ];
  }

  return characters;
}

/* =========================================================
   09. GERAÇÃO DA SENHA
   ========================================================= */

export function generatePassword(options) {
  validateOptions(options);

  const activeSets =
    buildActiveCharacterSets(options);

  if (activeSets.length === 0) {
    throw new Error(
      "At least one character category must be enabled.",
    );
  }

  if (options.length < activeSets.length) {
    throw new Error(
      "Password length is too short for the selected categories.",
    );
  }

  const completePool = activeSets.join("");

  const passwordCharacters = [];

  /*
    Primeiro garantimos pelo menos um caractere
    de cada categoria selecionada.
  */

  for (const characterSet of activeSets) {
    passwordCharacters.push(
      getSecureRandomCharacter(characterSet),
    );
  }

  /*
    Depois completamos o comprimento utilizando
    todo o conjunto permitido.
  */

  while (
    passwordCharacters.length < options.length
  ) {
    passwordCharacters.push(
      getSecureRandomCharacter(completePool),
    );
  }

  /*
    Finalmente embaralhamos todas as posições
    usando Fisher-Yates + CSPRNG.
  */

  secureShuffle(passwordCharacters);

  return passwordCharacters.join("");
}

/* =========================================================
   10. METADADOS PÚBLICOS
   ========================================================= */

export const PASSWORD_LIMITS = Object.freeze({
  minimum: MIN_LENGTH,
  maximum: MAX_LENGTH,
});