import { NextRequest, NextResponse } from 'next/server';
import { handleError, respondOk } from '@/utils/api-utils';
import { ErrorCode } from '@/types/errors';
import { createToken } from '@/utils/token-utils';
import type { AssetBalance, Transaction, TransactionType, TransactionStatus, Paginated, CashOutResponse, QRData, Contact } from '@/types';

// In-memory transactions store
const now = new Date();
const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
const TRANSACTION_TYPES: TransactionType[] = ['transfer', 'deposit', 'withdraw'];
const TRANSACTION_STATUSES: TransactionStatus[] = ['pending', 'completed', 'failed'];
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateTransactions(): Transaction[] {
  const count = getRandomInt(50, 100);
  const dates: number[] = [];
  const hotDaysCount = getRandomInt(3, 7);
  const hotDays: number[] = [];
  for (let i = 0; i < hotDaysCount; i++) {
    const d = new Date(oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime()));
    d.setHours(0, 0, 0, 0);
    hotDays.push(d.getTime());
  }
  hotDays.forEach((day) => {
    const txCount = getRandomInt(4, 8);
    for (let j = 0; j < txCount; j++) {
      dates.push(day + getRandomInt(0, 24 * 60 * 60 * 1000 - 1));
    }
  });
  while (dates.length < count) {
    const ts = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
    dates.push(ts);
  }
  dates.sort((a, b) => a - b);
  return dates.map((ts) => {
    const type = TRANSACTION_TYPES[getRandomInt(0, TRANSACTION_TYPES.length - 1)];
    const status = TRANSACTION_STATUSES[getRandomInt(0, TRANSACTION_STATUSES.length - 1)];
    const amount = parseFloat((Math.random() * 1000).toFixed(2));
    const id = crypto.randomUUID();
    return { id, name: type, amount, createdAt: new Date(ts).toISOString(), type, status };
  });
}
let transactions: Transaction[] = generateTransactions();

// ---------------------------------------------------------------------------
// Contacts mock store (in-memory)
// ---------------------------------------------------------------------------
let contacts: Contact[] = [];

