import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Log the incoming event for debugging
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const reviewer = event.pathParameters?.reviewer;
    
    // Log the reviewer value
    console.log('Reviewer:', reviewer);

    if (!reviewer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "reviewer is required." }),
      };
    }

    // debug
    console.log('REVIEWS_TABLE_NAME:', process.env.REVIEWS_TABLE_NAME);

    // Log the query command before sending it
    const queryCommand = new QueryCommand({
      TableName: process.env.REVIEWS_TABLE_NAME, 
      IndexName: 'ReviewerIndex', 
      KeyConditionExpression: 'reviewer = :reviewer',
      ExpressionAttributeValues: {
        ':reviewer': reviewer, 
      },
    });

    console.log('QueryCommand:', JSON.stringify(queryCommand, null, 2)); //debug
    const results = await ddbDocClient.send(queryCommand);
    console.log('Query Results:', JSON.stringify(results)); // debug

    // Return the query results
    return {
      statusCode: 200,
      body: JSON.stringify(results.Items),
    };
  } catch (error) {
    // Log the error details
    console.error('Error retrieving reviews by reviewer:', error);

    // detailed debugging information
    const errorResponse = {
      error: 'Internal Server Error',
      message: error.message || 'An unknown error occurred',
      stack: error.stack,
    };

    // Log the error response
    console.log('Error response:', JSON.stringify(errorResponse, null, 2));

    return {
      statusCode: 500,
      body: JSON.stringify(errorResponse),
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
