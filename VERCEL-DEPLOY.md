# Deploy na Vercel

## 1. Importe o projeto
Envie o conteúdo deste ZIP para um repositório Git ou faça upload/importação do projeto na Vercel. A pasta raiz do projeto deve ser a que contém `index.html`, `assets/`, `__l5e/`, `api/` e `vercel.json`.

- Framework Preset: **Other**
- Build Command: deixe vazio
- Output Directory: deixe vazio (ou `.` se a interface exigir)
- Install Command: deixe vazio

## 2. Configure as variáveis de ambiente
Na Vercel, abra **Settings → Environment Variables** e adicione:

- `DUTTYFY_PIX_URL_ENCRYPTED`: URL criptografada/credencial fornecida no painel Duttyfy. Não coloque essa credencial no HTML nem em repositório público.
- `AMOUNT_CENTS`: valor padrão em centavos (ex.: `9700` = R$ 97,00).
- `PRODUCT_NAME`: nome padrão do produto.
- `SUCCESS_URL`: opcional; URL de destino após confirmação do pagamento.

Depois de adicionar ou alterar variáveis, faça um novo deploy.

## 3. Rotas da API
- `POST /api/create-payment`: cria a cobrança PIX.
- `GET /api/status?transactionId=...`: consulta o estado da cobrança.

As rotas foram convertidas para funções serverless Node.js porque a Vercel não executa arquivos PHP como backend. O frontend foi atualizado para chamar essas rotas.

## Importante
A Vercel não oferece armazenamento persistente no sistema de arquivos das funções. Por isso, a consulta de status pergunta diretamente ao gateway e não depende dos arquivos JSON locais do projeto. Teste a criação e a consulta de um PIX em ambiente controlado antes de usar em produção.
