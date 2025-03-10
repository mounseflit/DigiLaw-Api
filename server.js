/**
 * @fileoverview Express server setup for Digilaw API, providing endpoints to extract text from Moroccan Bulletin Officiel PDFs
 * @requires express
 * @requires axios
 * @requires cors
 * @requires pdf-parse
 * @requires jsdom
 * 
 * @module DigilawServer
 * 
 * @route {GET} /api/Digilaw/Page
 * Extracts text from a specific page of a PDF file
 * @param {number} page - Page number to extract text from
 * @returns {Object} JSON object containing extracted text
 * 
 * @route {GET} /api/Digilaw/Companies
 * Fetches and processes the latest Bulletin Officiel PDF
 * @returns {Object} JSON object containing extracted text from up to 50 pages
 * 
 * @route {GET} /api/Digilaw/health
 * Health check endpoint
 * @returns {Object} Status object indicating API health
 * 
 * @route {GET} /
 * Default route displaying API documentation
 * @returns {string} HTML page with API documentation
 * 
 * @function GetBO
 * Helper function to get the latest available PDF URL
 * @returns {string|null} PDF URL if found, null otherwise
 * 
 * @function getlinkfor
 * Helper function to scrape PDF links from Bulletin Officiel website
 * @param {string} year - Year to search for
 * @param {string} month - Month to search for
 * @returns {string|null} PDF URL if found, null otherwise
 * 
 * @exports app - Express application instance
 * 
 * @author Mounseflit
 * @version 1.0.0
 */

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const pdfParse = require('pdf-parse');
const { JSDOM } = require('jsdom');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Helper function to scrape PDF links from Bulletin Officiel website
async function GetBO() {

    // Get current date
    const today = new Date();
    const year = String(today.getFullYear());
    const month = String(today.getMonth() + 1).padStart(2, '0');


    console.log(`Current month: ${month}, current year: ${year}`);

    // URL of the Bulletin Officiel website
    console.log('Scraping URL : https://bulletinofficiel.com/wp-content/uploads/' + year + '/' + month + '/');

    let pdfUrl = await getlinkfor(year, month);

    if (!pdfUrl) {
        const prevMonth = String(parseInt(month) - 1).padStart(2, '0');
        pdfUrl = await getlinkfor(year, prevMonth);
        if (!pdfUrl) {
            const prevprevMonth = String(parseInt(prevMonth) - 1).padStart(2, '0');
            pdfUrl = await getlinkfor(year, prevprevMonth);
        }
    }

    return pdfUrl;

}

// Helper function to scrape PDF links from Bulletin Officiel website
async function getlinkfor(year, month) {

        // URL of the Bulletin Officiel website
        const url = 'https://bulletinofficiel.com/wp-content/uploads/' + year + '/' + month + '/';

        // Fetch the website HTML
        const rep = await fetch(`https://api-scraper-nine.vercel.app/api/scrape?url=${encodeURIComponent(url)}`);

        if (!rep.ok) {
            throw new Error('Failed to scrape the website. Make sure the URL is correct.');
        }

        const dt = await rep.json();
        const dom = new JSDOM(dt.html);
        const doc = dom.window.document;

        // Remove all <script> and <style> elements
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        const styles = doc.querySelectorAll('style');
        styles.forEach(style => style.remove());
        
        // Remove all spaces
        doc.body.innerHTML = doc.body.innerHTML.replace(/\s+/g, ' ');

        // Extract text content
        const pdfAnchors = doc.querySelectorAll('a[href$=".pdf"]');
        
        if (pdfAnchors && pdfAnchors.length > 0) {
            // Get the last PDF anchor element
            const lastPdfAnchor = pdfAnchors[pdfAnchors.length - 1];
            // Construct the full URL
            const pdfUrl = 'https://bulletinofficiel.com/wp-content/uploads/' + year + '/' + month + '/' + lastPdfAnchor.href;
            // OUTPUT
            console.log('PDF URL:', pdfUrl);

            return pdfUrl;
        } else {
            return null;
        }
}

