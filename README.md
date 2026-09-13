# Thumbnail Generator

Upload an image, it gets resized into a thumbnail automatically. Serverless app built on AWS.

**Live:** https://main.d338n8q9v9t6h.amplifyapp.com

## How it works

1. You drop an image on the page.
2. Frontend asks the backend for a presigned upload URL (`POST /uploads`). A row is created in DynamoDB with status `PENDING`.
3. Browser uploads the file straight to S3 using that presigned URL, no backend involved in the actual upload.
4. S3 fires an event when the file lands in `uploads/`. A Lambda function resizes it with `sharp`, saves the thumbnail into `thumbnails/`, and updates the DynamoDB row to `READY` (or `FAILED`).
5. Frontend polls `GET /images/{id}` until it's `READY`, then shows the thumbnail.
6. `GET /images` lists everything. You can also delete an image, which removes it from both S3 and DynamoDB.

## Stack

**Backend**

- AWS Lambda (Node 22, TypeScript)
- API Gateway (REST)
- S3 for original + thumbnail images
- DynamoDB for metadata
- AWS CDK for infra
- sharp for image resizing

**Frontend**

- Next.js 16 (App Router), static export
- Tailwind v4 + shadcn/ui
- Deployed on AWS Amplify Hosting

**CI/CD**

- GitHub Actions deploys the backend on push (OIDC, no AWS keys stored in GitHub)
- Amplify rebuilds the frontend on push

## Running locally

Needs Node 22+, an AWS account, and the AWS CLI configured.

**Backend**

```bash
cd backend
npm install
npx cdk bootstrap   # only needed once per AWS account/region
npx cdk deploy
```

This prints the API URL, S3 bucket name, and table name once done.

**Frontend**

```bash
cd frontend
npm install
```

Create a `.env` file:

```
NEXT_PUBLIC_API_URL=<the ApiUrl from the cdk deploy output>
```

Then:

```bash
npm run dev
```
