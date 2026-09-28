# Meu Game de Sobrevivência

Jogo 2D de sobrevivência para navegador, single-player e local.

## Arquitetura

- **Phaser 3.90.0** — motor do jogo.
- **React** — apenas a camada de montagem do canvas.
- **Vite** — desenvolvimento e build.
- **IndexedDB** — persistência local do progresso.

O projeto não depende de Manus, Babylon.js, backend, conta ou servidor para executar a lógica do jogo.

## Estrutura

```
jogo-sobrevivencia-V.0.1/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   └── GameCanvas.tsx
│   └── game/
│       ├── scene.ts
│       ├── state.ts
│       └── systems.ts
└── docs...
```

## Executar

Na pasta do projeto:

```bash
npm install
npm run dev
```

Depois abra o endereço local exibido pelo Vite, normalmente `http://localhost:3000`.

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

O resultado de produção fica em `dist/`.

## Salvamento

O jogo utiliza o banco IndexedDB `meu-game-sobrevivencia`, com o registro principal em `saves/main`.

A camada de save ainda reconhece uma gravação antiga em `localStorage` usando a chave `ilha-selvagem-save-v1` para fazer a migração inicial.
