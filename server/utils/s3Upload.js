const s3 = require('../config/s3');
require('dotenv').config();

const uploadToS3 = async (file, userId) => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `profile-pics/${userId}-${Date.now()}.${fileExtension}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read', // Make the file publicly accessible
  };

  try {
    const { Location } = await s3.upload(params).promise();
    return Location; // Returns the S3 URL
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

module.exports = uploadToS3;