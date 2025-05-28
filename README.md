# 🌐 CrawlNet

An intelligent web scraping platform with automated order tracking for OnlineHomeShop.com, featuring a React frontend with Clerk authentication and a FastAPI backend.

## 🚀 Features

- **🔐 Clerk Authentication**: Secure user authentication with protected routes
- **📊 Order Scraping**: Automated scraping of OnlineHomeShop orders
- **💾 MongoDB Storage**: Persistent order data storage
- **📱 Modern UI**: Beautiful React interface with Blueprint.js components
- **⚡ FastAPI Backend**: High-performance Python API
- **🔧 Simple Configuration**: Minimal environment setup

## 🏗️ Project Structure

```
🌐CrawlNet/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── pages/             # Page components
│   └── main.tsx           # App entry point
├── python-scripts/        # FastAPI backend
│   ├── main.py            # FastAPI server
│   ├── scrape_orders.py   # Web scraping logic
│   ├── start_server.py    # Server startup script
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Backend environment variables
├── .env                   # Frontend environment variables
└── README.md
```

## 🛠️ Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **MongoDB** (local or cloud)
- **Chrome/Chromium** (for web scraping)

## ⚙️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd CrawlNet

# Install frontend dependencies
npm install

# Set up Python virtual environment
cd python-scripts
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Environment Configuration

#### Frontend Environment (`.env`)
```bash
# API Configuration
VITE_API_URL=http://localhost:8000

# Clerk Authentication (get from https://clerk.dev)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here

# Development
VITE_DEV=true
```

#### Backend Environment (`python-scripts/.env`)
```bash
# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017

# OnlineHomeShop Credentials
OHS_EMAIL=your_email@example.com
OHS_PASSWORD=your_password

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
```

### 3. Clerk Authentication Setup

1. Go to [Clerk.dev](https://clerk.dev) and create an account
2. Create a new project
3. Copy your **Publishable Key** from the dashboard
4. Add it to your `.env` file as `VITE_CLERK_PUBLISHABLE_KEY`

### 4. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB locally (macOS with Homebrew)
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Option B: MongoDB Atlas (Cloud)**
```bash
# Get connection string from MongoDB Atlas
# Update MONGO_URI in python-scripts/.env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

## 🚀 Running the Application

### Start the Backend

```bash
cd python-scripts
source venv/bin/activate  # Activate virtual environment
python start_server.py    # Start FastAPI server
```

The API will be available at: `http://localhost:8000`
- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

### Start the Frontend

```bash
# In a new terminal, from project root
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## 🔐 Authentication Flow

1. **Public Access**: Landing page is accessible to everyone
2. **Protected Routes**: `/ohs` requires authentication
3. **Sign In**: Users can sign in via Clerk modal or dedicated page
4. **Navigation**: OHS button only shows when user is signed in

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and configuration |
| `/orders` | GET | Scrape fresh orders and return data |
| `/orders_db` | GET | Get orders from database |
| `/orders_db` | DELETE | Clear all orders from database |

## 🐛 Troubleshooting

### Common Issues

**1. Module Not Found Errors**
```bash
# Ensure virtual environment is activated
cd python-scripts
source venv/bin/activate
pip install -r requirements.txt
```

**2. Clerk Authentication Errors**
```bash
# Check your .env file has the correct Clerk key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key
```

**3. MongoDB Connection Issues**
```bash
# Check MongoDB is running
brew services list | grep mongodb
# Or check connection string for Atlas
```

**4. CORS Errors**
```bash
# Ensure your frontend URL is in CORS_ORIGINS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 🔧 Development Scripts

```bash
# Frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build

# Backend
python start_server.py     # Start FastAPI server
python scrape_orders.py    # Run scraper directly
python main.py             # Alternative server start
```

## 📝 Environment Variables Reference

### Frontend Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | _(required)_ | Clerk authentication key |
| `VITE_DEV` | `true` | Development mode flag |

### Backend Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `localhost URLs` | Comma-separated list of allowed origins |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `OHS_EMAIL` | _(required)_ | OnlineHomeShop login email |
| `OHS_PASSWORD` | _(required)_ | OnlineHomeShop password |
| `API_HOST` | `0.0.0.0` | FastAPI server host |
| `API_PORT` | `8000` | FastAPI server port |
| `DEBUG` | `True` | Enable debug logging and auto-reload |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ by [Anuraj](https://anuraj.online)** 