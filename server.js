// Imports and setup
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

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
    res.status(status).json({ error: 'Azure OCR failed', message });
}

// OCR from Image URL
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

// OCR from Uploaded Image File
app.post('/api/ocr/upload', (req, res, next) => {
    upload.single('file')(req, res, function (err) {
        if (!err) return next();

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File is too large, maximum size is 4MB.' });
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
