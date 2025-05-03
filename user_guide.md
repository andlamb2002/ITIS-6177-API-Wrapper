# API Wrapper User Guide

## Summary of API
This is a simple API Wrapper for Optical Character Recognition (OCR) using Microsoft’s Azure Optical Character Recognition service. It takes an image URL or file as input, applies Azure OCR to detect and extract text, and returns the recognized text in plain JSON format. Comprehensive error handling is included for invalid input, unsupported files, and Azure service failures.

- Base URL: `http://147.182.167.158:3000/api/ocr`
- Endpoints:
  - `POST /url`: For submitting an image URL
  - `POST /upload`: For direct image upload

## Use Cases

- Extract text from printed materials such as documents, books, and receipts
- Process screenshots or photos with printed text
- Useful for applications that require text recognition

## Image Requirements

- Supports all image file formats, including: `JPG`, `PNG`, `BMP`, `TIFF`, `WEBP`, `AVIF`, and even `GIF`
- Maximum file size: 4 MB
- Images must be between 50 and 4,200 pixels in both width and height
- If no text is detected, it returns an empty \`text\` field

## How to Use the API

### Option 1: Using the `/url` Endpoint

Send a POST request to the `/api/ocr/url` endpoint.

Use the following JSON body with your image URL:

```json
{
  "imageUrl": "https://example.com/sample.jpg"
}
```

You will receive a JSON response like this:

```json
{
  "text": "Extracted text from the image."
}
```

### Option 2: Using the `/upload` Endpoint

Send a POST request to the `/api/ocr/upload` endpoint using `multipart/form-data`.

Include a single image file with the field name `file`.

You will receive a JSON response like this:

```json
{
  "text": "Extracted text from the image."
}
```

## Examples

### Example 1: OCR with Image URL
Original Image:

<img src="samples/sample_url.jpg" width="300"/>

Extracted Text: "Thank You"

![Example 1 Screenshot](samples/result_url.png)

### Example 2: OCR with Image Upload
Original Image:

<img src="samples/sample_upload.JPG" width="300"/>

Extracted Text: "Phone Booth Work Stations"

![Example 2 Screenshot](samples/result_upload.png)
