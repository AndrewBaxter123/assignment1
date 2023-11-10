import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { movies, movieCasts } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 
    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewer", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Reviews",
    });

    reviewsTable.addLocalSecondaryIndex({
      indexName: "ReviewDateIndex",
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });
    

    
    

    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Movies",
    });

    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieCast",
    });

    movieCastsTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
    });

    
    // Functions - entry needs to match your newly created file.

    const getAllReviewsByReviewerFn = new lambdanode.NodejsFunction(this, 'GetAllReviewsByReviewerFn', {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/GetAllReviewsByReviewer.ts`, 
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const updateReviewFn = new lambdanode.NodejsFunction(this, 'UpdateReviewFn', {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/updateReview.ts`, 
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getReviewByReviewerFn = new lambdanode.NodejsFunction(this, "GetReviewByReviewerFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getReviewByReviewer.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getMovieReviewsFn = new lambdanode.NodejsFunction(this, "GetMovieReviewsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getMovieReviews.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: 'eu-west-1',
      },
     });
     

    const addMovieReviewFn = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/addReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });
    
        
        new custom.AwsCustomResource(this, "moviesddbInitData", {
          onCreate: {
            service: "DynamoDB",
            action: "batchWriteItem",
            parameters: {
              RequestItems: {
                [moviesTable.tableName]: generateBatch(movies),
                [movieCastsTable.tableName]: generateBatch(movieCasts),  // Added
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [moviesTable.tableArn, movieCastsTable.tableArn],  // Includes movie cast
          }),
        });
        
        

        // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      // 👇 enable CORS
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // '/movies' 
const moviesEndpoint = api.root.addResource("movies");

// '/movies/{movieId}' 
const movieEndpoint = moviesEndpoint.addResource("{movieId}");

// '/movies/{movieId}/reviews' 
const specificReviewsEndpoint = movieEndpoint.addResource("reviews");

// GET all reviews for a specific movie
specificReviewsEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true }));

// '/movies/{movieId}/reviews/{reviewer}'
const reviewerReviewsEndpoint = specificReviewsEndpoint.addResource("{reviewer}");

// GET reviews for a specific movie by a specific reviewer
reviewerReviewsEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewByReviewerFn, { proxy: true }));

// PUT method to update the text of a review for a specific movie by a specific reviewer
reviewerReviewsEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateReviewFn, { proxy: true }));

// '/movies/reviews' 
const generalReviewsEndpoint = moviesEndpoint.addResource("reviews");

// GET 'movies/reviews/{reviewer}'
const reviewerEndpoint = generalReviewsEndpoint.addResource('{reviewer}');
reviewerEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsByReviewerFn, {proxy: true}));

// POST method for adding a new review in general
generalReviewsEndpoint.addMethod("POST", new apig.LambdaIntegration(addMovieReviewFn, { proxy: true }));


    
    // Permissions 

    reviewsTable.grantReadData(getAllReviewsByReviewerFn);
    reviewsTable.grantReadData(getReviewByReviewerFn);
    reviewsTable.grantWriteData(addMovieReviewFn);
    reviewsTable.grantReadData(getMovieReviewsFn)
    reviewsTable.grantWriteData(updateReviewFn);

      }
    }
    