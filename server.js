// Imports and setup
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;

const options = {
    swaggerDefinition: {
        openapi: '3.1.1',
        info: {
            title: 'Azure AI Vision OCR API Wrapper',
            version: '1.0.0',
            description: "This is a simple API Wrapper for Optical Character Recognition (OCR) using Microsoft’s Azure Optical Character Recognition service. It takes an image URL or file as input, applies Azure OCR to detect and extract text, and returns the recognized text in plain JSON format. Comprehensive error handling is included for invalid input, unsupported files, and Azure service failures.",
        },
        host: process.env.HOST || `localhost:${PORT}`,
        basePath: '/',
    },
    apis: ['./server.js'],
};
const specs = swaggerJsdoc(options);

app.use(express.json());
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Handles JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            error: 'Incorrectly formatted JSON in request body.',
            hint: 'Expected format: { "imageUrl": "https://example.com/image.jpg" }'
        });
    }
    next();
});

// Handles image file upload
const upload = multer({
    limits: { fileSize: 4 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed for upload.'), false);
        }
        cb(null, true);
    },
});

// Extract plain text from Azure OCR response
function extractText(data) {
    try {
        return data.regions
        .flatMap(region => region.lines)
        .flatMap(line => line.words.map(word => word.text))
        .join(' ')
        .trim();
    } catch {
        return '';
    }
}

// Handles Azure OCR response errors
function handleError(res, error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message || 'Internal Server Error';
    res.status(status).json({ error: 'Azure OCR failed.', message });
}

/**
 * @swagger
 * /api/ocr/url:
 *   post:
 *     tags: ["Endpoints"]
 *     summary: > 
 *       Takes an image URL as input, performs OCR, and returns the extracted text. The image must be between 50 and 4,200 pixels in both width and height, and can’t exceed 4MB in size.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *           example:
 *             imageUrl: "https://freerangestock.com/sample/135777/overhead-view-of-text-thank-you-arranged-on-an-old-bulletin-board.jpg"
 *     responses:
 *       200:
 *         description: Text extracted successfully or no text detected from image.
 *         content:
 *           application/json:
 *             examples:
 *               textFound:
 *                 summary: Text was extracted successfully.
 *                 value:
 *                   text: "Extracted text from the image."
 *               noTextDetected:
 *                 summary: No text found in the image.
 *                 value:
 *                   message: "No text detected in the image."
 *                   text: ""
 *       400:
 *         description: Inputted image URL caused an error with various possible causes.
 *         content:
 *           application/json:
 *             examples:
 *               invalidField:
 *                 summary: imageUrl field is missing or empty.
 *                 value:
 *                   error: "Missing or invalid 'imageUrl' in request body."
 *                   hint: "Expected format: { \"imageUrl\": \"https://example.com/image.jpg\" }"
 *               invalidJSON:
 *                 summary: Incorrect JSON format.
 *                 value:
 *                   error: "Incorrectly formatted JSON in request body."
 *                   hint: "Expected format: { \"imageUrl\": \"https://example.com/image.jpg\" }"
 *               azureError:
 *                 summary: Azure OCR service returned an error.
 *                 value:
 *                   error: "Azure OCR failed."
 *                   message: "Image URL is not accessible."
 *       500:
 *         description: Azure OCR service failed.
 *         content:
 *           application/json:
 *             example:
 *               error: "Azure OCR failed."
 *               message: "Azure endpoint error."
 */
