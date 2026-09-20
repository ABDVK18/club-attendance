import { NextResponse } from 'next/server';

export function proxy(req) {
  // 1. Let the ESP32 talk to the API freely without a password
  if (req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 2. Lock down everything else (the web dashboard)
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // ⚠️ CHANGE YOUR USERNAME AND PASSWORD HERE ⚠️
    if (user === 'HYPERLOOP' && pwd === 'EHW') {
      return NextResponse.next();
    }
  }

  // Trigger the browser's built-in password prompt
  return new NextResponse('Unauthorized Access', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Club Dashboard"',
    },
  });
}