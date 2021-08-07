// eslint-disable-next-line
require("dotenv").config()
import express from "express"

const app = express()
const port = 3000
app.get("/", (_, res) => res.send("Hello World"))

app.listen(port, () => {
  console.log(`Application running on port ${port}.`)
})
