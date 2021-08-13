// eslint-disable-next-line
require("dotenv").config()
import express from "express"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { fileModule } from "./file"

const mainModule = createModule({
  id: "main-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      enum MimeType {
        DIRECTORY
        FILE
        FILE_VERSION
      }
    `,
  ],
})

const api = createApplication({
  modules: [mainModule, fileModule],
})

const app = express()
app.use(
  "/graphql",
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  graphqlHTTP({
    schema: api.schema,
    graphiql: process.env.NODE_ENV === "development",
  })
)

app.listen(4000)
