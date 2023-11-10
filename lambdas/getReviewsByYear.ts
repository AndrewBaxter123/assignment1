import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const movieId = event.pathParameters?.movieId;
    const year = event.pathParameters?.year;

    if (!movieId || !year) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "movieId and year are required." }),
        };
    }

    const queryCommand = new QueryCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        KeyConditionExpression: 'movieId = :movieId and begins_with(reviewDate, :year)',
        ExpressionAttributeValues: {
            ':movieId': parseInt(movieId),
            ':year': year,
        },
    });

    try {
        const results = await ddbDocClient.send(queryCommand);
        return {
            statusCode: 200,
            body: JSON.stringify(results.Items),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
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