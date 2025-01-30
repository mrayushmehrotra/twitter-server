import { prismaClient } from "../../clients/db";

import { GraphqlContext } from "../../interfaces";
import { Tweet } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "../../services/user";
import TweetService, { CreateTweetPayload } from "../../services/tweet";

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
});

const queries = {
  getAllTweets: () => TweetService.getAllTweets(),

  getSignedURLForTweet: async (
    parent: any,
    { imageType, imageName }: { imageType: string; imageName: string },
    ctx: GraphqlContext,
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("unauthenticated");

    const allowedImageTypes = [
      "image/jpg",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (!allowedImageTypes.includes(imageType))
      throw new Error("unsupported image type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `uploads/${ctx.user.id}/tweets/${imageName}-${Date.now.toString()}.${imageType} `,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600,
    });
    return signedURL;
  },
};

const mutations = {
  createTweet: async (
    parent: any,
    { payload }: { payload: CreateTweetPayload },
    ctx: GraphqlContext,
  ) => {
    if (!ctx.user) throw new Error("you are not authenticated");

    try {
      const tweet = await TweetService.createTweet({
        ...payload,
        userId: ctx.user.id,
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
        const user = UserService.getUserById(parent.authorId);
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
