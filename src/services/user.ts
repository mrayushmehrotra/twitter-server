import axios from "axios";
import { prismaClient } from "../clients/db";
import JWTService from "./jwt";
import { User } from "../app/user";
interface GoogleTokenResult {
  iss?: string;
  nbf?: string;
  aud?: string;
  sub?: string;
  email: string;
  email_verified: string;
  azp?: string;
  name?: string;
  picture?: string;
  given_name: string;
  family_name?: string;
  iat?: string;
  exp?: string;
  jti?: string;
  alg?: string;
  kid?: string;
  typ?: string;
}

class UserService {
  public static async verifyGoogleAuthToken(token: string) {
    if (!token) {
      throw new Error("Token is required.");
    }
    try {
      const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
      googleOauthURL.searchParams.set("id_token", token);

      const { data } = await axios.get<GoogleTokenResult>(
        googleOauthURL.toString(),
        {
          responseType: "json",
        },
      );
      const user = await prismaClient.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        await prismaClient.user.create({
          data: {
            email: data.email,
            firstName: data.given_name,
            lastName: data.family_name,
            profileImageURL: data.picture,
          },
        });
      }
      const userInDb = await prismaClient.user.findUnique({
        where: {
          email: data.email,
        },
      });
      if (!userInDb) {
        throw new Error("User with email not found");
      }
      const userToken = JWTService.generateTokenForUser(userInDb);

      return userToken;
    } catch (error) {
      console.error("Error verifying Google token:", error);
      throw new Error("Failed to verify Google token.");
    }
  }
  public static async getUserById(id: string) {
    const user = await prismaClient.user.findUnique({ where: { id } });
    return user;
  }
}
export default UserService;
