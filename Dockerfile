FROM node:16-alpine
WORKDIR /usr/app
RUN yarn set version stable
COPY package.json ./
RUN yarn install
COPY . .
RUN yarn build
EXPOSE 7000
ENV NODE_ENV=production
CMD ["yarn", "start:prod"]