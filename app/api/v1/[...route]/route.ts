import { NextRequest, NextResponse } from 'next/server';
import { handleError, respondOk } from '@/utils/api-utils';
import { ErrorCode } from '@/types/errors';
import { createToken } from '@/utils/token-utils';

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
  
  if (resource === 'auth' && action === 'devices') {
    return NextResponse.json(respondOk({}));
  }

  return NextResponse.json(
    handleError('Endpoint not found', ErrorCode.NOT_FOUND, 404),
    { status: 404 }
  );
}