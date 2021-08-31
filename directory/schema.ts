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
        id: ID!
        name: String!
        createdAt: String!
        updatedAt: String
        deletedAt: String
        parentId: ID
        directories: [Directory]!
        ancestors: [String]!
        files: [File]!
        children: Int!
        size: Int
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

      type DirectoryContentsResult {
        id: String!
        name: String!
        mimeType: String!
        size: Int!
        key: String!
        createdAt: String!
        updatedAt: String!
        type: String!
      }

      extend type Query {
        allDirectories: [Directory!]!
        getDirectory(id: ID!): Directory
        getDirectoryContents(
          id: ID!
          pagination: PaginationInput
          sort: SortInput
        ): Directory
        getDirectoryContentsRaw(
          id: ID!
          pagination: PaginationInput
          sort: SortInput
        ): [DirectoryContentsResult]!
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
    Directory: {
      children: async ({ id }: { id: string }): Promise<number> => {
        return await directoryService.countDirectoryChildren(prismaClient(), id)
      },
      size: async ({ id }: { id: string }): Promise<number | null> => {
        return await directoryService.getDirectorySize(prismaClient(), id)
      },
    },
    Query: {
      allDirectories: async () => {
        return await prismaClient().directory.findMany()
      },
      getDirectory: async (
        _: unknown,
        { id }: { id: string }
      ): Promise<Directory | null> => {
        return await directoryService.getDirectory(prismaClient(), id)
      },
      getDirectoryContents: async (
        _: unknown,
        {
          id,
          pagination,
          sort,
        }: { id: string; pagination?: Pagination; sort?: directoryService.Sort }
      ): Promise<Directory | null> => {
        return await directoryService.getDirectoryContents(
          prismaClient(),
          id,
          pagination,
          sort
        )
      },
      getDirectoryContentsRaw: async (
        _: unknown,
        {
          id,
          pagination,
          sort,
        }: { id: string; pagination?: Pagination; sort?: directoryService.Sort }
      ): Promise<directoryService.DirectoryContentsResult[] | null> => {
        return await directoryService.getDirectoryContentsRaw(
          prismaClient(),
          id,
          pagination,
          sort
        )
      },
    },
    Mutation: {
      createDirectory: async (
        _: unknown,
        { name, parentId }: { name: string; parentId: string }
      ) => {
        return await directoryService.createDirectory(
          prismaClient(),
          name,
          parentId
        )
      },
      moveDirectory: async (
        _: unknown,
        {
          id,
          directoryId,
        }: {
          id: string
          directoryId: string
        }
      ): Promise<Directory> => {
        return await directoryService.moveDirectory(
          prismaClient(),
          id,
          directoryId
        )
      },
      renameDirectory: async (
        _: unknown,
        { id, name }: { id: string; name: string }
      ): Promise<Directory> => {
        return await directoryService.renameDirectory(prismaClient(), id, name)
      },
      deleteDirectory: async (
        _: unknown,
        { id }: { id: string }
      ): Promise<boolean> => {
        return await directoryService.deleteDirectory(prismaClient(), id)
      },
    },
  },
})
