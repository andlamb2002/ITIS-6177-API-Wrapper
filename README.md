# Azure OCR API Wrapper
### By: Andreas Lambropoulos

This is a simple API Wrapper for **Optical Character Recognition (OCR)** using **Microsoft’s Azure Optical Character Recognition** service. It allows the user to input an image and it returns the extracted text.

## API Access and Documentation

- **Base URL**: `http://147.182.167.158:3000/api/ocr`
- **Swagger UI**: [http://147.182.167.158:3000/docs/](http://147.182.167.158:3000/docs/)
- **User Guide**: See `user_guide.md` for detailed usage documentation

## Key Features

- Extracts text from an image using Azure OCR service
- Supports both image URLs and image uploads with `POST /url` and `POST /upload` endpoints
- Validates file format and size before processing
- Returns clean and readable JSON responses with status codes
- Swagger UI available for request/response formats and live testing
- Deployed to a DigitalOcean droplet with PM2 server

## Image Requirements

- **Max file size**: 4 MB
- **Supported formats**: All image formats, including JPG, PNG, BMP, TIFF, WEBP, AVIF, and even GIF
- **Dimensions**: Images must be between 50 and 4,200 pixels in both width and height

## Tech Stack and Implementation

- **Node.js + Express** – Backend server framework for handling API endpoints
- **Axios** – Sends HTTP requests to Azure OCR's REST API with proper headers and body
- **CORS** – Enables cross-origin access for API testing
- **Multer** – Handles file uploads with `multipart/form-data` and enforces the 4MB size limit
- **Sharp** – Converts unsupported image formats (like WebP or AVIF) to PNG to ensure compatibility with Azure OCR
- **Swagger (swagger-jsdoc + swagger-ui-express)** – Automatic generator for interactive API documentation
- **DigitalOcean Droplet** – Continuously hosts the Express server with PM2

## Image Sources

You can find these images in the `test_data/` folder of this repository, which were obtained from:
- [MSRA-TD500 Text Detection Dataset](http://www.iapr-tc11.org/mediawiki/index.php?title=MSRA_Text_Detection_500_Database_(MSRA-TD500))
- Other custom image searches and manually created examples

## Build Your Own Local OCR API

1. Clone the repository:  
   `git clone https://github.com/andlamb2002/ITIS-6177-API-Wrapper.git`

2. Install dependencies:  
   `npm install`

3. Create an Azure Computer Vision resource through the [Azure Portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesComputerVision). Then, add a `.env` file in the root directory with your Azure credentials:  
   ```env
   AZURE_API_KEY=your_api_key
   AZURE_ENDPOINT=https://your-azure-endpoint/
   ```

4. Start the server:
    ```bash
    node server.js
    ```

5. Test the API endpoints:

- `POST http://localhost:3000/api/ocr/url` – Submit an image URL in a JSON body using the `imageUrl` field  
- `POST http://localhost:3000/api/ocr/upload` – Upload an image file using `multipart/form-data` with the field name `file`

Or access the Swagger UI at: `http://localhost:3000/docs`