import { createModule, gql } from "graphql-modules"
import { prismaClient } from "../prisma"

export const directoryModule = createModule({
  id: "directory-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type Directory {
        id: String!
        name: String!
        parent: Directory
        parentId: String
        directories: [Directory]!
        files: [File]!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
      }

      extend type Query {
        allDirectories: [Directory!]!
      }
    `,
  ],
  resolvers: {
    Query: {
      allDirectories: async () => {
        return await prismaClient().directory.findMany()
      },
    },
  },
})
