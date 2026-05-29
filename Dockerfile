FROM node:20-slim

# poppler-utils fornece pdftotext/pdftoppm (extração de texto/imagem dos PDFs)
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências primeiro (cache de layer)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Código
COPY . .

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
