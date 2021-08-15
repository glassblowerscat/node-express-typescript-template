import { FileVersion } from "@prisma/client"
import { createModule, gql } from "graphql-modules"
import * as fileVersionService from "./service"
import { prismaClient } from "../prisma"

export const fileVersionModule = createModule({
  id: "fileVersion-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type FileVersion {
        id: ID!
        fileId: ID!
        fileName: String!
        mimeType: String!
        size: Int!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
      }

      input CreateFileVersionInput {
        fileId: ID!
        fileName: String!
        mimeType: String!
        size: Int!
      }

      extend type Query {
        allFileVersions: [FileVersion]!
        getFileVersion(id: ID!): FileVersion
        getFileVersions(fileId: ID!): [FileVersion]!
      }

      extend type Mutation {
        renameFileVersion(id: ID!, name: String!): FileVersion!
        deleteFileVersion(id: ID!): Boolean!
      }
    `,
  ],
  resolvers: {
    Query: {
      allFileVersions: async (): Promise<FileVersion[]> => {
        return await prismaClient().fileVersion.findMany()
      },
      getFileVersion: async (id: string): Promise<FileVersion | null> => {
        return await fileVersionService.getFileVersion(prismaClient(), id)
      },
      getFileVersions: async (fileId: string): Promise<FileVersion[]> => {
        return await fileVersionService.getFileVersions(prismaClient(), fileId)
      },
    },
    Mutation: {
      renameFileVersion: async (
        id: string,
        name: string
      ): Promise<FileVersion> => {
        return await fileVersionService.renameFileVersion(
          prismaClient(),
          id,
          name
        )
      },
      deleteFileVersion: async (id: string): Promise<boolean> => {
        return await fileVersionService.deleteFileVersion(prismaClient(), id)
      },
    },
  },
})
