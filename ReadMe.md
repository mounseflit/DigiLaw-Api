# DigiLaw Project

## Overview
DigiLaw API is a Node.js API service that extracts and processes text from Moroccan Bulletin Officiel PDFs. It provides endpoints to fetch specific pages or company data from the latest available bulletins.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/DigiLaw.git

# Install dependencies
npm install

# Start the server
npm start
```

## Usage
The API can be accessed through HTTP requests to the following base URL:
```
http://localhost:3000
```

## Features
- PDF text extraction from Bulletin Officiel
- Automatic latest bulletin detection
- Page-specific text extraction
- Company data processing
- CORS enabled
- Health check monitoring

## API Endpoints
- `GET /api/Digilaw/Page` - Extract text from specific page
- `GET /api/Digilaw/Companies` - Process latest bulletin
- `GET /api/Digilaw/health` - Check API status
- `GET /` - API documentation

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact
Created by [@Mounseflit](https://github.com/Mounseflit)