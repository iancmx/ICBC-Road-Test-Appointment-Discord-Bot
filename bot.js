const Discord = require('discord.js')
const Axios = require('axios')
const cron = require("node-cron")

// const { discord_token } = require("./config.json")
discord_token = process.env.BOT_TOKEN

//
// Global variables
//
const client = new Discord.Client()

let bearer_token
let driver_last_name
let driver_license_num
let driver_keyword

const getAvailableAppointmentsEndpoint = "https://onlinebusiness.icbc.com/deas-api/v1/web/getAvailableAppointments"
const loginEndpoint = "https://onlinebusiness.icbc.com/deas-api/v1/webLogin/webLogin"


const prefix = "!"


const location_dict = {
    richmond_claim_center: 273,
    richmond_driver_licensing: 93
}

const general_channel_id = "860994048831914037"
let general_channel


//
// Bot actions
//


client.once('ready', () => {
	console.log("Connected as " + client.user.tag)
    general_channel = client.channels.cache.get(general_channel_id)
})

client.on('message', (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(' ');
	const command = args.shift().toLowerCase();

	switch(command) {
        case "relogin":
            reLogin()
            break
        case "set_token":
            bearer_token = args[0]
            break
        case "set_driver_last_name":
            driver_last_name = args[0]
            break
        case "set_driver_license_num":
            driver_license_num = args[0]
            break
        case "set_driver_keyword":
            driver_keyword = args[0]
            break
        case "fetch":
            getAvailableAppointmentsEndpointForAllLocations(true)
            break
        case "start":
            if (bearer_token && driver_last_name && driver_license_num && driver_keyword) {
                task.start()
            } else {
                message.channel.send("The following settings are missing:")
                if (!bearer_token) {
                    message.channel.send("Bearer Token")
                }
                if (!driver_last_name) {
                    message.channel.send("Driver Last Name")
                }
                if (!driver_license_num) {
                    message.channel.send("Driver License Number")
                }
                if (!driver_keyword) {
                    message.channel.send("Driver Keyword")
                }
            }
            break
        case "stop":
            task.stop()
        case "print":eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MjUzNTg4OTMsInN1YiI6IjI2MDUwOTIiLCJpYXQiOjE2MjUzNTcwOTMsInByb2ZpbGUiOiJ7XCJ1c2VySWRcIjpcIjI2MDUwOTJcIixcInJvbGVzXCI6W1wiSm9lUHVibGljXCJdfSJ9.y8c0DiQ_Rbz9K2_PctW9kc415vhQJzGsZHfMObGJpR4
            message.channel.send(
                `Bearer Token: ${bearer_token} | Driver Last Name: ${driver_last_name} | Driver Lisence Number: ${driver_license_num} | Driver Keyword: ${driver_keyword}`
            )
            break
    }
})

client.login(discord_token);



//
// ICBC API
//
const reLogin = async () => {
    const bodyParameters = {
        drvrLastName: driver_last_name,
        keyword: driver_keyword,
        licenceNumber: driver_license_num
    }

    const response = await Axios.put(
        loginEndpoint,
        bodyParameters,
    )
    
    bearer_token = response.headers.authorization.split(" ")[1]
}


const fetchAvailableAppointments = async (location_id) => {
    const config = {
        headers: { Authorization: `Bearer ${bearer_token}` }
    };
    
    const bodyParameters = {
        aPosID: location_id,
        examDate: new Date().toISOString().split("T")[0],
        examType: "7-R-1",
        ignoreReserveTime: false,
        lastName: driver_last_name,
        licenseNumber: driver_license_num,
        prfDaysOfWeek: "[0,1,2,3,4,5,6]",
        prfPartsOfDay: "[0,1]",
    };
    
    const response = await Axios.post( 
      getAvailableAppointmentsEndpoint,
      bodyParameters,
      config
    )

    return response.data
}


//
// Services
//

const getAvailableAppointmentsEndpointForAllLocations = (verbose=false) => {
    for (const [key, value] of Object.entries(location_dict)) {
        fetchAvailableAppointments(value).then(response => {
            console.log(key)
            console.log(response)
            if (!response[0]) {
                if (verbose)  {
                    general_channel.send(`No available appointments found for ${key}`)
                }
            } else {
                general_channel.send(`@here Appointment found for ${key}`)
                for (appointment of response) {
                    console.log(appointment)
                    general_channel.send(JSON.stringify(appointment, null, 2))
                }
            }
        })
      }
}

//
// Cron job task
//

const task = cron.schedule('* * * * *', () => {
    getAvailableAppointmentsEndpointForAllLocabearer_tokentions()
}, {
    scheduled: false
})



