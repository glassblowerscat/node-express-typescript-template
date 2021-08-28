import { FileVersion } from "@prisma/client"
import { createModule, gql } from "graphql-modules"
import * as fileVersionService from "./service"
import { prismaClient } from "../prisma"

export const fileVersionModule = createModule({
  id: "fileVersion-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type FileVersion implements FileNode {
        id: ID!
        name: String!
        createdAt: String!
        updatedAt: String
        deletedAt: String
        fileId: ID!
        mimeType: String!
        size: Int!
      }

      input CreateFileVersionInput {
        fileId: ID!
        name: String!
        mimeType: String!
        size: Int!
      }

      type CreateFileVersionResult {
        file: File!
        url: String!
      }

      extend type Query {
        allFileVersions: [FileVersion]!
        getFileVersion(id: ID!): FileVersion
        getFileVersions(fileId: ID!): [FileVersion]!
      }

      extend type Mutation {
        createFileVersion(
          input: CreateFileVersionInput!
        ): CreateFileVersionResult!
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
      getFileVersion: async (
        _: unknown,
        { id }: { id: string }
      ): Promise<FileVersion | null> => {
        return await fileVersionService.getFileVersion(prismaClient(), id)
      },
      getFileVersions: async (
        _: unknown,
        { fileId }: { fileId: string }
      ): Promise<FileVersion[]> => {
        return await fileVersionService.getFileVersions(prismaClient(), fileId)
      },
    },
    Mutation: {
      createFileVersion: async (
        _: unknown,
        { input }: { input: fileVersionService.CreateFileVersionInput }
      ): Promise<FileVersion & { url: string }> => {
        return await fileVersionService.createFileVersionRecord(
          prismaClient(),
          input
        )
      },
      renameFileVersion: async (
        _: unknown,
        {
          id,
          name,
        }: {
          id: string
          name: string
        }
      ): Promise<FileVersion> => {
        return await fileVersionService.renameFileVersion(
          prismaClient(),
          id,
          name
        )
      },
      deleteFileVersion: async (
        _: unknown,
        { id }: { id: string }
      ): Promise<boolean> => {
        return await fileVersionService.deleteFileVersion(prismaClient(), id)
      },
    },
  },
})
