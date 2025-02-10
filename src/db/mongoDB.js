const mongoose = require("mongoose")

const dbConnect = async ()=>{
    let connection = await mongoose.connect(`${process.env.DB_URI}/${process.env.DB_NAME}`)
}

module.exports = {dbConnect}