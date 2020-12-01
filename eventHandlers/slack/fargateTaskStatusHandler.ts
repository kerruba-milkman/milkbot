import {BotMessage} from "../../interfaces/MessageInterfaces";
import {retrieveStatus} from "../../actions/fargateTaskStatusRetriever";
import {ChatPostMessageArguments} from "@slack/web-api";
import {HelpBlock} from "./helpHandler";
import {debounceMessage} from "../../utils/messageUtils";

export async function getFargateTasksStatus(i: BotMessage): Promise<BotMessage> {
    i.expectedResponseType = 'chat'

    let userWorflow: ChatPostMessageArguments = {
        channel: i.requestChannelId,
        text: 'Tasks Status',
        blocks: [
            {
                type: "section" as const,
                block_id: "section567",
                text: {
                    type: "mrkdwn" as const,
                    text: "Hello, please select the cluster to get the tasks status."
                }
            },
            {
                type: "section",
                block_id: "section568",
                text: {
                    type: "mrkdwn",
                    text: "Choose the cluster"
                },
                accessory: {
                    action_id: "fargate_tasks_status",
                    type: "static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Choose the cluster"
                    },
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "Milkman PROD"
                            },
                            value: "milkman-prod"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Milkman NEXT"
                            },
                            value: "milkman-next"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Milkman DEV"
                            },
                            value: "milkman-dev"
                        }
                    ]
                }
            }
        ]
    }
    i.chatPostMessageArguments = userWorflow
    return i
}


export async function fargateTasksStatusAction(i: BotMessage): Promise<BotMessage> {

    debounceMessage(i)

    i.expectedResponseType = 'chat'

    let cluster = ''

    i.actions.forEach(function (action: any) {
            if (action.action_id === 'fargate_tasks_status') {
                cluster = action.selected_option.value
            }
        }
    )

    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: "Service Status",
        blocks: await retrieveStatus(cluster)
    }

    return i

}

export function describeCommand(): HelpBlock {

    const helpBlock: HelpBlock = {
        command: "task-status",
        description: "This command gives the status of the fargate services of a specific cluster, choosen from a dropdown list."
    }
    return helpBlock
}
