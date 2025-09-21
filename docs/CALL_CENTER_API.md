# Call Center API Integration

This document explains how the call center can integrate with the dispatch system to create bookings.

## 🔑 Authentication

Use API Key authentication by including the following header in all requests:

```
X-API-Key: YOUR_API_KEY_HERE
```

**Note:** Contact your system administrator to get your API key.

## 📋 Create Booking Endpoint

**Endpoint:** `POST /api/call-center/booking`

**Headers:**
```
Content-Type: application/json
X-API-Key: YOUR_API_KEY_HERE
```

**Request Body:**
```json
{
  "customer": {
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "555-123-4567"
  },
  "location": {
    "latitude": 43.6532,
    "longitude": -79.3832,
    "street_number": "123",
    "street_name": "Main Street", 
    "postal_code": "M5V 3A4",
    "city": "Toronto",
    "state_province": "Ontario",
    "country": "Canada"
  },
  "booking": {
    "booking_date": "2025-01-15",
    "booking_time": "14:30:00"
  },
  "call_center_agent": {
    "name": "Sarah Johnson",
    "email": "sarah@callcenter.com"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully by Sarah Johnson - unassigned, ready for dispatcher assignment",
  "data": {
    "bookingId": 123,
    "booking_date": "2025-01-15",
    "booking_time": "14:30:00",
    "status": "scheduled",
    "customer_name": "John Doe",
    "agent_name": null,
    "customer_address": "123 Main Street, M5V 3A4 Toronto"
  },
  "call_center_agent": "Sarah Johnson"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Call center agent information is required"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

## 📝 Important Notes

1. **All bookings are created as UNASSIGNED** - dispatchers will assign field agents later
2. **Call center agent info is required** - include your name and email in every request
3. **Customer notifications are sent automatically** - customers will receive booking confirmations
4. **Use HTTPS** - all API calls must be made over secure connections
5. **Date/Time format:**
   - Date: `YYYY-MM-DD` (e.g., "2025-01-15")
   - Time: `HH:MM:SS` (e.g., "14:30:00" for 2:30 PM)

## 🧪 Testing

You can test the API using curl:

```bash
curl -X POST https://yourdomain.com/api/call-center/booking \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -d '{
    "customer": {
      "name": "Test Customer",
      "email": "test@example.com",
      "phone": "555-0123"
    },
    "location": {
      "latitude": 43.6532,
      "longitude": -79.3832,
      "street_number": "123",
      "street_name": "Test Street",
      "postal_code": "M5V 3A4", 
      "city": "Toronto",
      "state_province": "Ontario",
      "country": "Canada"
    },
    "booking": {
      "booking_date": "2025-01-15",
      "booking_time": "10:00:00"
    },
    "call_center_agent": {
      "name": "Your Name",
      "email": "your.email@callcenter.com"
    }
  }'
```

## 🆘 Support

If you encounter any issues:
1. Check that your API key is correct
2. Ensure all required fields are included
3. Verify date/time formats
4. Contact your system administrator for help

---

**API Version:** 1.0  
**Last Updated:** January 2025