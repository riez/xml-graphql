FROM node:14-alpine3.12 as builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm
RUN cd apollo && pnpm install

FROM node:14-alpine3.12
WORKDIR /app
COPY --from=builder /app/apollo ./
RUN cd node_modules && ls
EXPOSE 4000
CMD ["npm", "start"]