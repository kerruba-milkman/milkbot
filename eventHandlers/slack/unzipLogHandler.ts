import {ChatPostMessageArguments} from "@slack/web-api";
import {retrieveUnzippedLogEntry} from "../../actions/logUnzipper";
import {BotMessage} from "../../interfaces/MessageInterfaces";
import {HelpBlock} from "./helpHandler";
import {createErrorChatPostArguments, debounceMessage, parseMultiSpacedArguments} from "../../utils/messageUtils";
import * as consts from '../../consts';
import {Config} from '../../config'
import moment = require("moment");

const logger = Config.logger
const uuidRegex = /^"?[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}"?$/i


export async function handleLogs(botMessage: BotMessage): Promise<BotMessage> {

    let searchString = botMessage.inputMessageFromUser.substring(0, botMessage.inputMessageFromUser.indexOf("search-logs") + "search-logs".length)

    searchString = botMessage.inputMessageFromUser.replace(searchString, "").trim()
    let searchStringWithoutArgs = searchString

    const args = parseMultiSpacedArguments(searchString)
    let parsedArgs = consts.SEARCH_STRING_PARAMS_SEPARATOR
    for (let i = 0; i < args.length - 1; i++) {
        if (args[i] === '--time') {
            let timestamp
            timestamp = args[i + 1]
            timestamp = moment(timestamp)
            if (timestamp.isValid()) {
                let milkbotLogTimestampParam = `${consts.MILKBOT_TIMESTAMP_ARG_NAME}=${timestamp.valueOf()}`
                parsedArgs += milkbotLogTimestampParam
                searchStringWithoutArgs = searchStringWithoutArgs.replace(args[i], '')
                searchStringWithoutArgs = searchStringWithoutArgs.replace(args[i + 1], '')
                i++
            } else {
                logger.error("time param is not a valid timestamp")
                botMessage.chatPostMessageArguments = createErrorChatPostArguments(botMessage, "Search Logs", "Time param is not a valid timestamp. Use ISO8601 format")
                return botMessage
            }
        } else {
            logger.error("Unrecognized parameter " + args[i])
            botMessage.chatPostMessageArguments = createErrorChatPostArguments(botMessage, "Search Logs", "Parameter " + args[i] + " is not supported")
            return botMessage
        }
    }

    searchStringWithoutArgs = searchStringWithoutArgs.trim()

    if (!searchStringWithoutArgs.match(uuidRegex)) {
        botMessage.chatPostMessageArguments = createErrorChatPostArguments(botMessage, "Search Logs", "Search string is not a valid UUID")
        return botMessage
    }

    if (!searchStringWithoutArgs) {
        throw new Error(consts.ERROR_MISSING_DATA_IN_MESSAGE)
    }

    let userWorflow: ChatPostMessageArguments = {
        channel: botMessage.requestChannelId,
        text: 'Search Logs',
        blocks: [
            {
                type: "section" as const,
                block_id: "section567",
                text: {
                    type: "mrkdwn" as const,
                    text: "Hello, I'm going to retrieve log entries from logGroups.\nSearch id:\n\n" + searchStringWithoutArgs
                },
                accessory: {
                    type: "image" as const,
                    image_url: "https://i.imgur.com/9WcRBXo.png",
                    alt_text: "Log"
                }
            },
            {
                type: "section",
                block_id: searchStringWithoutArgs + parsedArgs,
                text: {
                    type: "mrkdwn",
                    text: "Please select the log group"
                },
                accessory: {
                    action_id: "search_logs",
                    type: "multi_static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select log group"
                    },
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "Tracking - DEV"
                            },
                            value: "/ecs/tracking-dev"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Dashboard - DEV"
                            },
                            value: "/ecs/dashboard-dev"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Core API - DEV"
                            },
                            value: "/ecs/api-dev-api"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Convergence - DEV"
                            },
                            value: "/ecs/convergence-dev"
                        },
                        // {
                        //     text: {
                        //         type: "plain_text",
                        //         text: "Tracking - PROD"
                        //     },
                        //     value: "/ecs/tracking-prod"
                        // },
                        // {
                        //     text: {
                        //         type: "plain_text",
                        //         text: "Dashboard - PROD"
                        //     },
                        //     value: "/ecs/dashboard-prod"
                        // },
                        {
                            text: {
                                type: "plain_text",
                                text: "Core API - PROD"
                            },
                            value: "/ecs/api-prod-api"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "WSPoste - PROD"
                            },
                            value: "/ecs/ws-poste-prod"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Routing - DEV"
                            },
                            value: "/ecs/routing-dev"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Routing - PROD"
                            },
                            value: "/ecs/routing-prod"
                        }
                    ]
                }
            },
            {
                type: "section" as const,
                block_id: "wait_section",
                text: {
                    type: "mrkdwn" as const,
                    text: "Logs search can take a while. Please wait for update messages!"
                }
            }
        ]
    }
    botMessage.chatPostMessageArguments = userWorflow
    return botMessage;
}

export async function searchLogsActions(i: BotMessage): Promise<BotMessage> {
    debounceMessage(i)
    i.expectedResponseType = 'chat'

    let searchString
    let selectedOptions
    let args

    i.actions.forEach(function (action: any) {
            if (action.action_id === 'search_logs') {
                let removeParamsArray = action.block_id.split(consts.SEARCH_STRING_PARAMS_SEPARATOR)
                if (removeParamsArray.length == 2) {
                    searchString = removeParamsArray[0]
                    args = removeParamsArray[1]
                    logger.info("managing search with following params " + args)
                } else {
                    searchString = action.action_id
                }
                selectedOptions = action.selected_options
            }
        }
    )

    let selectedLogGroups = selectedOptions.map(function (item) {
        return item.value
    })

    let logsLink

    await Promise.all(selectedLogGroups.map(async (logPath) => {
        logsLink = await retrieveUnzippedLogEntry(searchString, args, logPath, i)
    }));

    if (!logsLink || logsLink === "") {
        i.chatPostMessageArguments = {
            channel: i.requestChannelId,
            text: "No logs",
            blocks: [
                {
                    type: "section" as const,
                    block_id: "section1",
                    text: {
                        type: "mrkdwn" as const,
                        text: `:heavy_exclamation_mark: No logs has been found for id ${searchString} and provided options`
                    }
                }
            ]

        }

    } else {
        i.chatPostMessageArguments = {
            channel: i.requestChannelId,
            text: "Log S3 Link",
            blocks: [
                {
                    type: "section" as const,
                    block_id: "section1",
                    text: {
                        type: "mrkdwn" as const,
                        text: "Log uploaded correctly and available here:\n" + logsLink +
                            "\n:bulb: Tip: In order to access the .log file, you must be logged in the Milkman VPN."
                    }
                }
            ]
        }
    }


    return i
}

export function describeCommand(): HelpBlock {

    const helpBlock: HelpBlock = {
        command: "search-logs [--time <timestamp>] <id>",
        description: "This command search CloudWatch logs around a given timestamp for a given id. The logs will be uploaded on S3"
    }
    return helpBlock
}
