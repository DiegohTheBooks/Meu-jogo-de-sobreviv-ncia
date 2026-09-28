# Assets

## Política V0.2

O jogo não deve depender de Manus storage, URLs assinadas, hosts externos de assets ou backend.

A migração atual usa gráficos procedurais para as entidades de runtime, deixando o jogo independente enquanto os assets finais são organizados.

## Assets futuros

Quando a arte final for adicionada, manter tudo dentro de:

```
public/assets/
├── characters/
├── animals/
├── environment/
├── items/
├── effects/
└── audio/
```

O código deve referenciar apenas caminhos pertencentes ao próprio repositório.

## Regra

Um asset só é considerado válido quando o jogo pode ser executado depois de clonar o repositório sem credenciais, Manus storage, proxy de servidor ou conta online.
