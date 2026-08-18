"use strict";

/* =========================================================
   PASSWORD GENERATOR — CONJUNTOS DE CARACTERES
   ---------------------------------------------------------
   Fonte única de verdade para os caracteres utilizados
   pelo gerador e pelos módulos de análise.

   Centralizar esses conjuntos evita que geração e cálculo
   de entropia utilizem alfabetos diferentes por acidente.

   Este módulo:
   - não acessa o DOM;
   - não gera senhas;
   - não calcula entropia;
   - não mantém estado mutável;
   - não decide quais opções devem estar ativas.
   ========================================================= */

/* =========================================================
   01. CONJUNTOS BASE
   ---------------------------------------------------------
   Cada propriedade representa uma categoria disponível
   para composição de senhas.

   Object.freeze() impede a substituição das propriedades
   do objeto durante a execução.
   ========================================================= */

export const CHARACTER_SETS = Object.freeze({
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
});

/* =========================================================
   02. CARACTERES AMBÍGUOS
   ---------------------------------------------------------
   Caracteres visualmente semelhantes podem ser removidos
   quando a opção excludeAmbiguous estiver ativa.

   Exemplo:
   I, l e 1 podem ser difíceis de distinguir dependendo
   da fonte utilizada.
   ========================================================= */

export const AMBIGUOUS_CHARACTERS = Object.freeze(["I", "l", "1", "O", "0"]);

/*
  Set é utilizado internamente porque a operação has()
  expressa diretamente a intenção de verificar associação
  e oferece lookup eficiente.
*/

const AMBIGUOUS_CHARACTER_SET = new Set(AMBIGUOUS_CHARACTERS);

/* =========================================================
   03. FILTRAGEM DE CARACTERES AMBÍGUOS
   ---------------------------------------------------------
   Recebe um conjunto em formato de string e devolve uma
   nova string sem os caracteres considerados ambíguos.

   O conjunto original nunca é modificado.
   ========================================================= */

function removeAmbiguousCharacters(characterSet) {
  return [...characterSet]
    .filter((character) => !AMBIGUOUS_CHARACTER_SET.has(character))
    .join("");
}

/* =========================================================
   04. CONJUNTOS ATIVOS
   ---------------------------------------------------------
   Converte a configuração recebida em uma coleção contendo
   apenas as categorias habilitadas.

   Cada item retornado possui:

   {
     name: "uppercase",
     characters: "ABC..."
   }

   Essa estrutura permite que outros módulos conheçam tanto
   a identidade da categoria quanto os caracteres realmente
   disponíveis nela.
   ========================================================= */

export function getActiveCharacterSets(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("Character set options must be an object.");
  }

  const activeSets = [];

  /*
    Função auxiliar privada desta chamada.

    Ela evita repetir a mesma lógica para uppercase,
    lowercase, numbers e symbols.
  */

  const addCharacterSet = (name, enabled) => {
    if (!enabled) {
      return;
    }

    const baseSet = CHARACTER_SETS[name];

    /*
      Esse erro indicaria uma inconsistência interna do
      próprio módulo, porque os nomes utilizados abaixo
      deveriam sempre existir em CHARACTER_SETS.
    */

    if (typeof baseSet !== "string") {
      throw new Error(`Unknown character set "${name}".`);
    }

    const characters = options.excludeAmbiguous
      ? removeAmbiguousCharacters(baseSet)
      : baseSet;

    /*
      Hoje nenhum conjunto fica vazio após a filtragem,
      mas esta proteção preserva uma invariável importante
      caso os alfabetos sejam modificados no futuro.
    */

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