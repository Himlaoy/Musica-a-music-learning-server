require('dotenv').config()
const express = require('express')
const app = express()
const port = process.env.PORT || 5000

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const cors = require('cors')
const jwt = require('jsonwebtoken')


app.use(cors())
app.use(express.json())

// console.log(process.env.USER_NAME ,  process.env.USER_PASS)

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unAuthorization access' })
  }

  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.USER_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: "unAuthorization access" })
    }

    req.decoded = decoded

    next()
  })
}




const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.6ogtg9l.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('musicInstrument').collection('users')
    const classCollection = client.db('musicInstrument').collection('classes')
    const popularClassCollection = client.db('musicInstrument').collection('popularClass')



    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const filter = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user
      }

      const result = await userCollection.updateOne(filter, updateDoc, options)
      res.send(result)

    })

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.USER_SECRET, {
        expiresIn: '10h'
      })

      res.send({ token })
    })

    // get all user
    app.get('/allUser', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })



    // add class

    app.post('/class', async (req, res) => {
      const classes = req.body
      const result = await classCollection.insertOne(classes)
      res.send(result)
    })

    app.get('/class', verifyJwt, async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result)
    })

    // modify class
    app.patch('/allClass/:id', async (req, res) => {
      const id = req.params.id
      const user = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: user
      }

      const result = await classCollection.updateOne(query, updateDoc)
      res.send(result)

    })

    app.put('/selected/class/:id', async(req, res)=>{
      const id = req.params.id
      const user = req.body
      const filter = {_id: new ObjectId(id)}
      const option = {upsert : true}
      const updateDoc ={
        $set: user
      }
      const result = await popularClassCollection.updateOne(filter,updateDoc, option)
      res.send(result)
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      if (user?.role !== 'Admin') {
        return res.status(403).send({ error: true, message: 'access forbidden' })
      }

      next()
    }


    // admin api
    app.get('/users/admin/:email', verifyJwt, verifyAdmin, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }

      const user = await userCollection.findOne(query)
      const result = { admin: user?.role === 'Admin' }
      res.send(result)

    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Here is all about music learning instrument')
})

app.listen(port, () => {
  console.log(`Music instrument learning server in on Port ${port}`)
})