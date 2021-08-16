import { Directory } from "@prisma/client"
import { createModule, gql } from "graphql-modules"
import { Pagination } from "../app"
import { prismaClient } from "../prisma"
import * as directoryService from "./service"

export const directoryModule = createModule({
  id: "directory-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type Directory implements FileNode {
        parentId: ID
        directories: [Directory]!
        ancestors: [String]!
        files: [File]!
      }

      input SortInput {
        field: String!
        direction: SortDirection
      }

      enum SortDirection {
        ASC
        DESC
      }

      input PaginationInput {
        pageLength: Int!
        page: Int!
      }

      extend type Query {
        allDirectories: [Directory!]!
        getDirectory(id: ID!): Directory
        getDirectoryContents(
          id: ID!
          pagination: PaginationInput
          sort: SortInput
        ): Directory
      }

      extend type Mutation {
        createDirectory(name: String!, parentId: ID!): Directory!
        moveDirectory(id: ID!, directoryId: ID!): Directory!
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
      getDirectoryContents: async (
        id: string,
        pagination?: Pagination,
        sort?: directoryService.Sort
      ): Promise<Directory | null> => {
        return await directoryService.getDirectoryContents(
          prismaClient(),
          id,
          pagination,
          sort
        )
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
      moveDirectory: async (
        id: string,
        directoryId: string
      ): Promise<Directory> => {
        return await directoryService.moveDirectory(
          prismaClient(),
          id,
          directoryId
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
