const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
  const authHeader = await req?.headers.authorization;
  //console.log(authHeader, 'authHeader from backend');

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: No authorization header provided" });
  }
  const token = await authHeader.split(" ")[1];
  //console.log(token, 'token from backend');
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS)
    //console.log(payload, 'payload from backend');
    next()
  } catch (error) {
    console.log(error, 'error from backend');
    return res.status(403).json({ message: "Forbidden: Invalid token" });
  }

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const db = client.db('curd-nextjs-9-with-figma');
    const destinationCollection = db.collection('destination');
    const bookingCollection = db.collection('bookings');

    app.get('/destination', async (req, res) => {
      const result = await destinationCollection.find().toArray();
      res.json(result);
    })

    app.post('/destination', async (req, res) => {
      const destination = req.body;
      const result = await destinationCollection.insertOne(destination);
      res.json(result);
      console.log(result, 'destination created');
    })

    app.get('/destination/:id', verifyToken, async (req, res) => {
      const { id } = req.params
      const result = await destinationCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    })

    app.patch('/destination/:id', async (req, res) => {
      const { id } = req.params
      const updatedData = req.body

      const result = destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      )

      res.json(result);
    })

    app.delete('/destination/:id', async (req, res) => {
      const { id } = req.params

      const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) })

      res.json(result);
    })

    app.get('/booking', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.json(result);
    })

    app.get('/booking/:userId', async (req, res) => {
      const { userId } = req.params
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.json(result);
    })

    app.post('/booking', verifyToken, async (req, res) => {
      const booking = req.body
      const result = await bookingCollection.insertOne(booking);
      res.json(result);
    })

    app.delete('/booking/:bookingid', async (req, res) => {
      const { bookingid } = req.params
      const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingid) });
      res.json(result);
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server is running fine');
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})