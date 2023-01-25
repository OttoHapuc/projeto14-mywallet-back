import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import joi from 'joi';
import { MongoClient } from 'mongodb';
import { v4 as uuidV4 } from 'uuid';
import dayjs from 'dayjs';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = 5678;

const mongoCliente = new MongoClient(process.env.DATABASE_URL);
let db;
try{
    await mongoCliente.connect()
    db = mongoCliente.db();
} catch (err){console.log(err)};

const schemaLogin = joi.object({
    email: joi.string().required(),
    password: joi.string().required()
});

const schemaNewUser = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
    confirmPassword: joi.any().valid(joi.ref("password"))
});

const schemaInputAndOutput = joi.object({
    value: joi.number().required(),
    description: joi.string().required(),
    type: joi.string().valid("entrada", "saida").required()
})

app.post("/", async (req,res)=>{
    const {email, password} = req.body;
    const validation = schemaLogin.validate({email, password}, {abortEarly: false});
    if(validation.error){
        const errors = validation.error.details.map((detail)=> detail.message);
        return res.status(422).send(errors);
    };
    try{
        const userFound = await db.collection("users").findOne({email: email});
        if (userFound){
            return res.send({name: userFound.name});
        };
    }catch(e) {res.sendStatus(500)}
});

app.post("/cadastro", async(req, res) => {
    const {name,email,password,confirmPassword} = req.body;
    const emailExist = await db.collection("users").findOne({email:email});
    if(emailExist) return res.status(409).send("email already exists");
    const validation = await schemaNewUser.validate({name, email,password,confirmPassword}, {abortEarly: false});
    if(validation.error){
        const errors = await validation.error.details.map((detail)=> detail.message);
        return res.status(422).send(errors);
    };
    try{
        await db.collection("users").insertOne({name,email,password});
        res.status(201).send("OK");
    }catch(e){res.sendStatus(500)};
})

app.get("/home", async (req,res) => {
    const user = req.headers.user;
    if(!user) return res.sendStatus(401);
    const userExist = await db.collection("users").findOne({name: user});
    if(!userExist) return res.sendStatus(401);
    try{
        const balance = await db.collection("balance").find({user: userExist._id}).toArray();
        res.send(balance)
    }catch(e){res.sendStatus(500)};
})

app.post('/nova-entrada-saida', async (req, res) => {
    const user = req.headers.user;
    const {value, description, type} = req.body;
    if(!user) return res.sendStatus(401);
    const userExist = await db.collection("users").findOne({name: user});
    if(!userExist) return res.sendStatus(401);
    const validation = schemaInputAndOutput.validate({value,description,type}, {abortEarly: false});
    if(validation.error){
        const errors = validation.error.details.map((detail)=> detail.message);
        return res.status(422).send(errors);
    };
    try{
        await db.collection("balance").insertOne({user: userExist._id, value,description,type,data:dayjs().format("DD/MM")});
        res.status(201).send("OK")
    }
    catch(e){res.sendStatus(500)};
})


app.listen(PORT);