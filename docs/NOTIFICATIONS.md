# Notification System

The Dispatch Tool includes an environment-aware notification system for SMS and email communications.

## Environment-Aware Behavior

### Production Environment
- **Condition**: `FLASK_ENV=production`
- **Behavior**: Sends actual SMS and email notifications
- **Requirements**: Valid Twilio and SMTP credentials required

### Development/Testing Environment
- **Condition**: `FLASK_ENV=development` (or any value other than "production")
- **Behavior**: Logs notifications instead of sending them
- **Benefits**: 
  - Prevents accidental notifications during development
  - No need for valid Twilio/SMTP credentials in dev
  - All notification logic still executes and can be tested

## Environment Configuration

Set the environment variable in your deployment:

```bash
# Production
FLASK_ENV=production

# Development (default)
FLASK_ENV=development
```

## Notification Types

The system supports two types of notifications:

### 1. SMS Notifications
- **Production**: Sent via Twilio
- **Development**: Logged to console and application logs
- **Format**: `[DEV] SMS (not sent) - To: +1234567890, Message: Your booking is confirmed`

### 2. Email Notifications  
- **Production**: Sent via SMTP (Office 365)
- **Development**: Logged to console and application logs
- **Format**: `[DEV] EMAIL (not sent) - To: user@example.com, Subject: Booking Confirmation`

## Triggered Events

Notifications are automatically sent for:

1. **Booking Creation** (via regular API)
   - Customer confirmation (SMS + Email)
   - Agent assignment notification (SMS + Email)

2. **Booking Updates** (status changes)
   - Customer status updates (SMS + Email)
   - Agent status updates (SMS + Email)

3. **Time-off Requests**
   - Dispatcher notifications for approvals needed
   - Agent notifications for request status changes

4. **Call Center Bookings**
   - Customer confirmation only (no agent notifications since unassigned)

## Implementation Details

### Core Functions
- `send_email()` - Email sending with environment awareness
- `send_sms()` - SMS sending with environment awareness  
- `send_notifications_async()` - Asynchronous notification processing
- `is_production_environment()` - Environment detection utility

### File Locations
- `backend/utils/notifier.py` - Core notification functions
- `backend/utils/async_notifier.py` - Async processing and booking notifications
- `backend/config.py` - Environment configuration

### Logging
All notification attempts (sent or logged) are recorded in:
- Console output with `[PROD]` or `[DEV]` prefixes
- Application logs via Python's logging module

## Testing Notifications

### Development Testing
1. Set `FLASK_ENV=development` (default)
2. Trigger any booking or time-off operation
3. Check console output for notification logs
4. No actual SMS/email will be sent

### Production Testing
1. Set `FLASK_ENV=production` 
2. Ensure valid Twilio and SMTP credentials
3. Test with a small subset of real data
4. Monitor logs for successful sending

## Required Credentials (Production Only)

### Twilio (SMS)
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token  
TWILIO_PHONE_NUMBER=your_twilio_number
```

### SMTP (Email)
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your_email@domain.com
```

## Best Practices

1. **Always test in development first** before deploying to production
2. **Monitor logs** in production to ensure notifications are being sent
3. **Use test phone numbers and emails** for initial production testing
4. **Keep environment variables secure** and never commit credentials to git
5. **Set up log rotation** for production notification logs