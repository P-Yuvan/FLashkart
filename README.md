# FlashCart — AI-Powered Autonomous Shopping Platform

A full-stack retail checkout platform where users scan products, add them to a cart, pay digitally, and exit without waiting in billing queues — powered by an intelligent AI shopping agent.

---

## Quick Start

### 1. Backend Setup

```bash
cd flashcart/backend
npm install
cp .env.example .env
# Edit .env with your credentials (see below)
npm run seed     # seed 30+ products + admin account
npm run dev      # starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd flashcart/frontend
npm install
cp .env.example .env
npm run dev      # starts on http://localhost:5173
```

Open **http://localhost:5173**

---

## Environment Variables

### `backend/.env`

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/flashcart?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_64_characters_long
OPENAI_API_KEY=sk-proj-your-openai-api-key
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Demo Accounts (after seeding)

| Role  | Email                    | Password    |
|-------|--------------------------|-------------|
| Admin | admin@flashcart.com      | Admin@1234  |
| User  | demo@flashcart.com       | Demo@1234   |

---

## Features

### User
- Signup / Login with JWT authentication
- Home product catalog with search + category filters
- **Barcode/QR scanner** via device camera (`html5-qrcode`)
- Cart management with real-time totals
- Checkout with UPI / Card / Wallet / Cash simulation
- Digital receipt with receipt ID
- Order history with item details
- Profile page with budget and preferences
- **Floating AI assistant button** on every page

### AI Agent (OpenAI GPT-4o + Function Calling)
- Natural language conversation
- `search_products` — finds products by name, category, price, tags
- `add_to_cart` — adds items directly to cart
- `get_cart` — shows current cart contents
- `remove_from_cart` — removes items
- `check_budget` — compares cart total to user budget
- Goal-based shopping: "interview outfit", "party look", "casual fit"
- Budget alerts
- Store navigation guidance (Zone A–D)
- Session memory via message history (last 14 turns)

### Admin
- Analytics dashboard (revenue, orders, users, category breakdown)
- Product CRUD with full form (barcode, RFID, image, tags, discount price)
- Transaction log with expandable order details

---

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS          |
| Routing  | React Router v6                       |
| HTTP     | Axios with JWT interceptors           |
| Scanner  | html5-qrcode                          |
| Icons    | lucide-react                          |
| Backend  | Node.js, Express 4                    |
| Auth     | JWT + bcryptjs                        |
| Database | MongoDB + Mongoose                    |
| AI       | OpenAI GPT-4o (function calling)      |
| Receipts | uuid                                  |

---

## Project Structure

```
flashcart/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/          # User, Product, Cart, Order
│   │   ├── middleware/      # auth, adminOnly
│   │   ├── routes/          # auth, products, cart, orders, ai, admin
│   │   └── utils/aiAgent.js # OpenAI function calling engine
│   ├── seed.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js
        ├── context/         # AuthContext, CartContext
        ├── components/      # Navbar, ProductCard, CartItem, ChatWindow, FloatingAIButton
        └── pages/           # Home, Scanner, Cart, Checkout, Receipt, Orders, Profile, AIAssistant
            └── admin/       # Dashboard, Products, Transactions
```

---

## AI Agent — Example Prompts

```
"Show me shirts under ₹1000"
"Build an interview outfit for a man"
"I need a party outfit under ₹3000"
"Add the first one to my cart"
"What's in my cart?"
"Am I within my budget?"
"Remove the jeans from my cart"
"Show me today's best deals"
"Where are the electronics in the store?"
```

---

## Future Scope

- Voice interaction (Web Speech API)
- Indoor navigation map overlay
- Autonomous RFID checkout mode
- Loyalty points system
- Push notifications for deals
