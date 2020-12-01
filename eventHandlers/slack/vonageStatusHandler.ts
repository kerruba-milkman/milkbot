import {BotMessage} from "../../interfaces/MessageInterfaces";
import axios from "axios";
import {HelpBlock} from "./helpHandler";

export async function getVonageStatus(i: BotMessage): Promise<BotMessage> {
    //let textToAnswer = echoMessages[Math.floor(Math.random() * Math.floor(echoMessages.length))]

    let answer = (await axios({
        method: "GET",
        url: 'https://rest.nexmo.com/account/get-balance',
        params: {
            api_key: process.env.VONAGE_API_KEY,
            api_secret: process.env.VONAGE_API_SECRET
        },
        transformResponse: [(data: any): string => {
            let vonageResponse = {}
            try {
                vonageResponse = JSON.parse(data)
                vonageResponse = `Current vonage balance is: ${vonageResponse['value']} and the status of autorecharge is ${vonageResponse['autoReload'] ? 'On' : 'Off'} `
            } catch (e) {
                vonageResponse = e.message
            }
            return JSON.stringify(vonageResponse)
        }]
    })).data

    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: answer,
        blocks: [
            {
                type: "section" as const,
                block_id: "section1",
                text: {
                    type: "mrkdwn" as const,
                    text: answer
                }
            }
        ]
    }

    return i
}

export function describeCommand(): HelpBlock {

    const helpBlock: HelpBlock = {
        command: "vonage-status",
        description: "This command let you get the current balance for our Vonage account"
    }
    return helpBlock
}
