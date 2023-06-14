require('dotenv').config()
const express = require('express')
const app = express()
const stripe = require('stripe')(process.env.PAYMENT_GETWAY_SECRET)
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
    // await client.connect();

    const userCollection = client.db('musicInstrument').collection('users')
    const classCollection = client.db('musicInstrument').collection('classes')
    const studentsCollection = client.db('musicInstrument').collection('students')
    const paymentsCollection = client.db('musicInstrument').collection('payments')
    const paymentsSuccessCollection = client.db('musicInstrument').collection('paymentsSuccess')



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
    app.get('/instructor', async (req, res) => {
      const query = { role: 'Instructor' }
      const result = await userCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/allUsers', async(req, res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/user/popular', async (req, res) => {
      const query = { role: "Instructor" }
      // const option = {
      //   sort:{"booked": -1}
      // }

      const result = await userCollection.find(query).limit(6).toArray()
      res.send(result)

    })



    // add class

    app.post('/class', async (req, res) => {
      const classes = req.body
      const result = await classCollection.insertOne(classes)
      res.send(result)
    })

    // get class
    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result)
    })

    app.get('/approve/class', async(req, res)=>{
      const query = {status: 'Approve'}
      const result = await classCollection.find(query).toArray()
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

    // get a class by instructor to update single class

    app.get('/dashboard/updateClass/:id', async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await classCollection.findOne(query)
      res.send(result)
    })

    // selection the class
    app.put('/selected/class/:id', async (req, res) => {
      const id = req.params.id
      const user = req.body
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true }
      const updateDoc = {
        $set: user
      }
      const result = await classCollection.updateOne(filter, updateDoc, option)
      res.send(result)
    })

    // sort the class
    app.get('/class/booked', async (req, res) => {
      const query = {}
      const option = {
        sort: { "booked": -1 }
      }
      const result = await classCollection.find(query, option).limit(6).toArray()
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
    app.get('/users/admin/:email', verifyJwt, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }

      const user = await userCollection.findOne(query)
      const result = { admin: user?.role === 'Admin' }
      res.send(result)

    })

    // instructor api
    app.get('/users/instructor/:email', verifyJwt, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      if (req.decoded.email !== email) {
        return res.send({ instructor: false })
      }

      const user = await userCollection.findOne(query)
      const result = { instructor: user?.role === 'Instructor' }
      res.send(result)

    })

    // student api
    app.get('/users/students/:email', verifyJwt, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      if (req.decoded.email !== email) {
        return res.send({ student: false })
      }

      const user = await userCollection.findOne(query)
      const result = { student: user?.role === 'student' }
      res.send(result)

    })

    // student api
    app.post('/students', async (req, res) => {
      const favClass = req.body
      const result = await studentsCollection.insertOne(favClass)
      res.send(result)
    })

    // get selected class
    app.get('/student/favClass/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await studentsCollection.find(query).toArray()
      res.send(result)
    })

    // delete selected class
    app.delete('/students/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await studentsCollection.deleteOne(query)
      res.send(result)
    })


    // payment api
    app.post("/create-payment-intent", verifyJwt, async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price) * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })

    app.post('/payments', verifyJwt, async(req, res)=>{
      const payments = req.body
      const insertResult = await paymentsCollection.insertOne(payments)

      const query = {_id :{ $in: payments.favClassId.map(id=>new ObjectId(id))}}
      const deleteResult = await studentsCollection.deleteMany(query)

      res.send({insertResult, deleteResult})
    })

    app.post('/payments/success', verifyJwt, async(req, res)=>{
      const payments = req.body
      const insertOne = await paymentsSuccessCollection.insertOne(payments)
      res.send(insertOne)
    })

    app.get('/paySuccess/class/:email', async(req, res)=>{
      const email = req.params.email

      const query = {email: email}
      const result = await paymentsSuccessCollection.find(query).toArray()
      res.send(result)
    } )

    app.get('/paySuccess/AllClass', async(req, res)=>{

      const result = await paymentsSuccessCollection.find().sort({date: -1}).toArray()
      res.send(result)
    } )




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