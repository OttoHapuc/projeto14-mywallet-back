import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import joi from 'joi';
import { MongoClient } from 'mongodb';

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
    const validation = schemaNewUser.validate({name, email,password,confirmPassword}, {abortEarly: false});
    if(validation.error){
        const errors = validation.error.details.map((detail)=> detail.message);
        return res.status(422).send(errors);
    };
    try{
        await db.collection("users").insertOne({name,email,password});
        res.status(201).send("OK");
    }catch(e){res.sendStatus(500)};
})


app.listen(PORT);