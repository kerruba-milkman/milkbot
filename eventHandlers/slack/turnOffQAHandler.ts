import {BotMessage} from "../../interfaces/MessageInterfaces";
import {retrieveStatus} from "../../actions/fargateServiceStatusRetriever";
import {ChatPostMessageArguments} from "@slack/web-api";
import {HelpBlock} from "./helpHandler";
import {debounceMessage} from "../../utils/messageUtils"
import {Config} from '../../config'

const logger = Config.logger


export async function handleTurnOffQA(i: BotMessage): Promise<BotMessage> {
    i.expectedResponseType = 'chat'

    let userWorflow: ChatPostMessageArguments = {
        channel: i.requestChannelId,
        text: 'Turn off QA Environement',
        blocks: [
            {
                type: "section" as const,
                block_id: "section567",
                text: {
                    type: "mrkdwn" as const,
                    text: "Hello, do you *really* want to turn off QA Environment?"
                }
            },
            {
                type: "actions" as const,
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            emoji: true,
                            text: "Yes"
                        },
                        style: "primary",
                        value: "turn_off"
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            emoji: true,
                            text: "No"
                        },
                        style: "danger",
                        value: "do_nothing"
                    }
                ]
            }
        ]
    }
    i.chatPostMessageArguments = userWorflow
    return i
}


export async function turnOffQAAction(i: BotMessage): Promise<BotMessage> {

    debounceMessage(i)

    i.expectedResponseType = 'chat'

    let service = ''
    let commitHash = ''

    i.actions.forEach(function (action: any) {
            if (action.action_id === 'turn_off') {
                retrieveStatus(service, commitHash)
            }
        }
    )

    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: "Service Status",
        blocks: [{
            type: "section" as const,
            block_id: "section567",
            text: {
                type: "mrkdwn" as const,
                text: "Request accepted, please wait for finish message"
            }
        }]
    }

    return i

}

export function describeCommand(): HelpBlock {

    const helpBlock: HelpBlock = {
        command: "turn-off-qa",
        description: "This command turns off the QA Environment."
    }
    return helpBlock
}
