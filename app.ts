// eslint-disable-next-line
require("dotenv").config()
import express from "express"
import { graphqlHTTP } from "express-graphql"
import { createApplication } from "graphql-modules"
import { directoryModule } from "./directory"
import { fileModule } from "./file"
import { fileVersionModule } from "./fileVersion"

const api = createApplication({
  modules: [directoryModule, fileModule, fileVersionModule],
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
