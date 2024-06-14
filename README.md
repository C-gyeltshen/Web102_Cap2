# **Pokemon Management API**

This API allows users to manage Pokémon records and user information through various endpoints. It includes features like authentication, CRUD operations for Pokémon records, rate limiting, and error handling.

## **Technologies Used**

- **Node.js:** Runtime environment for executing JavaScript code server-side.
- **Prisma:** Database toolkit for interfacing with PostgreSQL.
- **Hono:** Custom middleware and utility functions for handling HTTP requests and JWT authentication.
- **bcrypt:** Library for hashing passwords securely.
- **@prisma/client:** Prisma Client for database operations.
- **jsonwebtoken:** Library for generating and verifying JSON Web Tokens (JWT).
- **cors:** Middleware for enabling Cross-Origin Resource Sharing (CORS).
- **@hono/node-server:** Utility for serving HTTP requests.

## **Setup**

1. **Clone the repository:**

```
git clone <repository-url>
cd <repository-directory>
```

2. **Install dependencies:**

```
npm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory with the following variables:

```
JWT_SECRET=mySecretKey
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

- **JWT_SECRET:** Secret key for signing JWT tokens.
- **DATABASE_URL:** Connection URL for your PostgreSQL database.

4. **Database migration:**

Ensure your PostgreSQL database is running and configured. Run Prisma migrations to set up the database schema:

```
npx prisma migrate dev
```

5. **Start the server:**

```
npm start
```

The server will start on port `8080` by default.

# **API Endpoints**

## **Authentication**

- **POST /login**

    Authenticates a user based on email and password, returns a JWT token for subsequent requests.

- **POST /signUp**

    Registers a new user with email, username, and password.

## **Pokémon Management**

**POST/pokemon**
Creates a new Pokémon record.

**GET /pokemon/records**
Retrieves all Pokémon records.

**PATCH /pokemon/update**
Updates details of a specific Pokémon record.

**DELETE /pokemon/delete**
Deletes a specific Pokémon record.


### **Error Handling**
The API handles common errors such as duplicate entries (unique constraint violations), not found errors, and general server errors.

### **Rate Limiting**
Rate limiting is applied to the /pokemon endpoint to prevent abuse.
