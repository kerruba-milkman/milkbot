FROM 263652615682.dkr.ecr.eu-central-1.amazonaws.com/milkman/node:12.14.1-alpine as intermediate

WORKDIR /app

COPY . .

RUN npm i

RUN npm test
RUN rm -rf tests

FROM 263652615682.dkr.ecr.eu-central-1.amazonaws.com/milkman/node:12.14.1-alpine

COPY --from=intermediate /app /app
WORKDIR /app

CMD [ "npm", "start" ]
