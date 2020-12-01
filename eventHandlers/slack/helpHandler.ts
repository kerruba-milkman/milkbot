import {BotMessage} from "../../interfaces/MessageInterfaces";
import {describeCommand as echoHandlerDescribeCommand} from "./echoHandler";
import {describeCommand as fargateTaskStatusDescribeCommand} from "./fargateTaskStatusHandler";
import {describeCommand as fargateServiceStatusDescribeCommand} from "./fargateServiceStatusHandler";
import {describeCommand as searchLogsDescribeCommand} from "./unzipLogHandler";
import {describeCommand as vonageStatusDescribeCommand} from "./vonageStatusHandler";
import {describeCommand as deployForQADescribeCommand} from './deployForQAHandler'
import {describeCommand as buildDescribeCommand} from './buildHandler'

export interface HelpBlock {
    command: string
    description: string

    type?: string

}

export function handleHelp(i: BotMessage): BotMessage {

    let blocks = []
    let functionsBlocks = []

    blocks.push({
        type: "section" as const,
        text: {
            type: "mrkdwn" as const,
            text: "I can do *a lot* of things! Invoke me with @Milkbot <command>\nCommands list:"
        }
    })

    functionsBlocks.push(echoHandlerDescribeCommand())
    functionsBlocks.push(fargateTaskStatusDescribeCommand())
    functionsBlocks.push(fargateServiceStatusDescribeCommand())
    functionsBlocks.push(searchLogsDescribeCommand())
    functionsBlocks.push(vonageStatusDescribeCommand())
    functionsBlocks.push(deployForQADescribeCommand())
    functionsBlocks.push(buildDescribeCommand())

    functionsBlocks.map((helpBlock: HelpBlock) => {
        blocks.push({
            type: "section" as const,
            text: {
                type: "mrkdwn" as const,
                text: ">*" + helpBlock.command + "*\n" + ">" + helpBlock.description
            }
        })
    })

    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: "Commands List",
        blocks
    }

    return i
}
