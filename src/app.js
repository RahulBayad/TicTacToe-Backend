const express = require("express")
const cors = require("cors")
const http = require("http")
const dotenv = require("dotenv")
const { Server} = require("socket.io")
const db = require("./db/mongoDB.js")

dotenv.config({
    path : "./.env"
})
const app = express();

// db.dbConnect().then(()=>{
//     console.log("connected to mongoDB database")
// }).catch((err)=>{
//     console.log("error while connecting to database",err);
// });

app.use(express.json())
app.use(cors({origin : "http://localhost:5173"}))

const server = http.createServer(app)
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173", 
        methods: ["GET", "POST"], 
    },
})

// const chess = new Chess();

let waitingPlayer = null;
let games = {}

const checkWinner = (gameState)=> {
    const winnerCombinations = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[3,5,8],  
      [0,4,8],[2,4,6],
    ]
    for(let winnerCombination of winnerCombinations){
      let [a,b,c] = winnerCombination;
      if(gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]){
        return gameState[a]
      }
    }
    return null
}

io.on("connection",(socket)=>{
    console.log("io connected",socket.id);
    

    socket.on("startGame",()=>{
        console.log("hey");
        
        if(waitingPlayer){
            playerTurn = false // in begining, player 2 will not have turn (player1 is wainting players)
            let player1 = io.sockets.sockets.get(waitingPlayer)
            let player2 = socket.id;
            
            let roomId = `${player1.id}_${player2}`
            
            socket.join(roomId)
            player1.join(roomId)
            socket.roomId = roomId
            player1.roomId = roomId
            
            //initialising room
            games[roomId] = {      
                roomId, 
                room : { 
                    [player1.id] : "X",
                    [player2] : "O",
                }, 
                gameState : Array(9).fill(null), 
                playerTurn : player1.id,  // player1 will haev turn
                winner : null
            }
            
            socket.emit("startGame", { roomId, connection: true, playerTurn : player1.id })
            io.to(waitingPlayer).emit("startGame",{ roomId, connection: true, playerTurn : player1.id })
            waitingPlayer = null  
        }else{
            waitingPlayer = socket.id        
            socket.emit("startGame",{connection : null , message : "Please wait until we find a player"})
        }
    })

    socket.on("playerMove",({index , roomId})=>{
        let game = games[roomId]
          
        game.gameState[index] = game.room[Object.keys(game.room).find((id)=> id === socket.id)]        
        game.playerTurn = Object.keys(game.room).find((id)=> id !== socket.id)
        let winner = checkWinner(game.gameState)
        
        // game.winner = (winner && winner === game.room[socket.id]) ? socket.id : game.playerTurn 
        game.winner = !winner ? null : winner === game.room[socket.id] ? socket.id : game.playerTurn         
        io.to(roomId).emit("playerMove", game) 
    }) 
    
    socket.on("timeout",({roomId})=>{
        let game = games[roomId]
        game.playerTurn = Object.keys(game.room).find((id)=> id !== game.playerTurn)                        
        io.to(roomId).emit("timeout", game)
    })
    
    socket.on("restart",({roomId})=>{
        let game = games[roomId]
        console.log("game is ",game);
        
        game.gameState = Array(9).fill(null)
        game.playerTurn = Object.keys(game.room).find((id)=> id !== game.winner)
        game.winner = null

        io.to(roomId).emit("restart", game)
    })

    socket.on("disconnect",()=>{
        waitingPlayer = null;
        io.to(socket.roomId).emit("disconnected", {disconnect: true})
    })
})
    

server.listen(3000,(data)=>{
    console.log(data);
    console.log("connected to server at port 3000")
})
