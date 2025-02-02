import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../clients/redis";

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
      const user = await UserService.getUserById(id);

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
            follower: { include: { following: true } },
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

      recommendedUsers: async (parent: User, _: any, ctx: GraphqlContext) => {
        if (!ctx.user) return [];
        const cachedValue = await redisClient.get(
          `RECOMMENDED_USER:${ctx.user.id}`,
        );

        if (cachedValue) {
          return JSON.parse(cachedValue);
        }

        // Fetch the current user's followings
        const myFollowings = await prismaClient.follows.findMany({
          where: { followerId: ctx.user.id },
          select: { followingId: true },
        });

        const followingIds = myFollowings.map((follow) => follow.followingId);

        // Fetch users followed by my followings (friends of friends)
        const potentialRecommendations = await prismaClient.follows.findMany({
          where: {
            followerId: { in: followingIds },
            followingId: { notIn: [...followingIds, ctx.user.id] }, // Exclude current user and already followed
          },
          include: { following: true },
        });

        // Extract unique recommended users
        const recommendedUsers = potentialRecommendations
          .map((follow) => follow.following)
          .filter(
            (user, index, self) =>
              index === self.findIndex((u) => u.id === user.id), // Ensure uniqueness
          );
        await redisClient.setex(
          `RECOMMENDED_USER:${ctx.user.id}`,
          JSON.stringify(recommendedUsers),
          100,
        );

        return recommendedUsers;
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
      await redisClient.del(`RECOMMENDED_USER:${ctx.user.id}`);
      return true;
    },

    unfollowUser: async (
      parent: any,
      { to }: { to: string },
      ctx: GraphqlContext,
    ) => {
      if (!ctx.user || !ctx.user.id) throw new Error("unauthenticated");
      await UserService.unfollowUser(ctx.user.id, to);
      await redisClient.del(`RECOMMENDED_USER:${ctx.user.id}`);
      return true;
    },
  },
};
