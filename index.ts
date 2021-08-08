// eslint-disable-next-line
require("dotenv").config()
import { PrismaClient } from "@prisma/client"
import express from "express"
import { graphqlHTTP } from "express-graphql"
import { makeExecutableSchema } from "@graphql-tools/schema"

const prisma = new PrismaClient({
  log: ["query", "info", `warn`, `error`],
})

const typeDefs = /* GraphQL */ `
  type File {
    id: String!
    name: String!
    mimeType: MimeType!
    createdAt: String!
  }

  type Query {
    allFiles: [File!]!
  }

  enum MimeType {
    DIRECTORY
    FILE
    FILE_VERSION
  }
`

const resolvers = {
  Query: {
    allFiles: () => {
      return prisma.file.findMany()
    },
  },
}

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
})

const app = express()
app.use(
  "/graphql",
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV === "development",
  })
)

app.listen(4000)
