import {BotMessage} from "../../interfaces/MessageInterfaces";
import {ChatPostMessageArguments} from "@slack/web-api";
import {HelpBlock} from "./helpHandler";
import {createErrorChatPostArguments, debounceMessage, parseMultiSpacedArguments} from "../../utils/messageUtils"
import {deployForQA} from "../../actions/deployForQA";
import * as consts from '../../consts';
import {Config} from '../../config'

const logger = Config.logger

export async function handleDeployForQA(i: BotMessage): Promise<BotMessage> {

    let commitHash = i.inputMessageFromUser.substring(0, i.inputMessageFromUser.indexOf(consts.DEPLOY_FOR_QA_COMMAND) + consts.DEPLOY_FOR_QA_COMMAND.length)

    commitHash = i.inputMessageFromUser.replace(commitHash, "").trim()

    const args = parseMultiSpacedArguments(commitHash)
    //parsedArgs will contain all the parameters renamed
    let parsedArgs = consts.SEARCH_STRING_PARAMS_SEPARATOR

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--tag') {
            let ecrTag
            ecrTag = args[i + 1]

            parsedArgs += consts.MILKBOT_ECR_TAG_ARG_NAME + '=' + ecrTag

            commitHash = commitHash.replace(args[i], '')
            commitHash = commitHash.replace(args[i + 1], '')

            //ignoring next because it is meant to be value of the param
            i++
        }
    }

    commitHash = commitHash.trim()

    if (commitHash.includes("-")) {
        i.chatPostMessageArguments = createErrorChatPostArguments(i, "Deploy for QA", "There are not parsable args")
        return i
    }

    if (commitHash.includes(" ")) {
        i.chatPostMessageArguments = createErrorChatPostArguments(i, "Deploy for QA", "commit hash must be an UUID value")
        return i
    }

    if (!parsedArgs.includes(consts.MILKBOT_ECR_TAG_ARG_NAME)) {
        i.chatPostMessageArguments = createErrorChatPostArguments(i, "Deploy for QA", "tag argument must be present")
        return i
    }

    if (!commitHash) {
        throw new Error(consts.ERROR_MISSING_DATA_IN_MESSAGE)
    }


    i.expectedResponseType = 'chat'

    let deployOptionsMessage: ChatPostMessageArguments = {
        channel: i.requestChannelId,
        text: 'Deploy for QA',
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
                block_id: commitHash + parsedArgs,
                text: {
                    type: "mrkdwn",
                    text: "Choose the application"
                },
                accessory: {
                    action_id: "deploy_for_qa",
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
                        // {
                        //     text: {
                        //         type: "plain_text",
                        //         text: "Dashboard"
                        //     },
                        //     value: "dashboard-qa"
                        // },
                        // {
                        //     text: {
                        //         type: "plain_text",
                        //         text: "Tracking"
                        //     },
                        //     value: "web-app-qa"
                        // }
                    ]
                }
            }
        ]
    }
    i.chatPostMessageArguments = deployOptionsMessage
    return i
}


export async function deployForQAAction(i: BotMessage): Promise<BotMessage> {

    debounceMessage(i)

    i.expectedResponseType = 'chat'

    let service = ''
    let commitHash = ''
    let args

    i.actions.forEach(function (action: any) {
            if (action.action_id === 'deploy_for_qa') {
                let removeParamsArray = action.block_id.split(consts.SEARCH_STRING_PARAMS_SEPARATOR)
                if (removeParamsArray.length == 2) {
                    commitHash = removeParamsArray[0]
                    args = removeParamsArray[1]
                    logger.info("building image with args " + args)
                } else {
                    commitHash = action.block_id
                }
                service = action.selected_option.value

            }
        }
    )

    i.chatPostMessageArguments = {
        channel: i.requestChannelId,
        text: "Deploy For QA",
        blocks: await deployForQA(service, commitHash, args)
    }

    return i

}

export function describeCommand(): HelpBlock {

    const helpBlock: HelpBlock = {
        command: "deploy-for-qa <commit-hash> --tag <tag>",
        description: "This command deploys a specific commit hash in QA environment."
    }
    return helpBlock
}
