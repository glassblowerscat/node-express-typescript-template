import { Directory } from "@prisma/client"
import { createModule, gql } from "graphql-modules"
import { prismaClient } from "../prisma"
import * as directoryService from "./service"

export const directoryModule = createModule({
  id: "directory-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type Directory {
        id: ID!
        name: String!
        parentId: ID
        directories: [Directory]!
        files: [File]!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
      }

      extend type Query {
        allDirectories: [Directory!]!
        getDirectory(id: ID!): Directory
      }

      extend type Mutation {
        createDirectory(name: String!, parentId: ID!): Directory!
        renameDirectory(id: ID!, name: String!): Directory!
        deleteDirectory(id: ID!): Boolean!
      }
    `,
  ],
  resolvers: {
    Query: {
      allDirectories: async () => {
        return await prismaClient().directory.findMany()
      },
      getDirectory: async (id: string): Promise<Directory | null> => {
        return await directoryService.getDirectory(prismaClient(), id)
      },
    },
    Mutation: {
      createDirectory: async (name: string, parentId: string) => {
        return await directoryService.createDirectory(
          prismaClient(),
          name,
          parentId
        )
      },
      renameDirectory: async (id: string, name: string): Promise<Directory> => {
        return await directoryService.renameDirectory(prismaClient(), id, name)
      },
      deleteDirectory: async (id: string): Promise<boolean> => {
        return await directoryService.deleteDirectory(prismaClient(), id)
      },
    },
  },
})
