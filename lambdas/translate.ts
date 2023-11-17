import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import apiResponses from './common/apiResponses';
import * as AWS from 'aws-sdk';


const translate = new AWS.Translate();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log("Received event:", JSON.stringify(event));
    try {
        const reviewer = event.pathParameters?.reviewer;
        const language = event.queryStringParameters?.language;

        const movieIdStr = event.pathParameters?.movieId ?? '';
        const movieId = parseInt(movieIdStr, 10);
        
        if (isNaN(movieId)) {
            // Handle the error appropriately
            console.error('movieId is not a number:', movieIdStr);
            return apiResponses._400({ message: 'movieId must be a number' });
        }
        
        
        
        if (!movieId || !reviewer) {
            return apiResponses._400({ message: 'Missing movieId or reviewer in the path parameters' });
        }
        if (!language) {
            return apiResponses._400({ message: 'Missing language code in query parameters' });
        }

        const reviewResult = await dynamoDb.get({
            TableName: 'Reviews', 
            Key: { 
                movieId: movieId,  
                reviewer: reviewer  
            }
        }).promise();

        const reviewBody = reviewResult.Item?.reviewText; // Replace 'reviewText' with your actual DynamoDB field name

        if (!reviewBody) {
            return apiResponses._400({ message: 'Review not found' });
        }

        const translateParams = {
            Text: reviewBody,
            SourceLanguageCode: 'en', 
            TargetLanguageCode: language
        };
        const translatedMessage = await translate.translateText(translateParams).promise();

 
        return apiResponses._200({translateText: translatedMessage.TranslatedText });
    } catch (error) {
        console.error('Error caught in the Lambda function:', error.message);
        console.log(error.stack);
        return apiResponses._400({ message: 'unable to translate the message' });
    }
};
