const { RekognitionClient, DetectTextCommand, DetectLabelsCommand } = require("@aws-sdk/client-rekognition");
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");
const { TranscribeClient } = require("@aws-sdk/client-transcribe");
const { ComprehendClient, DetectSentimentCommand, DetectEntitiesCommand } = require("@aws-sdk/client-comprehend");

const REGION = 'us-west-2'; // Match your Amplify region

/**
 * Lambda handler for AWS AI services
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    // Enable CORS
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { action, data } = JSON.parse(event.body || '{}');
        
        let result;
        
        switch (action) {
            case 'scanReceipt':
                result = await scanReceipt(data.image);
                break;
            
            case 'detectLabels':
                result = await detectLabels(data.image);
                break;
            
            case 'textToSpeech':
                result = await textToSpeech(data.text, data.voiceId);
                break;
            
            case 'detectSentiment':
                result = await detectSentiment(data.text);
                break;
            
            case 'detectEntities':
                result = await detectEntities(data.text);
                break;
            
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};

/**
 * 1. Amazon Rekognition - Scan Receipt (OCR)
 * Free: 5,000 images/month (first 12 months)
 */
async function scanReceipt(imageBase64) {
    const client = new RekognitionClient({ region: REGION });
    const imageBytes = Buffer.from(imageBase64, 'base64');
    
    const command = new DetectTextCommand({
        Image: { Bytes: imageBytes }
    });
    
    const response = await client.send(command);
    
    // Extract text lines
    const textDetections = response.TextDetections || [];
    const lines = textDetections
        .filter(detection => detection.Type === 'LINE')
        .map(detection => ({
            text: detection.DetectedText,
            confidence: Math.round(detection.Confidence)
        }));
    
    // Parse receipt data
    const receiptData = parseReceiptData(lines);
    
    return {
        success: true,
        service: 'rekognition',
        rawText: lines,
        parsedData: receiptData
    };
}

/**
 * Parse receipt data from OCR text
 */
function parseReceiptData(lines) {
    const items = [];
    let total = null;
    let storeName = null;
    let date = null;

    if (lines.length > 0) {
        storeName = lines[0].text;
    }

    lines.forEach((line) => {
        const text = line.text;
        const priceMatch = text.match(/\$?(\d+\.\d{2})/);
        
        if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (text.toLowerCase().includes('total') || text.toLowerCase().includes('amount')) {
                total = price;
            } else {
                items.push({
                    name: text.replace(/\$?(\d+\.\d{2})/, '').trim(),
                    price: price
                });
            }
        }

        const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (dateMatch) {
            date = dateMatch[1];
        }
    });

    return {
        storeName,
        date,
        items,
        total: total || items.reduce((sum, item) => sum + item.price, 0),
        itemCount: items.length
    };
}

/**
 * 2. Amazon Rekognition - Detect Labels (Objects in image)
 * Free: 5,000 images/month (first 12 months)
 */
async function detectLabels(imageBase64) {
    const client = new RekognitionClient({ region: REGION });
    const imageBytes = Buffer.from(imageBase64, 'base64');
    
    const command = new DetectLabelsCommand({
        Image: { Bytes: imageBytes },
        MaxLabels: 10,
        MinConfidence: 70
    });
    
    const response = await client.send(command);
    
    return {
        success: true,
        service: 'rekognition',
        labels: response.Labels.map(label => ({
            name: label.Name,
            confidence: Math.round(label.Confidence)
        }))
    };
}

/**
 * 3. Amazon Polly - Text to Speech
 * Free: 5 million characters/month (first 12 months)
 */
async function textToSpeech(text, voiceId = 'Joanna') {
    const client = new PollyClient({ region: REGION });
    
    const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'neural' // Higher quality
    });
    
    try {
        const response = await client.send(command);
        const audioStream = await streamToBuffer(response.AudioStream);
        const audioBase64 = audioStream.toString('base64');
        
        return {
            success: true,
            service: 'polly',
            audio: audioBase64,
            format: 'mp3',
            voiceId: voiceId
        };
    } catch (error) {
        // Fallback to standard engine if neural not available
        if (error.message.includes('neural')) {
            const standardCommand = new SynthesizeSpeechCommand({
                Text: text,
                OutputFormat: 'mp3',
                VoiceId: voiceId,
                Engine: 'standard'
            });
            const response = await client.send(standardCommand);
            const audioStream = await streamToBuffer(response.AudioStream);
            const audioBase64 = audioStream.toString('base64');
            
            return {
                success: true,
                service: 'polly',
                audio: audioBase64,
                format: 'mp3',
                voiceId: voiceId,
                engine: 'standard'
            };
        }
        throw error;
    }
}

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * 4. Amazon Comprehend - Detect Sentiment
 * Free: 50,000 units/month (first 12 months)
 */
async function detectSentiment(text) {
    const client = new ComprehendClient({ region: REGION });
    
    const command = new DetectSentimentCommand({
        Text: text,
        LanguageCode: 'en'
    });
    
    const response = await client.send(command);
    
    return {
        success: true,
        service: 'comprehend',
        sentiment: response.Sentiment,
        scores: {
            positive: Math.round(response.SentimentScore.Positive * 100),
            negative: Math.round(response.SentimentScore.Negative * 100),
            neutral: Math.round(response.SentimentScore.Neutral * 100),
            mixed: Math.round(response.SentimentScore.Mixed * 100)
        }
    };
}

/**
 * 5. Amazon Comprehend - Detect Entities (People, Places, Organizations)
 * Free: 50,000 units/month (first 12 months)
 */
async function detectEntities(text) {
    const client = new ComprehendClient({ region: REGION });
    
    const command = new DetectEntitiesCommand({
        Text: text,
        LanguageCode: 'en'
    });
    
    const response = await client.send(command);
    
    return {
        success: true,
        service: 'comprehend',
        entities: response.Entities.map(entity => ({
            text: entity.Text,
            type: entity.Type,
            score: Math.round(entity.Score * 100)
        }))
    };
}
