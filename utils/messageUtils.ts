import {BotMessage, MessageCommand, QueueMessage} from "../interfaces/MessageInterfaces"
import axios from "axios";
import {Config} from '../config'

const logger = Config.logger
const QUOTE_REGEX = /\"/g
const ATTRIBUTE_REGEX = /--(?<attribute>\S+?)\s+(?<value>\".+?\"|\S+)/g
const GITHUB_COMMAND_REGEX = /^(?<command>\/\w+)/ // All commands should start with /, e.g /test. Only first command is matched

export async function debounceMessage(i: BotMessage) {

    //replacing message to avoid multi-calls for the same
    axios.post(i.responseUrl, {
        replace_original: "true",
        blocks: [
            {
                "type": "section" as const,
                "text": {
                    "type": "mrkdwn",
                    "text": ":v: Thanks for your request, we'll process it and get back to you"
                }
            }
        ],
    }).catch((error) => {
        logger.error(error)
    })
}

export function parseMultiSpacedArguments(command: string) {
    let isLastCharSpace = false;
    let parmChars = Array.from(command);
    let inQuote = false;
    for (let i = 0; i < parmChars.length; i++) {
        if (parmChars[i] == '"')
            inQuote = !inQuote;
        if (!inQuote && parmChars[i] == ' ' && !isLastCharSpace)
            parmChars[i] = '\n';

        isLastCharSpace = parmChars[i] == '\n' || parmChars[i] == ' ';
    }

    return (parmChars.join('')).split('\n');
}

export function createErrorChatPostArguments(botMessage: BotMessage, botFunction: string, errorMessage: string) {

    let message = {
        channel: botMessage.requestChannelId,
        text: botFunction,
        blocks: [
            {
                type: "section" as const,
                block_id: "section1",
                text: {
                    type: "mrkdwn" as const,
                    text: ":heavy_exclamation_mark:  There is an error: " + errorMessage
                }
            }
        ]
    }
    return message
}

export function parseCommand(command: string): MessageCommand {
    const messageCommand = {
        command: '',
        arguments: [],
        attributes: {}
    }

    const numberOfQuotesInString = (command.match(QUOTE_REGEX) || []).length
    if (numberOfQuotesInString % 2 !== 0) {
        logger.error('command not valid, mismatch in the number of quotes')
        return undefined
    }

    command = command.replace(/\s+/g, ' ')

    let parsedCommand = getCommandFromMessage(command)
    if (parsedCommand === '') {
        messageCommand.command = ''
        return messageCommand
    }

    messageCommand.command = parsedCommand.toLowerCase()
    command = command.substr(command.indexOf(parsedCommand) + parsedCommand.length).trim()

    messageCommand.attributes = {...getAttributesFromMessage(command)}
    command = command.replace(ATTRIBUTE_REGEX, '').trim().replace(/\s+/g, ' ')

    messageCommand.arguments = getArgumentsFromMessage(command)

    return messageCommand
}

function getCommandFromMessage(command: string): string {
    const splitCommand = command.split(' ')

    if (splitCommand[0].match(/<@.*?>/)) {
        if (splitCommand.length === 1) {
            return ''
        }

        return splitCommand[1]
    }

    return splitCommand[0]
}

function getAttributesFromMessage(command: string): any {
    let m
    const attributes = {}

    while (m = ATTRIBUTE_REGEX.exec(command)) {
        if (attributes.hasOwnProperty(m[1])) {
            throw Error(`Invalid command, attribute ${m[1]} is duplicated`)
        }
        attributes[m[1]] = m[2].replace(QUOTE_REGEX, '')
    }

    return attributes
}

function getArgumentsFromMessage(command: string): string[] {
    let m
    const args = []
    const argsRegex = /(\".+\"|\S+)/g

    while (m = argsRegex.exec(command)) {
        args.push(m[0].replace(QUOTE_REGEX, ''))
    }

    return args
}


export function parseQueueMessage(message: any): QueueMessage {
    let queueMessage: QueueMessage = {
        message: message,
        parsedMessageBody: JSON.parse(message.Body)
    }

    let body = queueMessage.parsedMessageBody.body

    if (body) {
        if (queueMessage.parsedMessageBody.isBase64Encoded) {
            //to be refactored - this can be surely done better
            let buff = Buffer.from(body, 'base64')
            body = buff.toString('utf8')
            body = body.replace("payload=", "")
            body = unescape(body)
        }

        queueMessage.parsedIncomingMessage = JSON.parse(body);

        logger.info(body)
    } else {
        queueMessage.parsedIncomingMessage = queueMessage.parsedMessageBody
    }

    return queueMessage
}

export function parseGithubCommand(body: string): string | undefined {
    let match = GITHUB_COMMAND_REGEX.exec(body)
    if (match != null && match.groups != undefined) {
        return match.groups["command"]
    }
    return undefined;
}

export function createValidQueueMessage(body: object, options: object) {
    return {
        body: JSON.stringify(body),
        ...options
    }
}

