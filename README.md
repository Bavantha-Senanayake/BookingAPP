## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd testbook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the project root:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/reservation_system
   NODE_ENV=development
   ```

4. **Build the TypeScript code**
   ```bash
   npm run build
   ```

---

## How to Run the Application

### Option 1: Using Docker (Recommended)

Start the entire application stack with MongoDB:

```bash
docker-compose up
```

The API will be available at `http://localhost:3000`

### Option 2: Local Development

1. **Ensure MongoDB is running locally** (on port 27017)

2. **Run in development mode** (with hot-reload):
   ```bash
   npm run dev
   ```

3. **Run in production mode**:
   ```bash
   npm run build
   npm start
   ```

### Running Tests

```bash
# Run all tests once
npm test

# Run concurrent reservation tests
npm run test:concurrent
```

## Key Design Decisions


### 1. **Layered Architecture**
   - **Controllers**: Handle HTTP requests/responses and validation
   - **Services**: Contain business logic and orchestration
   - **Models**: Define data schemas and database interactions
   - **Middleware**: Cross-cutting concerns (validation, error handling)
   
   This separation ensures testability, maintainability, and scalability.

### 2. **Express Validator Integration**
   - Centralized input validation using `express-validator`
   - Custom middleware for reusable validation rules
   - Ensures data integrity before reaching the service layer

### 3. **MongoDB with Mongoose**
   - Chose MongoDB for flexible schema evolution
   - Mongoose provides schema validation, middleware hooks, and clean query API
   - Use Background cleanup of expired reservations using mongodb inbuild expiration
   - Timestamps (`createdAt`, `updatedAt`) automatically managed

### 4. **Comprehensive Error Handling**
   - Custom error handler middleware
   - Consistent error response format across all endpoints
   - Proper HTTP status codes for different error scenarios

### 5. **TypeScript Throughout**
   - Strong typing reduces runtime errors
   - Better IDE support and developer experience
   - Interfaces for DTOs and contracts

---

## Trade-offs and Assumptions

**Monolithic API vs Microservices**
   - **Chose**: Monolithic API
   - **Why**: Simpler deployment, lower operational overhead for this scope
   - **Trade-off**: Less scalability for individual components

**In-Memory Testing vs Test Database**
   - **Chose**: `mongodb-memory-server` for testing
   - **Why**: Fast, isolated tests without external dependencies
   - **Trade-off**: Slight differences from production MongoDB behavior

### Assumptions

1. **Reservation Time Slots**: Assumed reservations have start and end times
2. **Resource Identification**: Resources are identified by a Mongo ObjectId
3. **Single Timezone**: All times are in UTC (no timezone conversion)
4. **Resource Capacity**: Each resource can be booked by one user at a time (no capacity limits)
5. **Concurrent Write Handling**: 
   - System uses a pessimistic locking mechanism with MongoDB's ResourceLock collection
   - Locks are acquired before checking for overlapping reservations
   - Transactions ensure atomicity of reservation operations
   - Retry logic (up to 5 attempts) with exponential backoff handles contention
   - Lock timeout (500ms) prevents deadlocks
   - Only one reservation can succeed when multiple users attempt to book the same time slot

---

## Future Improvements

### If I Had More Time

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - User can only modify their own reservations

3. **Advanced Features**
   - Recurring reservations (daily, weekly, monthly patterns)
   - Waitlist functionality when resources are fully booked
   - Email/SMS notifications for reservation confirmations

4. **Monitoring & Observability**
   - Structured logging with Winston or Custom One

6. **Testing Enhancements**
   - Increase test coverage to >90%
   - Integration tests for full API workflows

7. **Documentation**
   - Auto-generated API documentation (Swagger/OpenAPI)

8. **DevOps**
   - CI/CD pipeline (GitHub Actions, GitLab CI)
   - Infrastructure as Code 

---
---

## Scaling Strategy

This system is designed to scale effectively using AWS services, particularly Elastic Beanstalk or ECS with Docker.

### AWS Deployment Options

#### Option 1: AWS Elastic Beanstalk
- **Auto-scaling**: Configure based on CPU utilization or custom metrics
- **Load Balancing**: Automatic load balancing across instances
- **Environment Management**: Separate dev/staging/production environments

#### Option 2: Amazon ECS with Docker with fargate
- **Container Orchestration**: Fine-grained control over container deployment
- **Task Definitions**: Precisely define resource allocations
- **Service Auto-scaling**: Scale based on CPU, memory, or custom metrics
- **Deployment Options**: Choose between Fargate (serverless) or EC2 launch types

### Database Scaling

- **MongoDB Atlas**: Cloud-hosted MongoDB with built-in scaling
  - Automatic sharding for horizontal scaling
  - Read replicas for distributing read operations
  - Auto-scaling storage options

- **Amazon DocumentDB**: MongoDB-compatible alternative
  - Multi-AZ deployment for high availability
  - Instance scaling for increased throughput
