import { File } from "@prisma/client"
import { createModule, gql } from "graphql-modules"
import * as fileService from "./service"
import { prismaClient } from "../prisma"

export const fileModule = createModule({
  id: "file-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type File implements FileNode {
        id: ID!
        name: String!
        history: JSONObject
        createdAt: String!
        updatedAt: String
        deletedAt: String
        directoryId: ID!
        ancestors: [String]!
        versions: [FileVersion]!
      }

      # Combining File and FileVersion, because we will
      # do both in one operation.
      input CreateFileInput {
        name: String!
        directoryId: ID!
        mimeType: String!
        size: Int!
      }

      type CreateFileInputResult {
        file: File!
        url: String!
      }

      type Query {
        allFiles: [File]!
        getFile(id: ID!): File
      }

      type Mutation {
        createFile(input: CreateFileInput!): CreateFileInputResult!
        moveFile(id: ID!, directoryId: ID!): File!
        renameFile(id: ID!, name: String!): File!
        deleteFile(id: ID!): Boolean!
      }
    `,
  ],
  resolvers: {
    Query: {
      allFiles: async (): Promise<File[]> => {
        return await prismaClient().file.findMany()
      },
      getFile: async (id: string): Promise<File | null> => {
        return await fileService.getFile(prismaClient(), id)
      },
    },
    Mutation: {
      createFile: async (
        input: fileService.CreateFileInput
      ): Promise<{ file: File; url: string }> => {
        return await fileService.createFileRecord(prismaClient(), input)
      },
      moveFile: async (id: string, directoryId: string): Promise<File> => {
        return await fileService.moveFile(prismaClient(), id, directoryId)
      },
      renameFile: async (id: string, name: string): Promise<File> => {
        return await fileService.renameFile(prismaClient(), id, name)
      },
      deleteFile: async (id: string): Promise<boolean> => {
        return await fileService.deleteFile(prismaClient(), id)
      },
    },
  },
})
