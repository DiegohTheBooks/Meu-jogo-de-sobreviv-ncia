# Structure — V0.2 foundation

## Root
- `index.html` — entry point do navegador.
- `package.json` — scripts e dependências do projeto.
- `vite.config.ts` — configuração do Vite.
- `src/` — código da aplicação.
- `public/` — assets estáticos futuros.
- `dist/` — saída gerada pelo build, não é código-fonte.

## Host
- `src/App.tsx` — monta o jogo.
- `src/components/GameCanvas.tsx` — ponte mínima entre React e Phaser.
- `src/index.css` — HUD, menus, inventário e apresentação.

## Game
- `src/game/scene.ts` — mundo Phaser 3, jogador, animais, recursos, fogueiras, câmera e interação.
- `src/game/state.ts` — dados tipados, receitas, armas e payload versionado de save.
- `src/game/systems.ts` — sobrevivência, crafting e persistência IndexedDB.

## Engine
O jogo usa **Phaser 3.90.0**. React existe somente como shell para montar o canvas; a lógica do jogo pertence ao Phaser.

Não há dependência de Babylon.js, Manus runtime/storage ou backend.

## Persistence
Saves usam IndexedDB, banco `meu-game-sobrevivencia`, store `saves`, registro `main`.

A camada de save é versionada e pode migrar uma gravação antiga da chave `ilha-selvagem-save-v1` do localStorage para o IndexedDB.

## Estado da migração
- Phaser 3: migrado.
- localStorage primário: substituído por IndexedDB.
- runtime/debug/storage do Manus: removido.
- caminhos de assets do Manus: removidos.
- visuais de runtime: temporariamente procedurais para manter o projeto independente.

## Próximas divisões naturais
1. Colocar arte e áudio finais em `public/assets`.
2. Dividir a cena Phaser grande em entidades/sistemas quando a jogabilidade estabilizar.
3. Persistir progressivamente o estado completo do mundo.
4. Adicionar sprites, animações, áudio e composição mais rica dos biomas.
