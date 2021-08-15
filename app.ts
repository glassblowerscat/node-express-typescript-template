// eslint-disable-next-line
require("dotenv").config()
import { Directory, File } from "@prisma/client"
import express from "express"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { prismaClient } from "./prisma"
import { directoryModule, findDirectories } from "./directory"
import { fileModule, findFiles } from "./file"
import { fileVersionModule } from "./fileVersion"

const mainModule = createModule({
  id: "main-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      interface FileNode {
        id: ID!
        name: String!
        createdAt: String!
        updatedAt: String
        deletedAt: String
      }

      extend type Query {
        searchFiles(query: String!): [FileNode]
      }
    `,
  ],
  resolvers: {
    Query: {
      searchFiles: async (query: string): Promise<Array<Directory | File>> => {
        const directories = (await findDirectories(prismaClient(), query)) ?? []
        const files = (await findFiles(prismaClient(), query)) ?? []
        return [...directories, ...files]
      },
    },
  },
})

const api = createApplication({
  modules: [mainModule, directoryModule, fileModule, fileVersionModule],
})

const app = express()
app.use(
  "/graphql",
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  graphqlHTTP({
    schema: api.schema,
    customExecuteFn: api.createExecution(),
    graphiql: process.env.NODE_ENV === "development",
  })
)

app.listen(4000)
