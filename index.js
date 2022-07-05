// import dependencies from node_modules
const SDK = require("aws-sdk");
const SHARP = require("sharp");

// instantiate S3 helper
const s3 = new SDK.S3();

// pull in environment variables that we specified in lambda settings
const BUCKET = "bonvih-photos-of-items";
const BUCKET_STATIC_WEBSITE_URL =
  "http://bonvih-photos-of-items.s3-website.eu-west-2.amazonaws.com";

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
    var origimage = await s3.getObject({ Bucket: BUCKET, Key: path }).promise();
  } catch (error) {
    console.log("Could not get object from s3");
    console.log(error);
    // callback(error, null);
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
    // callback(error, null);
    return {
      statusCode: "400",
      body: JSON.stringify(error),
    };
  }

  try {
    await s3
      .putObject({
        Body: buffer,
        Bucket: BUCKET,
        Key: key,
        ContentType: "image/jpeg",
        ContentDisposition: "inline", // ensure that the browser will display S3 images inline
      })
      .promise();

    // callback(null, {
    //   statusCode: "301",
    //   headers: { location: `${BUCKET_STATIC_WEBSITE_URL}/${key}` },
    //   body: "",
    // });
    return {
      statusCode: "301",
      headers: { location: `${BUCKET_STATIC_WEBSITE_URL}/${key}` },
      body: "",
    };
  } catch (error) {
    console.log("Could not upload photo to s3");
    console.log(error);
    // callback(error, null);
    return {
      statusCode: "400",
      body: JSON.stringify(error),
    };
  }

  // S3.getObject({ Bucket: BUCKET, Key: path }, (err, data) => {
  //   if (err) {
  //     callback(err, null);
  //   }
  //   // use Sharp (https://www.npmjs.com/package/sharp)
  //   // a node.js image conversion library, to resize the image.
  //   // .rotate.resize(width, height === 0 ? undefined : height)
  //   SHARP(data.Body)
  //     .resize(width, height)
  //     .jpeg({ mozjpeg: true })
  //     .toBuffer()
  //     .then((buffer) =>
  //       // create a new entry in S3 with our resized image
  //       // the key is unique per size - i.e. 300x300/image.jpg
  //       S3.putObject(
  //         {
  //           Body: buffer,
  //           Bucket: BUCKET,
  //           Key: key,
  //           ContentType: "image/jpeg",
  //           ContentDisposition: "inline", // ensure that the browser will display S3 images inline
  //         },
  //         () =>
  //           // generate lambda response with the location of the newly uploaded file
  //           callback(null, {
  //             statusCode: "301",
  //             headers: { location: `${BUCKET_STATIC_WEBSITE_URL}/${key}` },
  //             body: "",
  //           })
  //       )
  //     );
  // });
};
