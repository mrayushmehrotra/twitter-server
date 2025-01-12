export const resolvers = {
  Query: {
    verifyGoogleToken: async (parent: any, { token }: { token: string }) => {
      return token;
    },
  },
};
