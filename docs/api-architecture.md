# Driveway-Hub API Architecture Specification
*RESTful API Design for Tesla-Integrated Parking Platform*

## Architecture Overview

The Driveway-Hub API is built as a RESTful service using Node.js/Express, designed to handle real-time interactions between Tesla vehicles, mobile/web clients, and third-party services (Stripe, Google Maps).

### Core Design Principles
- **RESTful** - Standard HTTP methods and status codes
- **Stateless** - JWT-based authentication with no server-side sessions
- **Real-time** - WebSocket connections for live updates
- **Secure** - OAuth 2.0, encryption, and rate limiting
- **Scalable** - Microservice-ready architecture

---

## API Base Structure

### Base URL
```
Production:  https://api.driveway-hub.app/v1
Staging:     https://api-staging.driveway-hub.app/v1
Development: http://localhost:3000/api/v1
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "metadata": {
    "timestamp": "2025-07-10T15:30:00Z",
    "request_id": "req_123456789",
    "api_version": "1.0"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email address is required",
    "details": {
      "field": "email",
      "received": null,
      "expected": "string"
    }
  },
  "metadata": {
    "timestamp": "2025-07-10T15:30:00Z",
    "request_id": "req_123456789"
  }
}
```

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "user_type": "driver", // or "host" or "both"
  "tesla_linked": true,
  "stripe_linked": false,
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Authentication Endpoints

**POST /auth/register**
```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "user_type": "driver"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "user_type": "driver",
      "email_verified": false
    },
    "token": "jwt_token_here"
  }
}
```

**POST /auth/login**
```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

**POST /auth/tesla/connect**
```json
// Request
{
  "tesla_auth_code": "authorization_code_from_tesla"
}

// Response
{
  "success": true,
  "data": {
    "tesla_linked": true,
    "vehicles": [
      {
        "id": "vehicle_uuid",
        "tesla_vehicle_id": 123456789,
        "display_name": "My Model 3",
        "model": "Model 3",
        "vin": "5YJ3E1EA1JF000001"
      }
    ]
  }
}
```

---

## User Management API

### User Profile Endpoints

**GET /users/profile**
```json
// Response
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "user_type": "driver",
    "profile_image_url": "https://...",
    "tesla_linked": true,
    "stripe_linked": false,
    "created_at": "2025-06-01T10:00:00Z"
  }
}
```

**PUT /users/profile**
```json
// Request
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1987654321"
}

// Response
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Smith",
    "phone": "+1987654321",
    "updated_at": "2025-07-10T15:30:00Z"
  }
}
```

### Vehicle Management

**GET /users/vehicles**
```json
// Response
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "vehicle_uuid",
        "tesla_vehicle_id": 123456789,
        "display_name": "My Model 3",
        "model": "Model 3",
        "year": 2023,
        "color": "Pearl White",
        "vin": "5YJ3E1EA1JF000001",
        "is_active": true,
        "last_seen_at": "2025-07-10T14:30:00Z"
      }
    ]
  }
}
```

**POST /users/vehicles/sync**
*Syncs vehicles from Tesla Fleet API*
```json
// Response
{
  "success": true,
  "data": {
    "vehicles_added": 1,
    "vehicles_updated": 0,
    "vehicles": [ ... ]
  }
}
```

---

## Driveway Listing API

### Listing Management

**GET /driveways**
*Search for available driveways*
```json
// Query Parameters:
// ?latitude=37.7749&longitude=-122.4194&radius=5&start_time=2025-07-10T16:00:00Z&end_time=2025-07-10T20:00:00Z

