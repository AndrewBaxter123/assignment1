import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { validateMovieId, validateReviewText, validateReviewer } from "../shared/util";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    if (!event.pathParameters || !event.pathParameters.movieId || !event.pathParameters.reviewer) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing required path parameters" }),
        };
    }
      
    const movieIdStr = event.pathParameters.movieId;
    const reviewer = event.pathParameters.reviewer;
    const movieId = movieIdStr ? parseInt(movieIdStr) : undefined;
    const requestBody = event.body ? JSON.parse(event.body) : undefined;

    console.log("movieId:", movieId);
    console.log("reviewer:", reviewer);
    console.log("requestBody:", requestBody);

    if (!movieId || !validateMovieId(movieId) || !reviewer || !validateReviewer(reviewer) || !requestBody || !validateReviewText(requestBody.reviewText)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields or invalid review text (needs more than 20 chars)" }),
      };
    }

    // Check if the review exists
    const getCmd = new GetCommand({
      TableName: process.env.REVIEWS_TABLE_NAME,
      Key: { movieId, reviewer },
    });

    const getResult = await ddbDocClient.send(getCmd);
    if (!getResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Review not found" }),
      };
    }

    const updateCommand = new UpdateCommand({
      TableName: process.env.REVIEWS_TABLE_NAME,
      Key: { movieId, reviewer },
      UpdateExpression: 'set reviewText = :r',
      ExpressionAttributeValues: {
        ':r': requestBody.reviewText,
      },
      ReturnValues: 'UPDATED_NEW',
    });

    const commandOutput = await ddbDocClient.send(updateCommand);
    console.log("UpdateCommand Output:", commandOutput);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update the review", error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
