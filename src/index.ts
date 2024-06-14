import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { PrismaClient, Prisma } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { decode, sign, verify } from "hono/jwt";
import { jwt } from "hono/jwt";
import bcrypt from "bcrypt";
import { resolve } from "path";

type Variables = JwtVariables;

const prisma = new PrismaClient();
const app = new Hono();

// Rate Limiting Middleware
function rateLimit(limit: number, interval: number) {
  const queue: number[] = [];

  return async (context: any, next: any) => {
    const now = Date.now();
    queue.push(now);

    while (queue[0] && queue[0] < now - interval) {
      queue.shift();
    }

    // Check if queue length exceeds limit and if it exits send the status  HTTP 429 Too Many Requests
    if (queue.length > limit) {
      return context.json({ message: "Rate limit exceeded" }, 429);
    }

    await next();
  };
}

// Apply CORS globally
app.use("/*", cors());

// JWT middleware for protected routes
app.use(
  "/protected/*",
  jwt({
    secret: process.env.JWT_SECRET || "mySecretKey",
  })
);

// Apply rate limiting middleware to specific routes /pokemon endpoints
const rateLimitMiddleware = rateLimit(10, 1000); // 10 requests per second
app.use("/pokemon", rateLimitMiddleware);

// HOME ROUT
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// ENDPOINT FOR SIGN UP
app.post("/signUp", async (c) => {
  try {
    const body = await c.req.json();

    const bcryptHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.userinfo.create({
      data: {
        email: body.email,
        hashedpassword: bcryptHash,
        username: body.username,
      },
    });

    console.log(user);
    return c.json({ message: `${user.email} created successfully` });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        console.log(
          "There is a unique constraint violation, a new user cannot be created with this email"
        );
        return c.json({ message: "Email already exists" });
      }
    }
    console.error(e);
    return c.json({ message: "An error occurred" }, 500);
  }
});

// CREATE NEW RECORD
app.post("/pokemon", async (c) => {
  try {
    const body = await c.req.json();

    const pokemon = await prisma.caught.create({
      data: {
        pokemonname: body.pokemonname,
        pokemontype: body.pokemontype,
        weight: body.weight,
        moves: body.moves,
        image: body.image,
      },
    });

    console.log(pokemon);
    return c.json({ message: `${pokemon.pokemonname} created successfully` });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        console.log(
          "There is a unique constraint violation, a new user cannot be created with this pokemon name"
        );
        return c.json({ message: "Pokemon already exists" });
      }
    }
    console.error(e);
    return c.json({ message: "An error occurred" }, 500);
  }
});

// RETRIEVE ALL THE POKEMON RECORDS IN DB 
app.get('/pokemon/records', async (c) => {
  try {
    const pRecords = await prisma.caught.findMany();
    return c.json(pRecords);
  } catch (e) {
    console.error(e);
    return c.json({ message: "An error occurred while fetching Pokémon records" }, 500);
  }
});

// UPDATE SPECIFIC POKEMON RECORD 
app.patch('/pokemon/update', async (c) => {
  try {
    const body = await c.req.json();

    const updatedPokemon = await prisma.caught.update({
      where: {
        pokemonid: body.pokemonid,
      },
      data: {
        pokemonname: body.pokemonname,
        pokemontype: body.pokemontype,
        weight: body.weight,
        moves: body.moves,
        image: body.image,
      },
    });

    return c.json({ message: `${updatedPokemon.pokemonname} updated successfully`, pokemon: updatedPokemon });
  } catch (e) {
    console.error(e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        // Record to update not found
        return c.json({ message: 'Pokémon not found' }, 404);
      }
    }
    return c.json({ message: 'An error occurred while updating the Pokémon record' }, 500);
  }
});

// DELETE A PARTICULAR POKEMON RECORD 
app.delete('/pokemon/delete', async (c) => {
  try {
    const body = await c.req.json();

    // Attempt to delete the Pokemon record
    const deletedPokemon = await prisma.caught.delete({
      where: {
        pokemonid: body.pokemonid,
      },
    });

    // Check if a record was deleted
    if (deletedPokemon) {
      return c.json({ message: `Pokemon with ID ${body.pokemonid} deleted successfully` });
    } else {
      return c.json({ message: `Pokemon with ID ${body.pokemonid} not found` }, 404);
    }

  } catch (error) {
    console.error('Error deleting Pokemon:', error);
    return c.json({ message: 'Failed to delete Pokemon' }, 500);
  }
});

// ENDPOINT OF USER LOGIN
app.post("/login", async (c) => {
  try {
    const body = await c.req.json();

    const user = await prisma.userinfo.findUnique({
      where: { email: body.email },
      select: { id: true, hashedpassword: true },
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    const passwordMatch = await bcrypt.compare(body.password, user.hashedpassword);
    if (!passwordMatch) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    const payload = {
      sub: body.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    const secret = process.env.JWT_SECRET || "mySecretKey";
    const token = await sign(payload, secret);

    return c.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
});

// Serve 
const port = 8080;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});