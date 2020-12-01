import {BotMessage} from "../../interfaces/MessageInterfaces";
import {HelpBlock} from "./helpHandler";

export function echoHandler(i: BotMessage): BotMessage {

    let textToAnswer = echoMessages[Math.floor(Math.random() * Math.floor(echoMessages.length))]
    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: textToAnswer,
        blocks: [
            {
                type: "section" as const,
                block_id: "section1",
                text: {
                    type: "mrkdwn" as const,
                    text: textToAnswer
                }
            }
        ]
    }

    return i
}

export function userCannotExecuteCommandHandler(i: BotMessage): BotMessage {
    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: "You can't use this bot function!",
        blocks: [
            {
                type: "section" as const,
                block_id: "section1",
                text: {
                    type: "mrkdwn" as const,
                    text: "You can't use this bot function!"
                }
            }
        ]
    }
    return i
}

export function describeCommand(): HelpBlock {

    const helpBlock: HelpBlock = {
        command: "<someText>",
        description: "This command answers random text to any random invocation."
    }
    return helpBlock
}

const echoMessages = [
    'Siam mica qui a pettinar le bambole',
    'Hai controllato se next è giù?',
    'Fatto\n - J',
    'Devi proprio mandarmi messaggi a caso?',
    'Non sono stato creato per questo',
    'Non sono sicuro di aver capito',
    'Messaggio da FBI: Smettila di importunare questo bot'
]
