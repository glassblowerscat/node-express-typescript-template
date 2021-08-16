// eslint-disable-next-line
require("dotenv").config()
import { Directory, File } from "@prisma/client"
import express, { Request } from "express"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { directoryModule, findDirectories } from "./directory"
import {
  downloadLocalFile,
  fileModule,
  findFiles,
  uploadLocalFile,
} from "./file"
import { fileVersionModule } from "./fileVersion"
import { prismaClient } from "./prisma"

/**
 * TODO list:
 * - JSON transactions
 * - Seed the db with files
 */

export interface Pagination {
  pageLength: number
  page: number
}

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

app.get("/file", function (req, res) {
  void downloadLocalFile(req.originalUrl)
    .then((file) => {
      res.status(200).send(file)
    })
    .catch((error) => {
      res.status(400).send(error)
    })
})

app.put("/file", function (req: Request<unknown, unknown, Buffer>, res) {
  const { headers } = req
  const data = {
    ContentType: headers["content-type"] ?? "application/octet-stream",
    Body: req.body,
  }
  void uploadLocalFile(req.originalUrl, data)
    .then(() => res.status(200).send(true))
    .catch((error) => {
      res.status(400).send(error)
    })
})

app.use(
  "/graphql",
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  graphqlHTTP({
    schema: api.schema,
    customExecuteFn: api.createExecution(),
    graphiql: process.env.NODE_ENV === "development",
  })
)

app.listen(process.env.LOCAL_PORT ?? 4000)
