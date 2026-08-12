# Brasileirão Pass Scout

Site estático de análise de passes do Brasileirão 2026, baseado no modelo xP/xPV.

## Conteúdo

- **Top 15 Zagueiros**
- **Top 15 Laterais**
- **Top 15 Meio-campistas**
- **Top 15 Extremos**

Total: 60 jogadores com perfis completos, mapas de passe, relatórios PDF e comparação.

## Deploy na Vercel

1. Conecte este repositório na Vercel
2. Framework: **Next.js** (detectado automaticamente)
3. Build command: `npm run build`
4. Output: padrão Next.js

Não é necessário variável de ambiente — todos os dados estão em `data/`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Regenerar dados

Requer Python 3 com dependências do backend `xpv-xp_site`:

```bash
pip install -r /path/to/xpv-xp_site/backend/requirements.txt
python3 scripts/extract_brasileirao_site_data.py
```

O script lê `br2026_passes.csv` e gera `data/` (perfis, mapas, métricas).
