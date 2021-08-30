import { promises as fs } from "fs"
import http from "http"
import { getMimeTypeFromExtension } from "./parsers"

export async function submitRequest(
  filePath: string,
  signedUrl: string
): Promise<void> {
  const buffer = await fs.readFile(filePath)
  const url = new URL(signedUrl)
  const { hostname, pathname, port, search } = url
  const mimeType = getMimeTypeFromExtension(filePath)

  const options = {
    hostname,
    port,
    path: pathname + search,
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": buffer.length,
    },
  }
  const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode ?? 400}`)
  })

  req.on("error", (error) => {
    console.error(error)
  })

  req.write(buffer)
  req.end()
}

void submitRequest(process.argv[2], process.argv[3])
