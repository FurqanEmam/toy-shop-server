const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sx1hyuo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  console.log("hitting verify jwt");
  console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  console.log("token verify jwt: ", token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorised access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const productsCollection = client.db("toyShopDB").collection("products");

    // sell collection
    const sellCollection = client.db("toyShopDB").collection("sellData");

    //blogs collection
    const blogsCollection = client.db("toyShopDB").collection("blogs");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      console.log(token);
      res.send({ token }); // sending token as object cuj single string cant be formatted in json
    });

    //blogs get api
    app.get("/blogs", async (req, res) => {
      const cursor = blogsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const option = {
        projection: { soldToyName: 1, price: 1, image_url: 1 },
      };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    //sold toy info get
    app.get("/newsoldtoy", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log("verifying jwt done", decoded);
      // console.log(req.headers.authorization);
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await sellCollection.find(query).toArray();
      res.send(result);
    });

    // sell toy info post #
    app.post("/newsoldtoy", async (req, res) => {
      const soldToy = req.body;
      console.log(soldToy);
      const result = await sellCollection.insertOne(soldToy);
      res.send(result);
    });

    //sold toy info delete
    app.delete("/newsoldtoy/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sellCollection.deleteOne(query);
      res.send(result);
    });

    //sold toy info update
    app.patch("/newsoldtoy/:id", async (req, res) => {
      const updateSoldToy = req.body;
      // console.log(updateSoldToy);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateData = {
        $set: {
          status: updateSoldToy.status,
        },
      };
      const result = await sellCollection.updateOne(filter, updateData);
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
  res.send("plahive is running");
});

app.listen(port, () => {
  console.log(`playhive is running on: ${port}`);
});
