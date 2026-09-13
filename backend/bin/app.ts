import * as cdk from "aws-cdk-lib";
import { ThumbnailStack } from "../lib/ThumbnailStack";
const app = new cdk.App();

new ThumbnailStack(app, "ThumbnailGenerator", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  allowedOrigins: [
    "http://localhost:3000",
    "https://main.d338n8q9v9t6h.amplifyapp.com",
  ],
  retentionDays: 7,
  description: "Serverless image upload and thumbnail generator.",
  tags: { Project: "thumbnail-generator" },
});
