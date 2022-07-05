// import dependencies from node_modules
const SDK = require("aws-sdk");
const SHARP = require("sharp");

// instantiate S3 helper
const s3 = new SDK.S3();

// pull in environment variables that we specified in lambda settings
const BUCKET_NAME = process.env.BUCKET_NAME;

// export handler function that is needed for lambda execution
exports.handler = async function (event, context, callback) {
  // parse request parameters to get width, height, and bucket key
  const key = event.rawPath.slice(1);
  const params = key.split("/");
  const size = params[0];
  const path = params[1];

  const dimensions = size.split("x");
  const width = parseInt(dimensions[0], 10);
  const height = parseInt(dimensions[1], 10);

  // fetch the original image from S3
  try {
    var origimage = await s3
      .getObject({ Bucket: BUCKET_NAME, Key: path })
      .promise();
  } catch (error) {
    console.log("Could not get object from s3");
    console.log(error);

    return {
      statusCode: "400",
      body: JSON.stringify(error),
    };
  }

  try {
    var buffer = await SHARP(origimage.Body)
      .rotate()
      .resize(width, height === 0 ? undefined : height)
      .jpeg({ mozjpeg: true })
      .toBuffer();
  } catch (error) {
    console.log("Could not resize photo");
    console.log(error);

    return {
      statusCode: "400",
      body: JSON.stringify(error),
    };
  }

  try {
    await s3
      .putObject({
        Body: buffer,
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: "image/jpeg",
        ContentDisposition: "inline", // ensure that the browser will display S3 images inline
      })
      .promise();

    return {
      statusCode: "301",
      headers: {
        location: `http://${BUCKET_NAME}.s3-website.eu-west-2.amazonaws.com/${key}`,
      },
      body: "",
    };
  } catch (error) {
    console.log("Could not upload photo to s3");
    console.log(error);

    return {
      statusCode: "400",
      body: JSON.stringify(error),
    };
  }
};