// Response
{
  "success": true,
  "data": {
    "driveways": [
      {
        "id": "driveway_uuid",
        "title": "Secure Covered Driveway in Mission",
        "address": "123 Mission St, San Francisco, CA",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "distance_miles": 1.2,
        "hourly_rate": 8.50,
        "is_covered": true,
        "has_ev_charging": false,
        "photos": [
          {
            "url": "https://...",
            "caption": "Driveway entrance"
          }
        ],
        "host": {
          "first_name": "Sarah",
          "rating": 4.8,
          "review_count": 23
        },
        "instant_booking": true
      }
    ],
    "total_count": 15,
    "search_params": {
      "center": {"lat": 37.7749, "lng": -122.4194},
      "radius_miles": 5,
      "time_range": {
        "start": "2025-07-10T16:00:00Z",
        "end": "2025-07-10T20:00:00Z"
      }
    }
  }
}
```

**GET /driveways/:id**
*Get detailed driveway information*
```json
// Response
{
  "success": true,
  "data": {
    "id": "driveway_uuid",
    "title": "Secure Covered Driveway in Mission",
    "description": "Well-lit, gated driveway perfect for Tesla parking...",
    "address": "123 Mission St, San Francisco, CA 94103",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "driveway_type": "concrete",
    "is_covered": true,
    "max_vehicle_length": 200,
    "max_vehicle_width": 80,
    "max_vehicle_height": 70,
    "hourly_rate": 8.50,
    "daily_rate": 65.00,
    "minimum_booking_hours": 2,
    "maximum_booking_hours": 168,
    "instant_booking_enabled": true,
    "has_ev_charging": false,
    "has_security_camera": true,
    "access_instructions": "Gate code is 1234. Park in the spot closest to the house.",
    "photos": [
      {
        "id": "photo_uuid",
        "url": "https://...",
        "caption": "Driveway entrance",
        "order": 1
      }
    ],
    "host": {
      "id": "host_uuid",
      "first_name": "Sarah",
      "profile_image_url": "https://...",
      "rating": 4.8,
      "review_count": 23,
      "member_since": "2025-05-01T00:00:00Z"
    },
    "reviews": [
      {
        "id": "review_uuid",
        "rating": 5,
        "review_text": "Perfect spot for my Model 3. Easy access and secure.",
        "reviewer_name": "Mike D.",
        "created_at": "2025-07-05T10:00:00Z"
      }
    ]
  }
}
```

**POST /driveways** (Host only)
*Create new driveway listing*
```json
// Request
{
  "title": "Secure Covered Driveway in Mission",
  "description": "Well-lit, gated driveway...",
  "address": "123 Mission St, San Francisco, CA 94103",
  "driveway_type": "concrete",
  "is_covered": true,
  "max_vehicle_length": 200,
  "max_vehicle_width": 80,
  "hourly_rate": 8.50,
  "has_ev_charging": false,
  "access_instructions": "Gate code is 1234"
}

// Response
{
  "success": true,
  "data": {
    "id": "driveway_uuid",
    "title": "Secure Covered Driveway in Mission",
    "listing_status": "active",
    "created_at": "2025-07-10T15:30:00Z"
  }
}
```

**PUT /driveways/:id** (Host only)
*Update driveway listing*

**DELETE /driveways/:id** (Host only)
*Soft delete driveway listing*

---

## Booking API

### Booking Management

**POST /bookings**
*Create new booking*
```json
// Request
{
  "driveway_id": "driveway_uuid",
  "vehicle_id": "vehicle_uuid",
  "start_time": "2025-07-10T16:00:00Z",
  "end_time": "2025-07-10T20:00:00Z",
  "driver_notes": "Will arrive around 4:15 PM"
}

// Response
{
  "success": true,
  "data": {
    "id": "booking_uuid",
    "booking_reference": "DH-7G8H9J",
    "driveway": {
      "id": "driveway_uuid",
      "title": "Secure Covered Driveway",
      "address": "123 Mission St, San Francisco, CA"
    },
    "start_time": "2025-07-10T16:00:00Z",
    "end_time": "2025-07-10T20:00:00Z",
    "total_hours": 4.0,
    "subtotal": 34.00,
    "platform_fee": 5.10,
    "total_amount": 39.10,
    "booking_status": "pending",
    "payment_required": true,
    "created_at": "2025-07-10T15:30:00Z"
  }
}
```

**GET /bookings**
*Get user's bookings*
```json
// Query Parameters: ?status=active&limit=10&offset=0

