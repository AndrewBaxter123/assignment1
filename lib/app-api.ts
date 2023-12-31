import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as custom from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import { generateBatch } from "../shared/util";
import { movies, movieCasts } from "../seed/movies";
import * as iam from 'aws-cdk-lib/aws-iam';


type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

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


    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    };

    const protectedRes = api.root.addResource("protected");

    const publicRes = api.root.addResource("public");

    const protectedFn = new lambdanode.NodejsFunction(this, "ProtectedFn", {
      ...appCommonFnProps,
      entry: "./lambdas/protected.ts",
    });

    const publicFn = new lambdanode.NodejsFunction(this, "PublicFn", {
      ...appCommonFnProps,
      entry: "./lambdas/public.ts",
    });

    const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambdas/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    protectedRes.addMethod("GET", new apig.LambdaIntegration(protectedFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    publicRes.addMethod("GET", new apig.LambdaIntegration(publicFn));
  
// Above this is Auth specific ^
// ====================================
// Below is code merged from rest API
      
  
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

      
      // Functions - entry needs to match your newly created file.

      const translateReviewFn = new lambdanode.NodejsFunction(this, 'TranslateReviewFn', {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/translate.ts`, // path to your Lambda file
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            REVIEWS_TABLE_NAME: reviewsTable.tableName,
            REGION: 'eu-west-1',
        },
    });

      const deleteReviewFn = new lambdanode.NodejsFunction(this, 'DeleteReviewFn', {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/deleteReview.ts`, 
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          REVIEWS_TABLE_NAME: reviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });
      
  
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
                },
              },
              physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
              resources: [moviesTable.tableArn], 
            }),
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
  reviewerReviewsEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateReviewFn, { proxy: true }), {
    authorizer: requestAuthorizer,
    authorizationType: apig.AuthorizationType.CUSTOM,
  });
  
  // '/movies/reviews' 
  const generalReviewsEndpoint = moviesEndpoint.addResource("reviews");
  
  // GET 'movies/reviews/{reviewer}'
  const reviewerEndpoint = generalReviewsEndpoint.addResource('{reviewer}');
  reviewerEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsByReviewerFn, {proxy: true}));
  
  // POST method for adding a new review in general
  generalReviewsEndpoint.addMethod("POST", new apig.LambdaIntegration(addMovieReviewFn, { proxy: true }), {
    authorizer: requestAuthorizer,
    authorizationType: apig.AuthorizationType.CUSTOM,
  });

// Adding DELETE method to '/movies/{movieId}/reviews/{reviewer}' endpoint
reviewerReviewsEndpoint.addMethod("DELETE", new apig.LambdaIntegration(deleteReviewFn), {
  authorizer: requestAuthorizer,
  authorizationType: apig.AuthorizationType.CUSTOM,
});
// '/movies/{movieId}/reviews/{reviewer}/translation' endpoint
const translationEndpoint = reviewerReviewsEndpoint.addResource("translation");

// GET method to translate a review for a specific movie by a specific reviewer
translationEndpoint.addMethod("GET", new apig.LambdaIntegration(translateReviewFn, { proxy: true }));

  
  
  
      
      // Permissions
      reviewsTable.grantReadData(translateReviewFn);
      reviewsTable.grantReadWriteData(deleteReviewFn);
      reviewsTable.grantReadData(getAllReviewsByReviewerFn);
      reviewsTable.grantReadData(getReviewByReviewerFn);
      reviewsTable.grantWriteData(addMovieReviewFn);
      reviewsTable.grantReadData(getMovieReviewsFn)
      reviewsTable.grantReadWriteData(updateReviewFn);

      translateReviewFn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['translate:TranslateText'],
        resources: ['*'], 
    }));
  
        }



  }