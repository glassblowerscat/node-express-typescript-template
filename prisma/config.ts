import { PrismaClient } from "@prisma/client"

export function prismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: ["query", "info", `warn`, `error`],
  })

  /***********************************/
  /* SOFT DELETE MIDDLEWARE */
  /***********************************/

  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  prisma.$use(async (params, next) => {
    // Check incoming query type
    const types = ["File", "FileVersion", "Directory"]
    if (types.includes(params.model ?? "")) {
      if (params.action === "delete") {
        // Delete queries
        // Change action to an update
        params.action = "update"
        params.args["data"] = { deletedAt: new Date() }
      }
      if (params.action === "deleteMany") {
        // Delete many queries
        params.action = "updateMany"
        if (params.args.data !== undefined) {
          params.args.data["deletedAt"] = new Date()
        } else {
          params.args["data"] = { deletedAt: new Date() }
        }
      }
    }
    return next(params)
  })
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  return prisma
}