// Response
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking_uuid",
        "booking_reference": "DH-7G8H9J",
        "driveway": {
          "title": "Secure Covered Driveway",
          "address": "123 Mission St, San Francisco, CA",
          "latitude": 37.7749,
          "longitude": -122.4194
        },
        "vehicle": {
          "display_name": "My Model 3",
          "model": "Model 3"
        },
        "start_time": "2025-07-10T16:00:00Z",
        "end_time": "2025-07-10T20:00:00Z",
        "total_amount": 39.10,
        "booking_status": "confirmed",
        "tesla_navigation_sent": true,
        "can_cancel": true,
        "created_at": "2025-07-10T15:30:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "has_more": true
    }
  }
}
```

**GET /bookings/:id**
*Get detailed booking information*
```json
// Response
{
  "success": true,
  "data": {
    "id": "booking_uuid",
    "booking_reference": "DH-7G8H9J",
    "driveway": { ... },
    "vehicle": { ... },
    "host": { ... },
    "start_time": "2025-07-10T16:00:00Z",
    "end_time": "2025-07-10T20:00:00Z",
    "booking_status": "active",
    "tesla_integration": {
      "navigation_sent": true,
      "auto_park_attempted": true,
      "auto_park_successful": true,
      "arrival_detected_at": "2025-07-10T16:05:00Z"
    },
    "payment": {
      "status": "succeeded",
      "amount": 39.10,
      "captured_at": "2025-07-10T15:35:00Z"
    },
    "timeline": [
      {
        "event": "booking_created",
        "timestamp": "2025-07-10T15:30:00Z"
      },
      {
        "event": "payment_succeeded",
        "timestamp": "2025-07-10T15:35:00Z"
      }
    ]
  }
}
```

**POST /bookings/:id/cancel**
*Cancel booking*
```json
// Request
{
  "reason": "Plans changed",
  "refund_requested": true
}

// Response
{
  "success": true,
  "data": {
    "booking_status": "cancelled",
    "refund_amount": 39.10,
    "refund_status": "processing",
    "cancelled_at": "2025-07-10T15:45:00Z"
  }
}
```

---

## Tesla Integration API

### Vehicle Control

**POST /tesla/vehicles/:vehicle_id/navigate**
*Send navigation to Tesla*
```json
// Request
{
  "destination": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Mission St, San Francisco, CA"
  },
  "booking_id": "booking_uuid"
}

// Response
{
  "success": true,
  "data": {
    "navigation_sent": true,
    "tesla_command_id": "cmd_123456",
    "estimated_arrival": "2025-07-10T16:05:00Z"
  }
}
```

**POST /tesla/vehicles/:vehicle_id/autopark**
*Initiate Tesla Auto Park*
```json
// Request
{
  "booking_id": "booking_uuid",
  "parking_coordinates": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}

// Response
{
  "success": true,
  "data": {
    "autopark_initiated": true,
    "tesla_command_id": "cmd_789012",
    "status": "parking_in_progress"
  }
}
```

**GET /tesla/vehicles/:vehicle_id/status**
*Get real-time vehicle status*
```json
// Response
{
  "success": true,
  "data": {
    "vehicle_id": "vehicle_uuid",
    "tesla_vehicle_id": 123456789,
    "online": true,
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "heading": 180,
      "speed": null
    },
    "charge_state": {
      "battery_level": 85,
      "charging_state": "Disconnected"
    },
    "vehicle_state": {
      "locked": true,
      "sentry_mode": true
    },
    "last_updated": "2025-07-10T15:30:00Z"
  }
}
```

---

## Payment API

### Payment Processing

**POST /payments/intents**
*Create Stripe Payment Intent*
```json
// Request
{
  "booking_id": "booking_uuid",
  "amount": 3910, // Amount in cents
  "payment_method_id": "pm_1234567890"
}

