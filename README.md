## Description

POS Ticket System Backend powered by NestJS

## Create JWT Public/Private Key

```bash
$ openssl ecparam -name prime256v1 -genkey -noout -out private.key
$ openssl ec -in private.key -pubout > public.key
```

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development mode
$ yarn run start:dev

# production mode
$ yarn run build && yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```