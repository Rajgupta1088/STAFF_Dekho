const AWS = require("aws-sdk");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});


const uploadImage = async (file) => {
    try {

        if (!file || !file.path || !file.originalFilename) {
            throw new Error('File data is incomplete');
        }

        const fileContent = fs.readFileSync(file.path);

        const s3Params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME, // Bucket name from environment variables
            Key: `uploads/${uuidv4()}_${file.originalFilename}`, // File key for S3 (file path within the bucket)
            Body: fileContent, // File content to upload
            ContentType: file.mimetype, // MIME type of the file
            ACL: "public-read", // Set file permissions (public-read allows anyone to view the file)
        };

        const s3Upload = await s3.upload(s3Params).promise();

        console.log('oo', s3Upload)
        fs.unlinkSync(file.path);

        return { success: true, url: s3Upload.Location };
    } catch (error) {
        console.log('err', error.message)
        return { success: false, path: `/uploads/${file.filename}` };
    }
};


const uploadPdfToS3 = async (pdfPath) => {
    try {
        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('PDF file does not exist');
        }

        const fileContent = fs.readFileSync(pdfPath);
        const fileName = `${uuidv4()}_${path.basename(pdfPath)}`;

        const s3Params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `uploads/${fileName}`, // Store PDFs inside "pdfs" folder in S3
            Body: fileContent,
            ContentType: "application/pdf",
            ACL: "public-read"
        };

        const s3Upload = await s3.upload(s3Params).promise();

        // Remove the local PDF file after uploading
        fs.unlinkSync(pdfPath);

        return { success: true, url: s3Upload.Location };
    } catch (error) {
        console.error("PDF Upload Error:", error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    uploadImage, uploadPdfToS3
};