// Response
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abcd",
    "status": "requires_confirmation",
    "amount": 3910
  }
}
```

**POST /payments/confirm**
*Confirm payment*
```json
// Request
{
  "payment_intent_id": "pi_1234567890"
}

// Response
{
  "success": true,
  "data": {
    "payment_status": "succeeded",
    "booking_status": "confirmed",
    "receipt_url": "https://..."
  }
}
```

**POST /payments/refund**
*Process refund*
```json
// Request
{
  "booking_id": "booking_uuid",
  "amount": 3910, // Optional, defaults to full amount
  "reason": "duplicate"
}

// Response
{
  "success": true,
  "data": {
    "refund_id": "re_1234567890",
    "amount": 3910,
    "status": "pending",
    "estimated_arrival": "2025-07-15T00:00:00Z"
  }
}
```

---

## Real-time Communication

### WebSocket Events

**Connection:**
```javascript
const socket = io('wss://api.driveway-hub.app', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

**Event Types:**

```javascript
// Booking status updates
socket.on('booking_update', (data) => {
  // {
  //   booking_id: 'booking_uuid',
  //   status: 'active',
  //   tesla_status: 'arrived',
  //   timestamp: '2025-07-10T16:05:00Z'
  // }
});

// Tesla vehicle updates
socket.on('vehicle_update', (data) => {
  // {
  //   vehicle_id: 'vehicle_uuid',
  //   location: { lat: 37.7749, lng: -122.4194 },
  //   status: 'parking',
  //   timestamp: '2025-07-10T16:05:00Z'
  // }
});

// Payment updates
socket.on('payment_update', (data) => {
  // {
  //   booking_id: 'booking_uuid',
  //   payment_status: 'succeeded',
  //   timestamp: '2025-07-10T15:35:00Z'
  // }
});
```

---

## Error Handling

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., booking overlap) |
| `TESLA_API_ERROR` | 502 | Tesla Fleet API error |
| `PAYMENT_ERROR` | 402 | Payment processing failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Error Response Examples

```json
// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vehicle dimensions exceed driveway capacity",
    "details": {
      "vehicle_length": 185,
      "driveway_max_length": 180,
      "field": "vehicle_dimensions"
    }
  }
}

// Tesla API Error
{
  "success": false,
  "error": {
    "code": "TESLA_API_ERROR",
    "message": "Vehicle is offline or unreachable",
    "details": {
      "tesla_error": "vehicle_unavailable",
      "retry_after": 300
    }
  }
}
```

---

## Rate Limiting

### API Rate Limits
- **Authenticated users**: 1000 requests/hour
- **Tesla API calls**: 200 requests/hour per user
- **Payment operations**: 50 requests/hour per user
- **Search queries**: 500 requests/hour per user

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1625097600
```

---

## API Security

### Request Security
- **HTTPS only** in production
- **JWT authentication** for all protected endpoints
- **Request signing** for webhook endpoints
- **CORS configuration** for web clients

### Data Protection
- **PCI DSS compliance** for payment data
- **Field-level encryption** for sensitive data
- **Audit logging** for all data access
- **Input sanitization** and validation

---

## Development Tools

### API Documentation
- **OpenAPI 3.0** specification
- **Swagger UI** for interactive testing
- **Postman collection** for development

### Testing & Monitoring
- **Health check** endpoint: `GET /health`
- **Metrics** endpoint: `GET /metrics` (admin only)
- **Request logging** with correlation IDs
- **Performance monitoring** with response times

---

*This API specification provides the complete technical foundation for Driveway-Hub's MVP, optimized for Tesla integration and real-time parking management.*
