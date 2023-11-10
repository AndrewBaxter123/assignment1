import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { validateRating, validateYear } from "../shared/util";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    if (!event.pathParameters || !event.pathParameters.movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movieId in path parameters" }),
      };
    }

    const movieId = parseInt(event.pathParameters.movieId);
    if (isNaN(movieId)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "movieId must be a valid number" }),
      };
    }

    // Validate the year if present
    const year = event.queryStringParameters?.year;
    if (year && !validateYear(year)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid year format. Expected format: YYYY" }),
      };
    }

    // validate minRating if present
    const minRatingParam = event.queryStringParameters?.minRating;
    let minRating = 1
    if (minRatingParam !== undefined) {
      const parsedRating = parseInt(minRatingParam, 10);
      if (isNaN(parsedRating) || !validateRating(parsedRating)) {
          return {
              statusCode: 400,
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ message: "Invalid minRating value. It must be a number between 1 and 10." }),
          };
      }
      minRating = parsedRating;
  }
  

    let keyConditionExpression = 'movieId = :movieId';
    let expressionAttributeValues = { ':movieId': movieId };
    let indexName: string | undefined = undefined;

    if (year) {
      keyConditionExpression += ' and begins_with(reviewDate, :year)';
      expressionAttributeValues[':year'] = year;
      indexName = 'ReviewDateIndex';
    }

    const commandOutput = await ddbDocClient.send(
      new QueryCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        IndexName: indexName, // only used if year is provided
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    let items = commandOutput.Items || [];

    // Filter reviews by minRating if provided
    items = items.filter(item => item.rating >= minRating);

    if (items.length === 0) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "No reviews found for this movie" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: items }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error }),
    };
  }
};
