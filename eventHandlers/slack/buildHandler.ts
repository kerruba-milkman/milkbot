import {BotMessage} from "../../interfaces/MessageInterfaces";
import {createErrorChatPostArguments, debounceMessage} from "../../utils/messageUtils";
import * as consts from '../../consts';
import {Config} from '../../config'
import {HelpBlock} from "./helpHandler";
import {build} from "../../actions/build";

const logger = Config.logger

export async function handleBuild(botMessage: BotMessage): Promise<BotMessage> {
    if (botMessage.command.arguments.length < 1) {
        throw new Error(consts.ERROR_MISSING_DATA_IN_MESSAGE)
    }

    const commitHash = botMessage.command.arguments[0]
    if (commitHash.includes(' ') || commitHash.includes('-')) {
        botMessage.chatPostMessageArguments = createErrorChatPostArguments(botMessage, 'Build', 'The required commit ID must be an UUID value')
        return botMessage
    }

    if (!botMessage.command.attributes.hasOwnProperty('tag')) {
        botMessage.chatPostMessageArguments = createErrorChatPostArguments(botMessage, 'Build', 'Missing required attribute tag')
        return botMessage
    }

    if (['prod', 'ff'].includes(botMessage.command.attributes.tag)) {
        botMessage.chatPostMessageArguments = createErrorChatPostArguments(botMessage, 'Build', `The tag ${botMessage.command.attributes.tag} is not supported for this command`)
        return botMessage
    }

    const parsedAttributes = `${consts.MILKBOT_ECR_TAG_ARG_NAME}=${botMessage.command.attributes.tag}`

    botMessage.expectedResponseType = 'chat'

    botMessage.chatPostMessageArguments = {
        channel: botMessage.requestChannelId,
        text: 'Build',
        blocks: [
            {
                type: "section" as const,
                block_id: "section567",
                text: {
                    type: "mrkdwn" as const,
                    text: "Hello, please select the application to build."
                }
            },
            {
                type: "section",
                block_id: commitHash + consts.SEARCH_STRING_PARAMS_SEPARATOR + parsedAttributes,
                text: {
                    type: "mrkdwn",
                    text: "Choose the application"
                },
                accessory: {
                    action_id: "build",
                    type: "static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Choose the application"
                    },
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "API"
                            },
                            value: "api-tech"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "API Dashboard"
                            },
                            value: "api-dashboard-tech"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Routing"
                            },
                            value: "routing-dev"
                        }
                    ]
                }
            }
        ]
    }

    return botMessage
}


export async function buildAction(botMessage: BotMessage): Promise<BotMessage> {
    debounceMessage(botMessage)

    botMessage.expectedResponseType = 'chat'

    let service = ''
    let commitHash = ''
    let args

    botMessage.actions.forEach(function (action: any) {
        if (action.action_id === 'build') {
            let removeParamsArray = action.block_id.split(consts.SEARCH_STRING_PARAMS_SEPARATOR)
            commitHash = removeParamsArray[0]
            args = removeParamsArray[1]
            logger.info("building image with args " + args)
            service = action.selected_option.value
        }
    })

    botMessage.chatPostMessageArguments = {
        channel: botMessage.requestChannelId,
        text: 'Build',
        blocks: await build(service, commitHash, args)
    }

    return botMessage
}

export function describeCommand(): HelpBlock {
    return {
        command: "build <commit-hash> --tag <tag>",
        description: 'This command build a specific commit hash and tag it with the passed tag'
    }
}
