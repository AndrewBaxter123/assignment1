// deleteReview.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const parameters  = event?.pathParameters;
    const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
    const reviewer = parameters?.reviewer;

    if (!movieId || !reviewer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing movieId or reviewer in path parameters" }),
      };
    }
// TODO: alter the way delete function works or add in GetCommand. It was displaying review deleted no matter what, which I found out was the default use
    const getCmd = new GetCommand({ 
        TableName: process.env.REVIEWS_TABLE_NAME,
        Key: { movieId: movieId, reviewer: reviewer },
      });
  
      const getResult = await ddbDocClient.send(getCmd);

      // If the review does not exist, return 404
    if (!getResult.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Review not found" }),
        };
      }

    // Delete the review from the table if or when it is found
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        Key: { movieId: movieId, reviewer: reviewer },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Review deleted successfully" }),
    };
  } catch (error) {
    console.error("Error: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
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
