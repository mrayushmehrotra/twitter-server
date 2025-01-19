import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import { Tweet } from "@prisma/client";

interface CreateTweetPayload {
  content: string;
  imageURL?: string;
}

const queries = {
  getAllTweets: () =>
    prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
    }),
};

const mutations = {
  createTweet: async (
    parent: any,
    { payload }: { payload: CreateTweetPayload },
    ctx: GraphqlContext,
  ) => {
    if (!ctx.user) throw new Error("you are not authenticated");
    console.log(payload);
    try {
      const tweet = await prismaClient.tweet.create({
        data: {
          content: payload.content,
          imageURL: payload.imageURL,
          author: { connect: { id: ctx.user.id } },
        },
      });
      return tweet;
    } catch (error) {
      console.error("Error creating tweet:", error);
      throw new Error("Failed to create tweet.");
    }
  },
};

const extraResolvers = {
  Tweet: {
    author: async (parent: Tweet) => {
      try {
        const user = await prismaClient.user.findUnique({
          where: { id: parent.authorId },
        });
        if (!user) {
          throw new Error(`Author with ID ${parent.authorId} not found`);
        }
        return user;
      } catch (error) {
        console.error("Error in author resolver:", error);
        throw error;
      }
    },
  },
};

export const resolvers = { mutations, extraResolvers, queries };
