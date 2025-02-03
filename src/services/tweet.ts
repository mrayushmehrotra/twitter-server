import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis/index";

export interface CreateTweetPayload {
  content: string;
  imageURL?: string;
  userId: string;
}

class TweetService {
  public static async createTweet(data: CreateTweetPayload) {
    const rateLimitFlag = await redisClient.get(
      `RATE_LIMIT:TWEET:${data.userId}`,
    );
    if (rateLimitFlag) throw new Error("please wait...");
    const tweet = prismaClient.tweet.create({
      data: {
        content: data.content,
        imageURL: data.imageURL,
        author: { connect: { id: data.userId } },
      },
    });
    await redisClient.setex(`RATE_LIMIT:TWEET:${data.userId}`, 10, 1);

    await redisClient.del("ALL_TWEETS");
    return tweet;
  }
  public static getAllTweets() {
    return prismaClient.tweet.findMany({ orderBy: { createdAt: "desc" } });
  }
}

export default TweetService;
