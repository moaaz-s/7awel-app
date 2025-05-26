# 07 - API Reference

This reference covers the authentication-related endpoints exposed by `apiService`.

| Method | Endpoint            | Request Payload                          | Success Response (`200`)                               | Error Codes                          |
|--------|---------------------|------------------------------------------|--------------------------------------------------------|--------------------------------------|
| POST   | `/auth/check`       | `{ field: 'phone' \| 'email', value }`   | `{ statusCode: 200, data: { available: boolean } }`     | `PHONE_ALREADY_REGISTERED`, `EMAIL_ALREADY_REGISTERED` |
| POST   | `/auth/otp/send`    | `{ type: 'phone' \| 'email', value, channel? }` | `{ statusCode: 200, data: { expires: timestamp } }`     | `OTP_LOCKED`, `OTP_SEND_FAILED`      |
| POST   | `/auth/otp/verify`  | `{ type, value, code }`                  | `{ statusCode: 200, data: { pinSet, emailVerified, registrationComplete } }` | `OTP_INVALID`, `OTP_EXPIRED`         |
| POST   | `/auth/token`       | `{ phone, email, deviceInfo }`           | `{ statusCode: 200, data: { accessToken, refreshToken } }` | `AUTH_FAILED`                        |
| POST   | `/auth/refresh`     | `{ refreshToken }`                       | `{ statusCode: 200, data: { accessToken, refreshToken } }` | `REFRESH_FAILED`, `REFRESH_TOKEN_INVALID` |
| POST   | `/auth/logout`      | none                                     | `{ statusCode: 200 }`                                  | `LOGOUT_FAILED`                      |


## Error Codes (`ErrorCode` enum)

| Code                         | Meaning                                      |
|------------------------------|----------------------------------------------|
| `PHONE_ALREADY_REGISTERED`   | Phone number already linked to an account.   |
| `EMAIL_ALREADY_REGISTERED`   | Email already in use.                        |
| `OTP_INVALID`                | Provided OTP is incorrect.                   |
| `OTP_EXPIRED`                | OTP has expired.                             |
| `OTP_LOCKED`                 | Too many OTP attempts; locked temporarily.   |
| `AUTH_FAILED`                | Token acquisition or login failed.           |
| `REFRESH_TOKEN_INVALID`      | Refresh token not recognized or expired.     |
| `REFRESH_FAILED`             | Token refresh operation failed.              |
| `LOGOUT_FAILED`              | Server-side session revocation failed.       |


**Note:** All endpoints return an `ApiResponse<T>` shape:
```ts
interface ApiResponse<T> {
  statusCode: number;
  data?: T;
  message?: string;
  errorCode?: ErrorCode;
}
```
