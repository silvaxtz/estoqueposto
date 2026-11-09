# Estoque Grupo Atualize

Aplicativo desktop local para Windows, com banco SQLite armazenado no computador do posto. Funciona sem internet depois de instalado.

## O que já está implementado
- Dashboard de estoque.
- Abas separadas: Sorvetes, Lubrificantes e Outros.
- Cadastro e edição de produtos dentro do aplicativo.
- Cadastro de vendedores (Rayane e Bruno já incluídos).
- Registro de entradas e saídas com identificação do vendedor nas saídas.
- Bloqueio de saída acima do estoque disponível.
- Histórico de movimentações.
- Exportação CSV (abre no Excel).
- Backup do banco SQLite.
- 14 sorvetes iniciais cadastrados.

## Estoque inicial dos sorvetes
Cada linha representa 1 caixa comprada; o estoque é convertido para unidades:
- Cremosinhos: 10 unidades por caixa (3 sabores).
- Picolés cobertura: 22 unidades por caixa (2 produtos).
- Linha Milk: 26 unidades por caixa (3 produtos).
- Sublime Mousse Maracujá: quantidade por caixa pendente; estoque inicial 0 até confirmação.
- Linha Suco: 26 unidades por caixa (2 produtos).
- Potes 2L: 1 unidade de cada.
- Quy Copão Napolitano: quantidade por caixa pendente; estoque inicial 0 até confirmação.

Os dois itens pendentes podem ser editados quando a informação for confirmada. O cadastro permite alterar unidades por caixa, mas o ajuste do estoque deve ser feito registrando uma entrada.

## Requisitos
- Windows 10/11 64-bit
- Node.js LTS instalado para desenvolvimento/compilação

## Executar em modo de desenvolvimento
Abra o terminal nesta pasta e rode:

```bash
npm install
npm start
```

## Gerar instalador Windows
No Windows, rode:

```bash
npm install
npm run dist
```

O instalador será criado na pasta `dist`.

## Publicar no GitHub
Crie um repositório privado no GitHub e envie os arquivos deste projeto. Não publique o arquivo `estoque-atualize.db`: ele é criado automaticamente no perfil local do Windows de cada computador e contém os dados do posto.

## Onde ficam os dados
O banco é criado em `%APPDATA%/estoque-grupo-atualize/estoque-atualize.db` (pasta de dados do aplicativo). Faça backup pela tela “Relatórios e backup”.

## Observações importantes
- Esta versão não sincroniza dados pela internet; o painel remoto não faz parte desta primeira versão.
- O relatório CSV pode ser aberto no Excel ou LibreOffice.
- O valor de venda é informado/ajustado no cadastro do produto; na movimentação, o sistema usa o valor informado no formulário.
- O projeto é uma primeira versão funcional para validar fluxo e cadastro. Teste antes de usar em operação real e mantenha backups.
