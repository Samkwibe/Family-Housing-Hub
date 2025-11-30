# Family Housing Hub - Python Backend API

## Features

- **AI Services**: Enhanced chat, image analysis, meal planning
- **Budget Analysis**: Smart spending analysis and recommendations
- **Location Services**: Real nearby places, geocoding
- **Automation**: Reminders, notifications, data processing

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run the server:
```bash
python app.py
# Or with gunicorn:
gunicorn app:app --bind 0.0.0.0:5000
```

## API Endpoints

- `POST /api/ai/chat` - AI chat with context
- `POST /api/ai/analyze-image` - Analyze food images
- `POST /api/meals/generate-plan` - Generate meal plans
- `POST /api/budget/analyze` - Analyze budget
- `POST /api/location/nearby-places` - Get nearby places
- `POST /api/automation/reminders` - Create reminders
- `GET /api/health` - Health check

## Deployment

This backend can be deployed to:
- Heroku
- Railway
- Render
- Google Cloud Run
- AWS Elastic Beanstalk

