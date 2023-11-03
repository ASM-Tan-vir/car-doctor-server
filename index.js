const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

const port = process.env.PORT || 5000;

// middleware

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t2wjj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("verify token", token);
  if (!token) {
    return res.status(401).send({ massage: "forbidden" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      console.error(err);
      return res.status(401).send({ massage: "unauthorized" });
    }
    console.log("value decoded", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");

    const bookingCollection = client.db("carDoctor").collection("bookings");

    //auth api

    // const jwt = require("jsonwebtoken");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "24h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: token });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("Log out user:-", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //services api

    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //bookings

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      // console.log("token:-", req.cookies.token);
      console.log("user from the valid token", req.user);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const updatedBookings = req.body;
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
