import {BotMessage} from "../../interfaces/MessageInterfaces";

export function klaatu(i: BotMessage): BotMessage {
    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: "La frase corretta è Klaatu Barada Nikto!",
        blocks: [
            {
                type: "section" as const,
                block_id: "section1",
                text: {
                    type: "mrkdwn" as const,
                    text: "La frase corretta è Klaatu Barada Nikto!"
                }
            }
        ]
    }
    return i
}
