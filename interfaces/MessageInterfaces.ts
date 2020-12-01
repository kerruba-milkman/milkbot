import {ChatPostMessageArguments} from "@slack/web-api";
import * as AWS from "aws-sdk";

export interface QueueMessage {
    message: AWS.SQS.Message
    parsedMessageBody: any
    parsedIncomingMessage?: any
}

export interface BotMessage {
    user?: string
    username?: string
    inputMessageFromUser?: string
    expectedResponseType: 'file' | 'chat'
    chatPostMessageArguments?: ChatPostMessageArguments
    fileToUpload?: string

    actions?: Object[]

    responseUrl?: string

    requestChannelId?: string
    outputChannelId?: string

    error?: Error

    command?: MessageCommand
}

export interface MessageCommand {
    command: string
    arguments: string[]
    attributes: any
}
