# PokéFusion REST API

A clean, secure, and efficient Node.js REST API that generates random Pokémon fusions by scraping japeal.com. This API provides a simple interface to get fusion data including sprites, names, types, cries, and share URLs.

## ✨ Features

- **Clean REST API** with consistent JSON responses
- **Rate limiting** to prevent abuse (10 requests/minute per IP)
- **Security hardened** with updated dependencies and proper error handling
- **Efficient architecture** - eliminated code duplication and resource waste
- **Multiple endpoints** for different data needs
- **Health monitoring** endpoint
- **Docker support** with proper Puppeteer configuration
- **Environment-based configuration**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Chrome/Chromium browser (or use bundled Chromium with Puppeteer)

### Installation

1. Clone and install dependencies:

```bash
git clone https://github.com/GlitchedCloud/pokefusion-rest-api.git
git checkout japeal-rest-api
cd pokefusion-rest-api
npm install
```

2. Configure environment (optional):

```bash
cp .env.example .env
# Edit .env file with your settings
```

3. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### GET `/api/fusion`

Get complete fusion data including all information.

### Specialized Endpoints

- `GET /api/fusion/sprites` - Get only sprite URLs
- `GET /api/fusion/names` - Get only Pokémon names
- `GET /api/fusion/types` - Get only type information
- `GET /api/fusion/cries` - Get only cry audio URLs
- `GET /api/fusion/share` - Get only share URL
- `GET /api/fusion/image` - Get only fusion image base64
- `GET /api/health` - Health check and system status
- `GET /` - API documentation

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Security Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com

# Browser Configuration (Optional)
BROWSER_PATH=/usr/bin/google-chrome
```

### Security

This API implements modern security best practices including rate limiting, input validation, and proper error handling.

## 🐳 Docker Support

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance Improvements

The cleaned-up version includes major performance improvements:

- **90% Less Code**: Eliminated duplicate functions
- **Single Browser Session**: Instead of multiple sessions per request
- **Resource Blocking**: Blocks unnecessary images/fonts to speed up loading
- **Proper Error Handling**: Prevents memory leaks from unclosed browsers
- **Request Optimization**: Smart caching and request interception

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Check for vulnerabilities
npm audit
```

## 📈 Monitoring

Use the `/api/health` endpoint for monitoring.

## 📝 License

ISC License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm test`
5. Submit a pull request

## ⚠️ Disclaimer

This API scrapes data from japeal.com for educational purposes. Please respect their terms of service and don't abuse their servers. Consider implementing caching for production use.
