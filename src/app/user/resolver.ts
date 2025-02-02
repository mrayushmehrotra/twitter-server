import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";

export const resolvers = {
  query: {
    verifyGoogleToken: async (parent: any, { token }: { token: string }) => {
      const resultToken = await UserService.verifyGoogleAuthToken(token);
      return resultToken;
    },
    getCurrentUser: async (parent: any, args: any, ctx: GraphqlContext) => {
      const id = ctx.user?.id;
      if (!id) {
        return null;
      }
      const user = await UserService.getUserById(id);
      return user;
    },

    getUserById: async (
      parent: any,
      { id }: { id: string },
      ctx: GraphqlContext,
    ) => {
      console.log(id, "id aa ayay");
      const user = await UserService.getUserById(id);
      console.log(user);
      return user;
    },
  },

  extraResolver: {
    User: {
      tweets: (parent: User) =>
        prismaClient.tweet.findMany({
          where: { author: { id: parent.id } },
        }),

      followers: async (parent: User) => {
        const result = await prismaClient.follows.findMany({
          where: { following: { id: parent.id } },
          include: {
            follower: true,
          },
        });
        return result.map((el) => el.follower);
      },

      following: async (parent: User) => {
        const result = await prismaClient.follows.findMany({
          where: { follower: { id: parent.id } },
          include: {
            following: true,
          },
        });
        return result.map((el) => el.following);
      },
    },
  },
  mutations: {
    followUser: async (
      parent: any,
      { to }: { to: string },
      ctx: GraphqlContext,
    ) => {
      if (!ctx.user || !ctx.user.id) throw new Error("unauthenticated");
      await UserService.followUser(ctx.user.id, to);
      return true;
    },

    unfollowUser: async (
      parent: any,
      { to }: { to: string },
      ctx: GraphqlContext,
    ) => {
      if (!ctx.user || !ctx.user.id) throw new Error("unauthenticated");
      await UserService.unfollowUser(ctx.user.id, to);
      return true;
    },
  },
};
