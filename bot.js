const Discord = require('discord.js')
const Axios = require('axios')
const cron = require("node-cron")

// const { discord_token, general_channel_id } = require("./config.json")
discord_token = process.env.BOT_TOKEN
general_channel_id = process.env.GENERAL_CHANNEL_ID

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
            if (verifyAllDriverInfo()) {
                reLogin()
            }
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
            if (verifyAllDriverInfo()) {
                getAvailableAppointmentsEndpointForAllLocations(true)
            }
            break
        case "start":
            if (verifyAllDriverInfo()) {
                task.start()
                message.channel.send("Job started")
            } 
            break
        case "stop":
            task.stop()
            message.channel.send("Job stopped")
            break
        case "print":
            message.channel.send(
                `Bearer Token: ${bearer_token} | Driver Last Name: ${driver_last_name} | Driver License Number: ${driver_license_num} | Driver Keyword: ${driver_keyword}`
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

    let response
    
    try {
        response = await Axios.post( 
            getAvailableAppointmentsEndpoint,
            bodyParameters,
            config
          )
    } catch (err) {
        if (err.response) {
            await reLogin()
            return fetchAvailableAppointments(location_id)
        }
    }

    return response.data
}


//
// Services
//

const verifyAllDriverInfo = () => {
    if (driver_last_name && driver_license_num && driver_keyword) {
        return true
    } else {
        general_channel.send("The following settings are missing:")
        if (!driver_last_name) {
            general_channel.send("Driver Last Name")
        }
        if (!driver_license_num) {
            general_channel.send("Driver License Number")
        }
        if (!driver_keyword) {
            general_channel.send("Driver Keyword")
        }
    }
}

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
                general_channel.send(`@everyone Appointment found for ${key}`)
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
    getAvailableAppointmentsEndpointForAllLocations()
}, {
    scheduled: false
})



