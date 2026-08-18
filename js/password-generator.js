"use strict";

import { getActiveCharacterSets } from "./password-character-sets.js";

/* =========================================================
   PASSWORD GENERATOR — MOTOR DE GERAÇÃO
   ---------------------------------------------------------
   Responsabilidade única:
   gerar senhas criptograficamente seguras a partir das
   configurações recebidas.

   Estratégia:
   1. constrói o pool das categorias selecionadas;
   2. escolhe cada posição com CSPRNG;
   3. elimina modulo bias na seleção dos índices;
   4. rejeita candidatos que não contenham pelo menos um
      caractere de cada categoria ativa.

   Como cada string do pool possui inicialmente a mesma
   probabilidade e a rejeição depende apenas de sua validade,
   todas as senhas aceitas permanecem equiprováveis dentro
   do conjunto de resultados válidos.

   Este módulo:
   - não acessa o DOM;
   - não armazena senhas;
   - não realiza requisições;
   - não utiliza Math.random();
   - não calcula entropia;
   - não conhece a interface.
   ========================================================= */

/* =========================================================
   01. LIMITES
   ---------------------------------------------------------
   Os limites pertencem ao domínio do gerador.

   Eles também são exportados ao final do módulo para que
   outras partes da aplicação possam consultar a mesma fonte
   de verdade sem duplicar esses valores.
   ========================================================= */

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

/*
  Uint32 possui 2^32 resultados possíveis:

      0 até 4.294.967.295

  UINT32_RANGE representa a quantidade total de valores,
  portanto seu valor é 2^32.
*/

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

  /*
    Todas as opções abaixo fazem parte do contrato público
    do gerador.

    Exigir booleanos reais evita coerções implícitas como:

      "false" -> true
      1       -> true
      0       -> false
  */

  const booleanOptions = [
    "uppercase",
    "lowercase",
    "numbers",
    "symbols",
    "excludeAmbiguous",
  ];

  for (const optionName of booleanOptions) {
    if (typeof options[optionName] !== "boolean") {
      throw new TypeError(`${optionName} must be a boolean.`);
    }
  }
}

/* =========================================================
   03. ALEATORIEDADE CRIPTOGRÁFICA
   ---------------------------------------------------------
   Retorna um inteiro uniforme no intervalo:

       0 <= resultado < maximum

   A função utiliza crypto.getRandomValues(), fornecido pelo
   ambiente, em vez de Math.random().

   Math.random() não é apropriado para geração de senhas
   porque não foi projetado como fonte criptograficamente
   segura de aleatoriedade.
   ========================================================= */

function getSecureRandomInteger(maximum) {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) {
    throw new RangeError("Maximum must be a positive safe integer.");
  }

  /*
    A fonte utilizada abaixo produz valores Uint32.

    Portanto, esta implementação suporta no máximo todo o
    espaço representável por um Uint32.
  */

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

  /*
    MODULO BIAS
    ---------------------------------------------------------
    Usar diretamente:

        randomValue % maximum

    só produz uma distribuição perfeitamente uniforme quando
    maximum divide exatamente 2^32.

    Caso contrário, alguns restos aparecem uma vez a mais que
    outros dentro do espaço possível de Uint32.

    Para evitar isso, encontramos o maior múltiplo de maximum
    que ainda cabe no intervalo Uint32 e descartamos qualquer
    valor pertencente à região excedente.
  */

  const rejectionLimit = UINT32_RANGE - (UINT32_RANGE % maximum);

  let randomValue;

  do {
    globalThis.crypto.getRandomValues(randomBuffer);

    randomValue = randomBuffer[0];
  } while (randomValue >= rejectionLimit);

  return randomValue % maximum;
}

/* =========================================================
   04. SELEÇÃO SEGURA DE CARACTERE
   ---------------------------------------------------------
   Escolhe uniformemente um caractere dentro do conjunto
   recebido utilizando o índice criptograficamente aleatório
   produzido pela função anterior.
   ========================================================= */

function getSecureRandomCharacter(characterSet) {
  if (typeof characterSet !== "string" || characterSet.length === 0) {
    throw new Error("Cannot select from an empty character set.");
  }

  const index = getSecureRandomInteger(characterSet.length);

  return characterSet[index];
}

/* =========================================================
   05. CONSTRUÇÃO DE UM CANDIDATO
   ---------------------------------------------------------
   Todas as posições são escolhidas independentemente do
   mesmo pool completo.

   Antes da filtragem pelas categorias obrigatórias, cada
   string possível com esse comprimento possui exatamente
   a mesma probabilidade de ser produzida.
   ========================================================= */

function generateCandidate(length, completePool) {
  const characters = [];

  for (let index = 0; index < length; index += 1) {
    characters.push(getSecureRandomCharacter(completePool));
  }

  return characters.join("");
}

/* =========================================================
   06. VALIDAÇÃO DO CANDIDATO
   ---------------------------------------------------------
   Um candidato só é válido quando possui pelo menos um
   caractere pertencente a cada categoria ativa.

   Exemplo:

   Se uppercase, lowercase e numbers estiverem ativos,
   a senha precisa conter pelo menos:

   - uma letra maiúscula;
   - uma letra minúscula;
   - um número.

   O restante das posições continua livre para qualquer
   caractere pertencente ao pool completo.
   ========================================================= */

function containsAllActiveSets(password, activeSets) {
  return activeSets.every(({ characters }) =>
    [...password].some((character) => characters.includes(character)),
  );
}

/* =========================================================
   07. GERAÇÃO DA SENHA
   ---------------------------------------------------------
   Esta é a função pública principal do módulo.

   Ela valida a configuração, determina os conjuntos ativos,
   constrói o pool completo e utiliza rejection sampling até
   obter um candidato válido.
   ========================================================= */

export function generatePassword(options) {
  validateOptions(options);

  const activeSets = getActiveCharacterSets(options);

  if (activeSets.length === 0) {
    throw new Error("At least one character category must be enabled.");
  }

  /*
    Cada categoria ativa precisa aparecer pelo menos uma vez.

    Portanto, o comprimento nunca pode ser menor que a
    quantidade de categorias obrigatórias.
  */

  if (options.length < activeSets.length) {
    throw new Error(
      "Password length is too short for the selected categories.",
    );
  }

  const completePool = activeSets.map(({ characters }) => characters).join("");

  /*
    Esta verificação é defensiva.

    getActiveCharacterSets() já garante que conjuntos ativos
    não sejam vazios, então completePool também não deveria
    ficar vazio neste ponto.
  */

  if (completePool.length === 0) {
    throw new Error("Password character pool cannot be empty.");
  }

  /*
    REJECTION SAMPLING SOBRE STRINGS COMPLETAS
    ---------------------------------------------------------
    Cada tentativa é uniforme dentro de:

        completePool ^ length

    Depois descartamos somente candidatos que não satisfaçam
    todas as categorias obrigatórias.

    Como todas as strings possuíam a mesma probabilidade
    antes da rejeição, condicionar o resultado ao subconjunto
    válido mantém todas as senhas válidas equiprováveis.

    Isso é diferente de gerar primeiro um caractere de cada
    categoria e preencher o restante depois, estratégia que
    exige cuidados adicionais para evitar alterar a
    distribuição final.
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
   ---------------------------------------------------------
   Exportamos os limites como objeto imutável para permitir
   que outras partes da aplicação consultem as regras do
   gerador sem redefinir os mesmos números.
   ========================================================= */

export const PASSWORD_LIMITS = Object.freeze({
  minimum: MIN_LENGTH,
  maximum: MAX_LENGTH,
});