app.post('/api/ocr/url', async (req, res) => {
    if (
        !req.body ||
        typeof req.body !== 'object' ||
        typeof req.body.imageUrl !== 'string' ||
        req.body.imageUrl.trim() === ''
    ) {
        return res.status(400).json({ 
            error: "Missing or invalid 'imageUrl' in request body.",
            hint: 'Expected format: { "imageUrl": "https://example.com/image.jpg" }'
        });
    }

    const { imageUrl } = req.body;

    try {
        const response = await axios.post(
            `${process.env.AZURE_ENDPOINT}vision/v3.2/ocr`,
            { url: imageUrl },
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.AZURE_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        const text = extractText(response.data);
        if (!text) {
            return res.status(200).json({
                message: 'No text detected in the image.',
                text: ''
            });
        }

        res.json({ text });
    } catch (error) {
        handleError(res, error);
    }
});

/**
 * @swagger
 * /api/ocr/upload:
 *   post:
 *     tags: ["Endpoints"]
 *     summary: >
 *       Takes a single image file as input, performs OCR, and returns the extracted text. The image must be between 50 and 4,200 pixels in both width and height, and can’t exceed 4MB in size.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Text extracted successfully or no text detected from image.
 *         content:
 *           application/json:
 *             examples:
 *               textFound:
 *                 summary: Text was extracted successfully.
 *                 value:
 *                   text: "Extracted text from the image."
 *               noTextDetected:
 *                 summary: No text found in the image.
 *                 value:
 *                   message: "No text detected in the image."
 *                   text: ""
 *       400:
 *         description: The image file is missing or invalid.
 *         content:
 *           application/json:
 *             examples:
 *               missingFile:
 *                 summary: No file was provided in the request.
 *                 value:
 *                   error: "Image file is missing from request body."
 *                   hint: "Send a multipart or form-data request with an image file using the field name 'file'."
 *               unexpectedField:
 *                 summary: Multiple files or incorrect field name was provided.
 *                 value:
 *                   error: "Unexpected field name in the request."
 *                   hint: "Send a single file using the field name 'file'."
 *               conversionFailed:
 *                 summary: Failed to convert unsupported image format to PNG.
 *                 value:
 *                   error: "Failed to convert the image to PNG."
 *               azureError:
 *                 summary: Azure OCR service returned an error.
 *                 value:
 *                   error: "Azure OCR failed."
 *                   message: "The height or width of the image is outside the supported range."
 *       413:
 *         description: The uploaded file is too large, exceeded 4MB.
 *         content:
 *           application/json:
 *             example:
 *               error: "File is too large, maximum size is 4MB."
 *       415:
 *         description: The file type is not supported.
 *         content:
 *           application/json:
 *             example:
 *               error: "Only image files are allowed for upload."
 *               hint: "Try these supported formats: JPG, PNG, BMP, TIFF, WEBP, AVIF."
 *       500:
 *         description: Azure OCR service failed.
 *         content:
 *           application/json:
 *             example:
 *               error: "Azure OCR failed."
 *               message: "Azure endpoint error."
 */
app.post('/api/ocr/upload', (req, res, next) => {
    upload.single('file')(req, res, function (err) {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File is too large, maximum size is 4MB.' });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ 
                    error: 'Unexpected field name in the request.',
                    hint: "Send a single file using the field name 'file'."
                });
            }
        }

        if (err.message === 'Only image files are allowed for upload.') {
            return res.status(415).json({ 
                error: err.message,
                hint: 'Try these supported formats: JPG, PNG, BMP, TIFF, WEBP, AVIF.'
            });
        }

        return res.status(400).json({ error: err.message });
    });
}, async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ 
        error: 'Image file is missing from request body.',
        hint: 'Send a multipart or form-data request with an image file using the field name "file".'
    });

    try {
        let imageBuffer = file.buffer;
        let contentType = file.mimetype;

        const azureSupportedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];

        if (!azureSupportedTypes.includes(contentType) && contentType.startsWith('image/')) {
            try {
                imageBuffer = await sharp(file.buffer).png().toBuffer();
                contentType = 'image/png';
            } catch (err) {
                return res.status(400).json({ error: 'Failed to convert the image to PNG.' });
            }
        }

        const response = await axios.post(
            `${process.env.AZURE_ENDPOINT}vision/v3.2/ocr`,
            imageBuffer,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.AZURE_API_KEY,
                    'Content-Type': 'application/octet-stream',
                },
            }
        );

        const text = extractText(response.data);
        if (!text) {
            return res.status(200).json({
                message: 'No text detected in the image.',
                text: ''
            });
        }

        res.json({ text });
    } catch (error) {
        handleError(res, error);
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
