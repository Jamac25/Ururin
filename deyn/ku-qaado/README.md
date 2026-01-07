# Ku Qaado - Credit Management System

A complete MVP for managing customer credit/debt with merchant mobile app, customer web portal, and WhatsApp integration.

## Project Structure

```
ku-qaado/
  server/          # Node.js + Express backend
  mobile/          # Expo React Native merchant app
  web/             # Customer web portal (static HTML)
```

## Features

- **Merchant Mobile App**: Customer list, profile view, debt creation, WhatsApp link sharing
- **Customer Web Portal**: View debts, approve pending transactions
- **Credit Management**: Automatic limit checking, overdue detection
- **WhatsApp Integration**: Share customer profile links via wa.me

## Setup & Running

### 1. Backend (Port 5173)

```bash
cd server
npm install
npm run dev
```

The API will be available at `http://localhost:5173`

### 2. Customer Web Portal (Port 5174)

```bash
# Install serve globally if you don't have it
npm install -g serve

# Serve the web directory
serve -l 5174 web
```

Open in browser: `http://localhost:5174/?customer=cus_1`

### 3. Mobile App (Expo)

```bash
cd mobile
npm install
npx expo start
```

**Important**: For testing on a physical device, update the `API` constant in `mobile/App.js` to your computer's LAN IP address (e.g., `http://192.168.1.100:5173`).

## API Endpoints

### Merchant APIs
- `GET /api/shop/:shopId/customers` - List all customers
- `GET /api/customers/:customerId` - Get customer details with debts
- `POST /api/customers` - Create new customer
- `POST /api/debts` - Create new debt
- `POST /api/debts/:debtId/paid` - Mark debt as paid

### Customer Public APIs
- `GET /api/public/customer/:customerId` - Get customer profile (public)
- `POST /api/public/debts/:debtId/approve` - Approve pending debt

## Data Model

### Customer
- `id`, `shopId`, `name`, `phone`, `creditLimit`

### Debt
- `id`, `shopId`, `customerId`, `createdAt`, `dueAt`
- `status`: PENDING | APPROVED | PAID | OVERDUE
- `items`: Array of `{ name, qty, unitPrice }`

## Business Rules

1. **Credit Limit**: Customer cannot create new debt if total open debt >= credit limit
2. **Overdue**: Customer cannot create new debt if they have any overdue debts
3. **Auto-Overdue**: Debts are automatically marked OVERDUE when past due date
4. **Approval Flow**: New debts start as PENDING, customer approves via web link

## WhatsApp Integration

The MVP uses `wa.me` links to share customer profile URLs. The merchant can send the link directly from the mobile app, and the customer receives a message with their profile link.

## Next Steps

- Add persistent database (PostgreSQL, MongoDB)
- Implement WhatsApp Business API for automated messaging
- Add authentication for merchant
- Add payment tracking and history
- Add SMS notifications as backup
- Deploy to production

## Tech Stack

- **Backend**: Node.js, Express, nanoid
- **Mobile**: React Native, Expo
- **Web**: Vanilla HTML/CSS/JavaScript
- **Database**: In-memory (for MVP)
