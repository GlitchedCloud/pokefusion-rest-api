# PokéFusion REST API

A high-performance Node.js REST API for Pokémon Infinite Fusion that serves authentic fusion data, sprites, and statistics. Built with enterprise-grade in-memory caching for optimal performance with 150,000+ sprites and 565 Pokémon entries.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+

### Installation

1. Clone and install dependencies:

```bash
git clone --recurse-submodules -j8 https://github.com/GlitchedCloud/pokefusion-rest-api.git
cd pokefusion-rest-api
npm install
```

2. Configure environment (optional):

```bash
cp .env.example .env
# Edit .env file with your settings
```

3. Ensure sprite directories exist:

   - `src/assets/types/` - Pokemon type icons
   - `src/assets/sprites/null.png` - Fallback sprite

4. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

All endpoints use **query parameters** for clean, RESTful design.

### 🔀 Fusion Generation

#### `GET /api/fusion`

Complete fusion data with authentic Pokemon Infinite Fusion mechanics.

**Query Parameters:**

- `head` (optional): Head Pokemon name (e.g., `?head=Bulbasaur`)
- `body` (optional): Body Pokemon name (e.g., `?body=Charmander`)
- Returns random fusion if no parameters provided

**Examples:**

```http
GET /api/fusion                              # Random fusion
GET /api/fusion?head=Bulbasaur               # Bulbasaur + random body
GET /api/fusion?body=Charmander              # Random head + Charmander
GET /api/fusion?head=Bulbasaur&body=Charmander # Bulbamander fusion
```

**Response includes:**

- **Fusion Name**: Authentic split-name generation (Bulba + mander = Bulbamander)
- **Fusion ID**: Head.Body format (#1.4)
- **Image URL**: Local sprite with smart fallback (custom → autogen → null)
- **Attribution**: Sprite source tracking (custom/japeal/missing)
- **Stats**: Complete battle stats using official formulas
- **Types**: Accurate type combinations
- **Pokedex**: FusionDex entries with height, weight, category

#### `GET /api/fusion/names`

Fusion name & Fusion ID only (supports all query parameters)

#### `GET /api/fusion/types`

Type information only (supports all query parameters)

#### `GET /api/fusion/stats`

Battle statistics only (supports all query parameters)

#### `GET /api/fusion/pokedex`

Pokedex entries only (supports all query parameters)

### 📊 Pokemon Data

#### `GET /api/pokemon`

Complete list of 565 available Pokemon names

### 🖼️ Image Serving

#### `GET /api/images/fusion/{headId}/{bodyId}`

High-performance local sprite serving with smart fallbacks.

**Headers:**

- `X-Image-Source`: Attribution (custom/japeal/missing)
- `Cache-Control`: 24-hour caching for optimal performance

#### `GET /api/images/types/{typeName}`

Pokemon type icons (fire, water, grass, etc.)

#### `GET /`

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
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with appropriate logging
4. Test the performance impact with large datasets
5. Update README if adding new endpoints or features
6. Submit a pull request

### Code Standards

- Use proper logging with context parameters
- Implement in-memory caching for performance-critical operations
- Follow RESTful API conventions with query parameters
- Include appropriate error handling and fallbacks
