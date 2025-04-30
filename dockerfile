# Usando a imagem base do Node.js 16
FROM node:16

# Definindo o diretório de trabalho dentro do container
WORKDIR /app

# Copiando todos os arquivos do projeto para o diretório /app no container
COPY . /app/

# Instalando as dependências do Node.js
RUN npm install

# Expondo a porta em que o servidor vai rodar (ajuste conforme necessário)
EXPOSE 3000

# Comando para rodar o servidor
CMD ["node", "backend/server.js"]
