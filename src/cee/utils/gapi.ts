import axios, {AxiosError, AxiosResponse} from 'axios';

export interface GoogleOAuthJWT {
  iss: string; // The issuer of the token
  sub: string; // The subject or user ID
  azp: string; // The authorized party or client ID
  email: string; // The email of the user
  at_hash: string; // The value used to verify the access token
  email_verified: boolean; // The flag indicating if the email is verified
  aud: string; // The audience or intended recipient of the token
  iat: number; // The issue time of the token in Unix timestamp
  exp: number; // The expiration time of the token in Unix timestamp
}
export interface ErrorData {
  error_description: string;
}

export const checkToken = async (token: String): Promise<any> => {
  const tokenResponse = await axios.get<GoogleOAuthJWT, AxiosResponse<ErrorData>>(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`)
    .then((response) => {
      return response.data;
    })
    .catch((error: AxiosError) => {
      return error.response?.data;
    });
  return tokenResponse;
};
