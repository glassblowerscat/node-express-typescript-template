import { createModule, gql } from "graphql-modules"
import { prismaClient } from "../prisma"

export const fileVersionModule = createModule({
  id: "fileVersion-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type FileVersion {
        id: String!
        file: File!
        fileId: String!
        fileName: String!
        mimeType: String!
        size: Int!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
      }

      extend type Query {
        allFileVersions: [FileVersion!]!
      }
    `,
  ],
  resolvers: {
    Query: {
      allFileVersions: async () => {
        return await prismaClient().fileVersion.findMany()
      },
    },
  },
})