// Route to extract text from a specific page from the latest Bulletin Officiel PDF
app.get("/api/Digilaw/Page", async (req, res) => {
    try {
        
        // Get the latest Bulletin Officiel PDF URL
        const pdfUrl = await GetBO();

        // Fetch the PDF file from the remote server
        const response = await axios.get(pdfUrl, {
            responseType: "arraybuffer",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const pdfData = new Uint8Array(response.data);


        const page = parseInt(req.query.page);

        if (!page) {
            return res.status(400).json({ error: "Missing page parameter" });
        }

        max = page;
        min = page;

        // Replace the options and pdfParse section with this:
        const options = {
            max: max,
            pagerender: async function (pageData) {
                // Skip pages before min
                if (pageData.pageNumber < min) {
                    return "";
                }
                const textContent = await pageData.getTextContent();
                return textContent.items.map(item => item.str).join(' ');
            }
        };

        const data = await pdfParse(pdfData, options);

        const extractedText = data.text || "";

        // Send extracted text as response
        res.json({ text: extractedText.trim() });



    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).json({
            error: "Failed to process PDF",
            message: error.message
        });
    }
});

// Route to extract companies data from the latest Bulletin Officiel PDF
app.get("/api/Digilaw/Companies", async (_, res) => {
    try {

        // Get the latest Bulletin Officiel PDF URL
        const pdfUrl = await GetBO();

        //  Fetch the PDF file from the remote server
        const response = await axios.get(pdfUrl, {
            responseType: "arraybuffer",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const pdfData = new Uint8Array(response.data);


        
        const options = {
            max: 50 // Limit to first 50 pages
        };
        const data = await pdfParse(pdfData, options);
        const extractedText = data.text || "";

        // Send extracted text as response
        res.json({ text: extractedText.trim() });

    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).json({
            error: "Failed to process PDF",
            message: error.message
        });
    }
});

// Health check endpoint
app.get("/api/Digilaw/health", (_, res) => {
    res.status(200).json({ status: "ok" });
});

// Default route
app.get("/", (_, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Digilaw API Documentation</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                        max-width: 1000px;
                        margin: 40px auto;
                        padding: 0 20px;
                        line-height: 1.6;
                        color: #333;
                        background-color: #f8f9fa;
                    }
                    code {
                        background: #e9ecef;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-family: 'Courier New', monospace;
                        font-size: 0.9em;
                    }
                    .endpoint {
                        margin: 25px 0;
                        padding: 20px;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        background: white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .endpoint h3 {
                        margin-top: 0;
                        color: #2c5282;
                    }
                    .method {
                        color: #38a169;
                        font-weight: bold;
                    }
                    .header {
                        border-bottom: 2px solid #2c5282;
                        margin-bottom: 30px;
                        padding-bottom: 10px;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        text-align: center;
                        color: #666;
                    }
                    a {
                        color: #3182ce;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Digilaw API Documentation</h1>
                    <p>RESTful API for extracting and processing text from Moroccan Bulletin Officiel documents</p>
                </div>
                
                <div class="endpoint">
                    <h3>📄 Extract Text from Specific Page</h3>
                    <p><span class="method">GET</span> <code>/api/Digilaw/Page</code></p>
                    <p>Parameters:</p>
                    <ul>
                        <li><code>page</code>: Page number to extract (required)</li>
                    </ul>
                    <p>Example: <a href="/api/Digilaw/Page?page=1">/api/Digilaw/Page?page=1</a></p>
                </div>

                <div class="endpoint">
                    <h3>🏢 Extract Companies Data</h3>
                    <p><span class="method">GET</span> <code>/api/Digilaw/Companies</code></p>
                    <p>Automatically fetches and processes the latest Bulletin Officiel PDF (up to 50 pages)</p>
                    <p>Example: <a href="/api/Digilaw/Companies">/api/Digilaw/Companies</a></p>
                </div>

                <div class="endpoint">
                    <h3>💓 Health Check</h3>
                    <p><span class="method">GET</span> <code>/api/Digilaw/health</code></p>
                    <p>Verify API operational status</p>
                    <p>Example: <a href="/api/Digilaw/health">/api/Digilaw/health</a></p>
                </div>

                <div class="footer">
                    <p>Version 1.0.0 | Created by <a href="https://github.com/Mounseflit" target="_blank">@Mounseflit</a></p>
                    <p>© ${new Date().getFullYear()} Digilaw API. All rights reserved.</p>
                </div>
            </body>
        </html>
    `);
});

// Export for Vercel serverless function
module.exports = app;

// Start server if running directly (development)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
}


