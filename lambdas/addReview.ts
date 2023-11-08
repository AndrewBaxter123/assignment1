import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Review"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", event);
    let body;
    if (event.body) {
      body = JSON.parse(event.body);
      // Performing a type check and throw an error if it's not an object
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new Error("Body is not an object");
      }
    } else {
      return {
        statusCode: 400, // Bad request status code
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    const reviewId = body.reviewId 

    const commandOutput = await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        Item: {
          ...body,
          reviewId, 
        } as Record<string, any>,
      })
    );
    return {
      statusCode: 201,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "Review added", reviewId }),
    };
  } catch (error: any) {
    console.error(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
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


