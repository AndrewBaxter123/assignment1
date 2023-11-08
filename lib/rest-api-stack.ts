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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Reviews",
    });

    reviewsTable.addGlobalSecondaryIndex({
      indexName: "ReviewerIndex",
      partitionKey: {
        name: "reviewer", //attribute to be used as the partition key for Secondary index
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "year", // sort by year
        type: dynamodb.AttributeType.STRING,
      },
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

    
    // Functions 

    const getReviewByReviewerFn = new lambdanode.NodejsFunction(this, "GetReviewByReviewerFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getReviewByReviewer.ts`, // path to your lambda file
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


    // const getMovieByIdFn = new lambdanode.NodejsFunction(
    //   this,
    //   "GetMovieByIdFn",
    //   {
    //     architecture: lambda.Architecture.ARM_64,
    //     runtime: lambda.Runtime.NODEJS_16_X,
    //     entry: `${__dirname}/../lambdas/getMovieById.ts`,
    //     timeout: cdk.Duration.seconds(10),
    //     memorySize: 128,
    //     environment: {
    //       TABLE_NAME: moviesTable.tableName,
    //       REGION: 'eu-west-1',
    //     },
    //   }
    //   );
      
    //   const getAllMoviesFn = new lambdanode.NodejsFunction(
    //     this,
    //     "GetAllMoviesFn",
    //     {
    //       architecture: lambda.Architecture.ARM_64,
    //       runtime: lambda.Runtime.NODEJS_16_X,
    //       entry: `${__dirname}/../lambdas/getAllMovies.ts`,
    //       timeout: cdk.Duration.seconds(10),
    //       memorySize: 128,
    //       environment: {
    //         TABLE_NAME: moviesTable.tableName,
    //         REGION: 'eu-west-1',
    //       },
    //     }
    //     );

    //     const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
    //       architecture: lambda.Architecture.ARM_64,
    //       runtime: lambda.Runtime.NODEJS_16_X,
    //       entry: `${__dirname}/../lambdas/addMovie.ts`,
    //       timeout: cdk.Duration.seconds(10),
    //       memorySize: 128,
    //       environment: {
    //         TABLE_NAME: moviesTable.tableName,
    //         REGION: "eu-west-1",
    //       },
    //     });
    //     const getMovieCastMembersFn = new lambdanode.NodejsFunction(
    //       this,
    //       "GetCastMemberFn",
    //       {
    //         architecture: lambda.Architecture.ARM_64,
    //         runtime: lambda.Runtime.NODEJS_16_X,
    //         entry: `${__dirname}/../lambdas/getMovieCastMember.ts`,
    //         timeout: cdk.Duration.seconds(10),
    //         memorySize: 128,
    //         environment: {
    //           TABLE_NAME: movieCastsTable.tableName,
    //           REGION: "eu-west-1",
    //         },
    //       }
    //     );

    //     const removeMovieFn = new lambdanode.NodejsFunction(this, "DeleteMovieFn", {
    //       architecture: lambda.Architecture.ARM_64,
    //       runtime: lambda.Runtime.NODEJS_16_X,
    //       entry: `${__dirname}/../lambdas/deleteMovie.ts`,
    //       timeout: cdk.Duration.seconds(10),
    //       memorySize: 128,
    //       environment: {
    //         TABLE_NAME: moviesTable.tableName,
    //         REGION: "eu-west-1",
    //       },
    //     });

      
        
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

    const moviesEndpoint = api.root.addResource("movies");
    // moviesEndpoint.addMethod(
    //   "GET",
    //   new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
    // );

     const movieEndpoint = moviesEndpoint.addResource("{movieId}");
    // movieEndpoint.addMethod(
    //   "GET",
    //   new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
    // );
    // // NEW
    // moviesEndpoint.addMethod(
    //   "POST",
    //   new apig.LambdaIntegration(newMovieFn, { proxy: true })
    // );
    // movieEndpoint.addMethod(
    //   "DELETE",
    //   new apig.LambdaIntegration(removeMovieFn, { proxy: true })
    // );
    // const movieCastEndpoint = moviesEndpoint.addResource("cast");
    // movieCastEndpoint.addMethod(
    //   "GET",
    //   new apig.LambdaIntegration(getMovieCastMembersFn, { proxy: true })
    // );
    const reviewsEndpoint = moviesEndpoint.addResource("reviews")
    reviewsEndpoint.addMethod(
      "POST", 
      new apig.LambdaIntegration(addMovieReviewFn, { proxy: true }));

    const reviewEndpoint = movieEndpoint.addResource("reviews")
    reviewEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true }));

      const reviewerReviewsEndpoint = reviewsEndpoint.addResource("{reviewer}");

reviewerReviewsEndpoint.addMethod(
  "GET",
  new apig.LambdaIntegration(getReviewByReviewerFn, { proxy: true })
);

    
    // Permissions 
    reviewsTable.grantReadData(getReviewByReviewerFn);
    reviewsTable.grantWriteData(addMovieReviewFn);
    reviewsTable.grantReadData(getMovieReviewsFn)
    // moviesTable.grantReadData(getMovieByIdFn)
    // moviesTable.grantReadData(getAllMoviesFn)
    // moviesTable.grantReadWriteData(newMovieFn)
    
    // movieCastsTable.grantReadData(getMovieCastMembersFn);
    // moviesTable.grantReadWriteData(removeMovieFn);
    // movieCastsTable.grantReadWriteData(getMovieByIdFn);

      }
    }
    