# PokéFusion REST API

A clean, secure, and efficient Node.js REST API that generates Pokémon fusions using local data. This API provides fusion data including names, types, fusion images, and Pokemon details with sub-millisecond response times.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+

### Installation

1. Clone and install dependencies:

```bash
git clone https://github.com/GlitchedCloud/pokefusion-rest-api.git
cd pokefusion-rest-api
npm install
```

2. Configure environment (optional):

```bash
cp .env.example .env
# Edit .env file with your settings
```

3. Place Pokemon type images in `src/assets/types/` following the naming convention in `src/assets/types/README.md`.

4. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### GET `/api/fusion`

Get complete fusion data (all information)

### GET `/api/fusion/names`

Get only Pokémon names

### GET `/api/fusion/types`

Get only type information

### GET `/api/fusion/image`

Get only fusion image base64

### GET `/api/pokemon`

Get list of all available Pokémon with types

### GET `/api/pokemon/types`

Get complete Pokemon type mapping data

### GET `/api/images/fusion/{head}/{body}`

Get fusion image by head and body Pokemon ids

### GET `/api/images/types/{type}`

Get Pokemon type icon by type name

### GET `/`

API Status and metadata

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

## 🐳 Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Check for vulnerabilities
npm audit
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm test`
5. Submit a pull request
