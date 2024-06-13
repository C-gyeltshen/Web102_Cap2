import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { PrismaClient, Prisma } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { decode, sign, verify } from "hono/jwt";
import { jwt } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";
import bcrypt from "bcrypt";
import { resolve } from "path";

type Variables = JwtVariables;

const prisma = new PrismaClient();

const app = new Hono();

app.use("/*", cors());

app.use(
  "/protected/*",
  jwt({
    secret: "mySecretKey",
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/signUp", async (c) => {
  try {
    const body = await c.req.json();

    const bcryptHash = await bcrypt.hash(body.password, 1);

    const user = await prisma.userinfo.create({
      data: {
        email: body.email,
        hashedpassword: bcryptHash,
        username: body.username,
      },
    });
    console.log(user);
    return c.json({ message: `${user.email} created successfully}` });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        console.log(
          "There is a unique constraint violation, a new user cannot be created with this email"
        );
        return c.json({ message: "Email already exists" });
      }
    }
    // Additional error handling
    console.error(e);
    return c.json({ message: "An error occurred" }, 500);
  }
});

app.post("/login", async (c) => {
  try {
    const body = await c.req.json();

    const bcryptHash_req = await bcrypt.hash(body.password, 1);

    console.log("usr psd hash", bcryptHash_req);
    // console.log(typeof(bcryptHash_req))

    const user_password = await prisma.userinfo.findUnique({
      where: { email: body.email },
      select: { id: true, hashedpassword: true },
    });

    console.log("db usr psd hash", user_password);
    // console.log(typeof(user_password))
    if (!user_password) {
      return c.json({ message: "User not found" });
    }

    const response = bcrypt
      .compare(body.password, user_password.hashedpassword)
      .then((res) => {
        console.log("bcrypt compare", res); // return true
        if (res) {
          // return c.json({ message: "Login successful" });
          const payload = {
            sub: body.email,
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          };
          const secret = "mySecretKey";
          const token = sign(payload, secret).then((res) => {
            console.log("inside",res)
            return res;
          }).then((t) => {
            // return t
          return c.json({ message: "Login successful", token: t });
          });
          console.log("outside",token)

          return token;

          // return c.json({ message: "Login successful", token: token });
        } else {
          throw new HTTPException(401, { message: "Invalid credentials" });
        }
      })
      .catch((err) => console.error(err.message));

    return response;
  } catch (error) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
