import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { validateYear } from "../shared/util";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    if (!event.pathParameters || !event.pathParameters.movieId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing movieId in path parameters" }),
      };
    }

    const movieId = parseInt(event.pathParameters.movieId);

    if (isNaN(movieId)) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "movieId must be a valid number" }),
      };
    }

    // validate the year if present
    const year = event.queryStringParameters?.year;
    if (year && !validateYear(year)) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Invalid year format. Expected format: YYYY" }),
      };
    }

    let keyConditionExpression = 'movieId = :movieId';
    let expressionAttributeValues = {
      ':movieId': movieId,
    };
    let indexName: string | undefined = undefined //will only use this when year is provided ?year

    // Modify query if year is provided  -?year
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

    if (!commandOutput.Items) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No reviews found for this movie" }),
      };
    }

    const body = {
      data: commandOutput.Items,
    };

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

