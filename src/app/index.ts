import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import bodyParser from "body-parser";

export async function initServer() {
  const app = express();
  app.use(bodyParser.json());
  const graphqlServer = new ApolloServer({
    typeDefs: `
        type Query {
            hello: String
helloTome(name: String): String
        }
`,

    resolvers: {
      Query: {
        hello: () => "this is a hello world from graphql",
        helloTome: (parent: any, { name }: { name: string }) => `hey ${name}`,
      },
    },
  });
  await graphqlServer.start();
  app.use("/graphql", expressMiddleware(graphqlServer));

  return app;
}
