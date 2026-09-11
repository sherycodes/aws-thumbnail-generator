import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import {
  AttributeType,
  BillingMode,
  Table as DynamoTable,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";
import path from "node:path";

interface ThumbnailStackProps extends cdk.StackProps {
  allowedOrigins: string[];
  retentionDays: number;
}

interface SharedEnvProps {
  TABLE_NAME: string;
  BUCKET_NAME: string;
  ALLOWED_ORIGINS: string;
  RETENTION_DAYS: string;
}

export class ThumbnailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ThumbnailStackProps) {
    super(scope, id, props);

    const { retentionDays, allowedOrigins } = props;

    const mediaBucket = new s3.Bucket(this, "MediaBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: "ExpireUploads",
          enabled: true,
          prefix: "/uploads",
          expiration: cdk.Duration.days(retentionDays),
        },
        {
          id: "ExpireThumbnails",
          enabled: true,
          prefix: "/thumbnails",
          expiration: cdk.Duration.days(retentionDays),
        },
        {
          id: "AbortIncompleteUploads",
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });

    const imagesTable = new DynamoTable(this, "ImagesTable", {
      partitionKey: {
        name: "imageId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiresAt",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    imagesTable.addGlobalSecondaryIndex({
      indexName: "byUploadedAt",
      partitionKey: { name: "gsi1pk", type: AttributeType.STRING },
      sortKey: { name: "uploadedAt", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    const sharedEnv = {
      TABLE_NAME: imagesTable.tableName,
      BUCKET_NAME: mediaBucket.bucketName,
      ALLOWED_ORIGINS: allowedOrigins.join(","),
      RETENTION_DAYS: String(retentionDays),
    };

    const makeFunction = (id: string, entry: string, description: string) => {
      return new NodejsFunction(this, id, {
        entry: path.join(__dirname, "..", "src", "functions", entry),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.X86_64,
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
        tracing: lambda.Tracing.ACTIVE,
        description,
        environment: sharedEnv,
        bundling: { minify: false, sourceMap: false, target: "node22" },
        logGroup: new logs.LogGroup(this, `${id}logs`, {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });
    };

    const getUploadUrlFn = makeFunction(
      "GetUploadUrlFunction",
      "getUploadUrl.ts",
      "Mints a presigned POST policy and writes a PENDING metadata row."
    );

    const listImagesFn = makeFunction(
      "ListImagesFunction",
      "listImages.ts",
      "Queries the byUploadedAt GSI and returns presigned thumbnail URLs."
    );

    const getImageFn = makeFunction(
      "GetImageFunction",
      "getImage.ts",
      "Single-item read. This is the endpoint the frontend polls."
    );

    const deleteImageFn = makeFunction(
      "DeleteImageFunction",
      "deleteImage.ts",
      "Removes both S3 objects and then the DynamoDB row."
    );

    const generateThumbnailFn = new NodejsFunction(
      this,
      "GenerateThumbnailFunction",
      {
        entry: path.join(
          __dirname,
          "..",
          "src",
          "functions",
          "generateThumbnail.ts"
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.X86_64,
        description:
          "S3 ObjectCreated worker. Resizes to WebP and flips status to READY.",
        environment: sharedEnv,
        memorySize: 1536,
        timeout: cdk.Duration.seconds(30),
        tracing: lambda.Tracing.ACTIVE,
        bundling: {
          target: "node22",
          nodeModules: ["sharp"],
          forceDockerBundling: true,
          commandHooks: {
            beforeBundling: () => [],
            beforeInstall: () => [],
            afterBundling: (_inputDir, outputDir) => [
              `rm -rf ${outputDir}/node_modules/.bin`,
            ],
          },
        },
        logGroup: new logs.LogGroup(this, "GenerateThumbnailLogs", {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }
    );

    mediaBucket.grantPut(getUploadUrlFn, "uploads/*");
    imagesTable.grantWriteData(getUploadUrlFn);

    mediaBucket.grantRead(generateThumbnailFn, "uploads/*");
    mediaBucket.grantPut(generateThumbnailFn, "thumbnails/*");
    imagesTable.grantReadWriteData(generateThumbnailFn);
    mediaBucket.grantRead(listImagesFn, "thumbnails/*");
    imagesTable.grantReadData(listImagesFn);
    mediaBucket.grantRead(getImageFn, "thumbnails/*");
    imagesTable.grantReadData(getImageFn);
    mediaBucket.grantDelete(deleteImageFn);
    imagesTable.grantReadWriteData(deleteImageFn);

    mediaBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(generateThumbnailFn),
      { prefix: "uploads/" }
    );

    const api = new apigateway.RestApi(this, "Api", {
      restApiName: "thumbnail-generator",
      description: "Upload, list and delete images.",
      deployOptions: {
        stageName: "prod",
        tracingEnabled: true,
        throttlingRateLimit: 5,
        throttlingBurstLimit: 10,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      },
    });

    api.addGatewayResponse("Default4xx", {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type'",
      },
    });

    api.addGatewayResponse("Default5xx", {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type'",
      },
    });

    api.root
      .addResource("uploads")
      .addMethod("POST", new apigateway.LambdaIntegration(getUploadUrlFn));

    const images = api.root.addResource("images");
    images.addMethod("GET", new apigateway.LambdaIntegration(listImagesFn));

    const image = images.addResource("{imageId}");
    image.addMethod("GET", new apigateway.LambdaIntegration(getImageFn));
    image.addMethod("DELETE", new apigateway.LambdaIntegration(deleteImageFn));

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
    new cdk.CfnOutput(this, "BucketName", { value: mediaBucket.bucketName });
    new cdk.CfnOutput(this, "TableName", { value: imagesTable.tableName });
  }
}
