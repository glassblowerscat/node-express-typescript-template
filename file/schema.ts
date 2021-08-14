import { createModule, gql } from "graphql-modules"
import { prismaClient } from "../prisma"

export const fileModule = createModule({
  id: "file-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type File {
        id: String!
        name: String!
        directory: Directory!
        directoryId: String!
        versions: [FileVersion!]!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
      }

      extend type Query {
        allFiles: [File!]!
      }
    `,
  ],
  resolvers: {
    Query: {
      allFiles: async () => {
        return await prismaClient().file.findMany()
      },
    },
  },
})
