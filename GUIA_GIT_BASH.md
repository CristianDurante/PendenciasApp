# Guia prático de Git Bash

Comandos para o seu dia a dia ao trabalhar com o repositório do Pendencias App no GitHub.

## Antes de começar

- **Git Bash** é o terminal do Git para Windows. Abra-o na pasta do projeto:
  - Clique com o botão direito na pasta e escolha "Git Bash Here", ou
  - Abra o Git Bash e navegue com `cd caminho/da/pasta`.
- Toda vez que você digitar um comando, confirme o diretório atual com:

```bash
pwd
```

- Veja se há alterações pendentes no projeto:

```bash
git status
```

## Cenário principal: GitHub atualizado, arquivos locais desatualizados

Esse é exatamente o seu caso. O repositório no GitHub tem o código mais novo e o seu computador está com a versão antiga.

### Passo 1 - Baixar as alterações do GitHub

```bash
git pull
```

Isso baixa as alterações mais recentes do GitHub e já aplica na sua pasta local.

Se aparecer a mensagem "There is no tracking information for the current branch", execute:

```bash
git pull origin main
```

Se você tiver feito alterações locais que não deseja manter, use:

```bash
git reset --hard
git pull
```

Atenção: o comando `git reset --hard` descarta todas as alterações locais. Use apenas se quiser jogar fora tudo o que você mudou na sua máquina.

### Como saber se estou desatualizado

```bash
git fetch
git status
```

Se o status mostrar algo como "Your branch is behind 'origin/main' by N commits", significa que o GitHub tem N commits que você ainda não tem. Nesse caso, rode `git pull`.

## Fluxo diário completo

O ciclo normal de trabalho é: atualizar, editar, commitar e enviar.

### 1. Atualizar com o GitHub antes de começar a trabalhar

```bash
git pull
```

Sempre faça isso no início do dia ou antes de começar uma nova tarefa, para não trabalhar em cima de uma versão antiga.

### 2. Editar os arquivos

Edite normalmente no seu editor (VS Code, etc.).

### 3. Ver o que foi alterado

```bash
git status
```

Mostra quais arquivos foram criados, modificados ou excluídos.

```bash
git diff
```

Mostra exatamente o que mudou dentro dos arquivos.

### 4. Preparar (stage) os arquivos alterados

Adicionar um arquivo específico:

```bash
git add nome-do-arquivo.tsx
```

Adicionar todos os arquivos alterados de uma vez:

```bash
git add .
```

Adicionar todos os arquivos de uma pasta específica:

```bash
git add src/
```

### 5. Commitar as alterações

```bash
git commit -m "descrição do que você fez"
```

Exemplos de mensagem:

```bash
git commit -m "corrige erro no login do usuário"
```

```bash
git commit -m "adiciona tela de relatórios"
```

### 6. Enviar para o GitHub

```bash
git push
```

Pronto. Suas alterações agora estão no GitHub e o download dos arquivos mais novos por outros computadores funcionará.

## Comandos essenciais de consulta

Ver histórico de commits:

```bash
git log --oneline
```

Ver histórico com mais detalhes:

```bash
git log
```

Ver em qual branch você está:

```bash
git branch
```

## Problemas comuns e soluções

### "Pull is not possible because you have unmerged files"

Você tem alterações locais conflitantes com o GitHub. Primeiro veja quais são:

```bash
git status
```

Para descartar as alterações locais e pegar a versão do GitHub:

```bash
git checkout -- .
git pull
```

Atenção: isso apaga as alterações locais desses arquivos.

### "error: Your local changes would be overwritten by merge"

Você editou arquivos localmente que também mudaram no GitHub. Guarde suas alterações com:

```bash
git stash
git pull
git stash pop
```

Isso salva suas alterações, baixa as novas e tenta aplicar as suas em cima.

### Esqueci de commitar e já rodei o pull

Não é possível desfazer facilmente. O ideal é sempre commitar (ou usar `git stash`) antes do `git pull`.

## Resumo do fluxo do dia

```bash
git pull
```

```bash
git status
```

```bash
git add .
```

```bash
git commit -m "minha alteração"
```

```bash
git push
```

## Dicas importantes

- **Sempre rode `git pull` antes de editar.** Assim você nunca edita uma versão antiga.
- **Commite com frequência e em pequenas partes.** Facilita encontrar o que mudou.
- **Nunca envie arquivos com senha ou dados sensíveis.**
- Se o `git push` pedir login e você não souber as credenciais, avise quem administra o repositório no GitHub.
