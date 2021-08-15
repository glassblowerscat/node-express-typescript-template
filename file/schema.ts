import { File } from "@prisma/client"
import { createModule, gql } from "graphql-modules"
import * as fileService from "./service"
import { prismaClient } from "../prisma"

export const fileModule = createModule({
  id: "file-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type File {
        id: ID!
        name: String!
        directoryId: ID!
        versions: [FileVersion]!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
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
      renameFile: async (id: string, name: string): Promise<File> => {
        return await fileService.renameFile(prismaClient(), id, name)
      },
      deleteFile: async (id: string): Promise<boolean> => {
        return await fileService.deleteFile(prismaClient(), id)
      },
    },
  },
})