export async function GET(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const path = request.nextUrl.pathname;
  const version = path.split('/')[2];
  const resource = path.split('/')[3];
  const action = path.split('/')[4];
  const id = path.split('/')[5];

  console.log({ path, version, resource, action, id });

  // Transactions GET endpoints
  if (resource === 'transactions') {
    // list
    if (!action) {
      const qp = request.nextUrl.searchParams;
      const cursor = qp.get('cursor');
      // Validate cursor exists
      if (cursor && !transactions.find((t) => t.id === cursor)) {
        return NextResponse.json(handleError('Invalid cursor', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }
      const limitStr = qp.get('limit');
      const limit = limitStr ? parseInt(limitStr, 10) : 20;
      if (limitStr && (isNaN(limit) || limit <= 0)) {
        return NextResponse.json(handleError('Invalid limit', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }
      const typeFilter = qp.get('type');
      // Validate typeFilter
      if (typeFilter && !TRANSACTION_TYPES.includes(typeFilter as TransactionType)) {
        return NextResponse.json(handleError('Invalid type filter', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }
      const startDate = qp.get('startDate');
      // Validate startDate
      if (startDate && isNaN(Date.parse(startDate))) {
        return NextResponse.json(handleError('Invalid startDate', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }
      const endDate = qp.get('endDate');
      // Validate endDate
      if (endDate && isNaN(Date.parse(endDate))) {
        return NextResponse.json(handleError('Invalid endDate', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }
      const search = qp.get('search')?.toLowerCase() || '';
      let filtered = transactions.slice();
      if (typeFilter) filtered = filtered.filter((t) => t.type === typeFilter);
      if (startDate) filtered = filtered.filter((t) => new Date(t.createdAt) >= new Date(startDate));
      if (endDate) filtered = filtered.filter((t) => new Date(t.createdAt) <= new Date(endDate));
      if (search) filtered = filtered.filter((t) => t.id.includes(search) || t.name.toLowerCase().includes(search));
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      let startIndex = 0;
      if (cursor) {
        const idx = filtered.findIndex((t) => t.id === cursor);
        if (idx >= 0) startIndex = idx + 1;
      }
      const items = filtered.slice(startIndex, startIndex + limit);
      const nextCursor = (startIndex + limit) < filtered.length ? items[items.length - 1].id : null;
      const paginated: Paginated<Transaction> = { items, nextCursor };
      return NextResponse.json(respondOk(paginated));
    }
    // get by id
    const txId = action;
    const tx = transactions.find((t) => t.id === txId);
    if (tx) {
      return NextResponse.json(respondOk(tx));
    }
    return NextResponse.json(handleError('Transaction not found', ErrorCode.TRANSACTION_NOT_FOUND, 404), { status: 404 });
  }
  
  // Contacts GET endpoints
  if (resource === 'contacts') {
    // list
    if (!action) {
      const qp = request.nextUrl.searchParams;
      const cursor = qp.get('cursor');
      const limitStr = qp.get('limit');
      const limit = limitStr ? parseInt(limitStr, 10) : 50;
      if (limitStr && (isNaN(limit) || limit <= 0)) {
        return NextResponse.json(handleError('Invalid limit', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }

      if (cursor && !contacts.find((c) => c.id === cursor)) {
        return NextResponse.json(handleError('Invalid cursor', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
      }

      let startIndex = 0;
      if (cursor) {
        const idx = contacts.findIndex((c) => c.id === cursor);
        if (idx >= 0) startIndex = idx + 1;
      }
      const items = contacts.slice(startIndex, startIndex + limit);
      const nextCursor = (startIndex + limit) < contacts.length ? items[items.length - 1].id : null;
      return NextResponse.json(respondOk({ items, nextCursor }));
    }

    // get by id
    const contactId = action;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      return NextResponse.json(respondOk(contact));
    }
    return NextResponse.json(handleError('Contact not found', ErrorCode.NOT_FOUND, 404), { status: 404 });
  }

  // const [resource, action, id] = params.route;

  // Auth GET endpoints
  if (resource === 'auth') {
    if (action === 'check-availability') {
      const qp = request.nextUrl.searchParams;
      const medium = qp.get('medium') || '';
      const value = qp.get('value') || '';
      
      if (!medium || !value) {
        return NextResponse.json(
          handleError('Medium and value are required', ErrorCode.VALIDATION_ERROR, 400),
        );
      }
      
      // Stub: available unless value === 'taken'
      const available = value !== 'taken';
      return NextResponse.json(respondOk({ available }));
    }
    if (action === 'devices') {
      const devices: any[] = [];
      return NextResponse.json(respondOk(devices));
    }
  }

  // User GET endpoint
  if (resource === 'user' && !action) {
    const user = {
      id: '1',
      firstName: 'Satoshi',
      lastName: 'Nakamoto',
      phone: '1234567890',
      email: 'satoshi@nakamoto.money',
      address: '123 Main St',
      country: 'USA',
      dob: '1990-01-01',
      gender: 'other'
    };
    const settings = {
      language: 'en',
      theme: 'light',
      notifications: {
        pushEnabled: true,
        transactionAlerts: true,
        securityAlerts: true,
        promotions: true,
        emailNotifications: true,
        smsNotifications: true
      },
      security: {
        biometricEnabled: false,
        twoFactorEnabled: false,
        transactionPin: true
      }
    };
    return NextResponse.json(respondOk({ user, settings }));
  }

  // Wallet endpoints
  if (resource === 'wallet') {
    if (action === 'balance') {
      // Return primary balance
      const primaryBalance: AssetBalance = {
        symbol: 'USD',
        total: 1000.00,
        available: 950.50,
        pending: 49.50
      };
      return NextResponse.json(respondOk(primaryBalance));
    }
    
    if (action === 'balances') {
      // Return all balances
      const balances: AssetBalance[] = [
        {
          symbol: 'USD',
          total: 1000.00,
          available: 950.50,
          pending: 49.50
        },
        {
          symbol: 'EUR',
          total: 850.00,
          available: 850.00,
          pending: 0
        }
      ];
      return NextResponse.json(respondOk(balances));
    }
  }

  return NextResponse.json(
    handleError('Endpoint not found', ErrorCode.NOT_FOUND, 404)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const path = request.nextUrl.pathname;
  const version = path.split('/')[2];
  const resource = path.split('/')[3];
  const action = path.split('/')[4];
  const sub = path.split('/')[5];
  
  const body = await request.json().catch(() => ({}));

  if (resource === 'auth') {
    if (action === 'otp' && sub === 'send') {
      // 1 min expiry code just for demo
      return NextResponse.json(respondOk({ requiresOtp: true, expires: Date.now() + 1 * 60 * 1000 }));
    }
    if (action === 'otp' && sub === 'verify') {
      const { medium, value, otp } = body;
      // unexpected error 
      if (!medium || !value) {
        return NextResponse.json(
          handleError('Medium and value are required', ErrorCode.OTP_MISSING_MEDIUM, 400)
        );
      }
      if (!otp) {
        return NextResponse.json(
          handleError('Medium, value and OTP are required', ErrorCode.OTP_REQUIRED, 400)
        );
      }
      // Mock verification - accept any 6-digit OTP
      // except for 000001
      if (otp.length !== 6 || otp === '000001') {
        return NextResponse.json(
          handleError('Invalid OTP', ErrorCode.OTP_INVALID, 400)
        );
      }

      // otp response (only non-valid 000001)
      return NextResponse.json(respondOk({ valid: true }));
    }
    if (action === 'login') {
      const { phone, email } = body;
      if (!phone && !email) {
        return NextResponse.json(
          handleError('Phone or email is required', ErrorCode.VALIDATION_ERROR, 400)
        );
      }
      
      // Create tokens with proper JWT structure and expiration
      const accessToken = createToken(
        { sub: phone || email, type: 'access' },
        3600 // 1 hour
      );
      const refreshToken = createToken(
        { sub: phone || email, type: 'refresh' },
        604800 // 7 days
      );
      
      return NextResponse.json(respondOk({ accessToken, refreshToken }));
    }
    if (action === 'refresh') {
      const { refreshToken } = body;
      if (!refreshToken) {
        return NextResponse.json(
          handleError('Refresh token is required', ErrorCode.SESSION_EXPIRED, 401)
        );
      }
      
      // Create new tokens
      const accessToken = createToken(
        { sub: 'refreshed-user', type: 'access' },
        3600 // 1 hour
      );
      const newRefreshToken = createToken(
        { sub: 'refreshed-user', type: 'refresh' },
        604800 // 7 days
      );
      
      return NextResponse.json(respondOk({ 
        accessToken, 
        refreshToken: newRefreshToken 
      }));
    }
  }

  return NextResponse.json(
    handleError('Endpoint not found', ErrorCode.NOT_FOUND, 404)
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const path = request.nextUrl.pathname;
  const version = path.split('/')[2];
  const resource = path.split('/')[3];
  const action = path.split('/')[4];
  const sub = path.split('/')[5];

  const body = await request.json().catch(() => ({}));

  // Transactions POST endpoints
  // Validate POST bodies
  if (resource === 'transactions') {
    if (action === 'send') {
      const { recipientId, amount } = body;
      if (!recipientId) {
        return NextResponse.json(handleError('Recipient id is required', ErrorCode.INVALID_RECIPIENT, 400), { status: 400 });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(handleError('Invalid amount', ErrorCode.INVALID_AMOUNT, 400), { status: 400 });
      }
    }
    if (action === 'request') {
      const { contactId, amount } = body;
      if (!contactId) {
        return NextResponse.json(handleError('Contact id is required', ErrorCode.INVALID_RECIPIENT, 400), { status: 400 });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(handleError('Invalid amount', ErrorCode.INVALID_AMOUNT, 400), { status: 400 });
      }
    }
    if (action === 'cashout') {
      const { method, amount } = body;
      if (!method) {
        return NextResponse.json(handleError('Invalid cash-out method', ErrorCode.INVALID_METHOD, 400), { status: 400 });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(handleError('Invalid amount', ErrorCode.INVALID_AMOUNT, 400), { status: 400 });
      }
    }
  }

  // Transactions POST endpoints
  if (resource === 'transactions') {
    // send transaction
    if (action === 'send') {
      const tx: Transaction = { id: crypto.randomUUID(), name: 'transfer', amount: body.amount, date: new Date().toISOString(), type: 'transfer', status: 'completed' };
      transactions.unshift(tx);
      return NextResponse.json(respondOk(tx));
    }
    // notify
    if (action === 'notify') {
      return NextResponse.json(respondOk(null));
    }
    // request money (return QR)
    if (action === 'request') {
      const qrData: QRData = { userId: body.contactId, amount: body.amount, timestamp: Date.now() };
      const qrString = JSON.stringify(qrData);
      return NextResponse.json(respondOk({ qrData, qrString }));
    }
    // cash-out stub
    if (action === 'cashout') {
      const cashOut: CashOutResponse = { success: true, reference: crypto.randomUUID(), amount: body.amount, fee: parseFloat((body.amount * 0.5 / 100).toFixed(2)), method: body.method || 'agent', date: new Date().toISOString() };
      return NextResponse.json(respondOk(cashOut));
    }
  }

  // Contacts bulk CREATE (POST)
  if (resource === 'contacts' && action === 'bulk') {
    const { contacts: contactsPayload } = body;
    if (!Array.isArray(contactsPayload) || contactsPayload.length === 0) {
      return NextResponse.json(handleError('Contacts array required', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
    }
    const created = contactsPayload.map((c: any) => ({
      id: c.id || crypto.randomUUID(),
      name: c.name,
      phone: c.phone || '',
      email: c.email || undefined,
      initial: (c.name || '').charAt(0).toUpperCase(),
    }));
    contacts.push(...created);
    return NextResponse.json(respondOk({ success: true, created: created.length }));
  }

  if (resource === 'user') {
    if (action === 'preferences') {
      return NextResponse.json(respondOk(body));
    }
    if (!action) {
      const { firstName, lastName } = body;
      if (!firstName || !lastName) {
        return NextResponse.json(
          handleError('First name and last name are required', ErrorCode.USER_UPDATE_MISSING_INFORMATION, 400),
          { status: 400 }
        );
      }
      return NextResponse.json(respondOk(body));
    }
  }

  return NextResponse.json(
    handleError('Endpoint not found', ErrorCode.NOT_FOUND, 404),
    { status: 404 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const path = request.nextUrl.pathname;
  const version = path.split('/')[2];
  const resource = path.split('/')[3];
  const action = path.split('/')[4];
  const sub = path.split('/')[5];
  
  // Contacts bulk DELETE
  if (resource === 'contacts' && action === 'bulk') {
    const { ids } = await request.json().catch(() => ({}));
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(handleError('ids array required', ErrorCode.VALIDATION_ERROR, 400), { status: 400 });
    }
    const before = contacts.length;
    contacts = contacts.filter((c) => !ids.includes(c.id));
    return NextResponse.json(respondOk({ success: true, deleted: before - contacts.length }));
  }

  if (resource === 'auth' && action === 'devices') {
    return NextResponse.json(respondOk({}));
  }

  return NextResponse.json(
    handleError('Endpoint not found', ErrorCode.NOT_FOUND, 404),
    { status: 404 }
  );
}