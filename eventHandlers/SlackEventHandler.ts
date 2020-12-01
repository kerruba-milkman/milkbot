import {EventHandler, EventOutcome} from "./EventHandler";
import {BotMessage, QueueMessage} from "../interfaces/MessageInterfaces";
import {Config} from "../config";
import {handleAction, handleAppMention, handleNotification} from "./slack";
import {sendMessageToSlackChannel} from "../utils/slackUtils";

const logger = Config.logger

export class SlackEventHandler implements EventHandler {
    async handleMessage(queueMessage: QueueMessage) : Promise<EventOutcome> {
        let incomingMessage: BotMessage

        if (queueMessage.parsedIncomingMessage.type === 'event_callback') {
            if (queueMessage.parsedIncomingMessage.event.bot_id) {
                logger.info("Message is a Bot generated. We don't allow bots to talk to each other (or to themselves), so it's not managed");
                return {
                    message: "Message is a Bot generated. We don't allow bots to talk to each other (or to themselves), so it's not managed",
                    preserveMessage: false
                }
            }

            incomingMessage = {
                expectedResponseType: 'chat',
                inputMessageFromUser: queueMessage.parsedIncomingMessage.event.text,
                requestChannelId: queueMessage.parsedIncomingMessage.event.channel,
                user: queueMessage.parsedIncomingMessage.event.user,
                responseUrl: queueMessage.parsedIncomingMessage.responseUrl
            }

            //@FIXME: this if clause stinks a lot
            if (queueMessage.parsedIncomingMessage.event.type &&
                (queueMessage.parsedIncomingMessage.event.type === "app_mention" ||
                    (queueMessage.parsedIncomingMessage.event.type === 'message' && queueMessage.parsedIncomingMessage.event.channel_type === 'im')
                )) {
                logger.info("Managing Bot Mention")
                try {
                    incomingMessage = await handleAppMention(incomingMessage)
                } catch (e) {
                    if (incomingMessage) {
                        incomingMessage.error = e
                        incomingMessage.chatPostMessageArguments = {
                            channel: queueMessage.parsedIncomingMessage.event.channel,
                            text: e.message || "Say what?"
                        }
                    }
                }
            }
        } else if (queueMessage.parsedIncomingMessage.type === 'block_actions') {

            incomingMessage = {
                expectedResponseType: 'chat',
                requestChannelId: queueMessage.parsedIncomingMessage.channel.id,
                user: queueMessage.parsedIncomingMessage.user.id,
                username: queueMessage.parsedIncomingMessage.user.name,
                actions: queueMessage.parsedIncomingMessage.actions,
                responseUrl: queueMessage.parsedIncomingMessage.response_url
            }

            try {
                incomingMessage = await handleAction(incomingMessage)
            } catch (e) {
                if (incomingMessage) {
                    incomingMessage.error = e
                    incomingMessage.chatPostMessageArguments = {
                        channel: queueMessage.parsedIncomingMessage.channel.id,
                        text: e.message || "Say what?"
                    }
                }
            }
        } else if (queueMessage.parsedIncomingMessage.Type === 'Notification') {
            incomingMessage = {
                expectedResponseType: 'chat',
                requestChannelId: process.env.SLACK_ALERT_CHANNEL_ID,
                inputMessageFromUser: queueMessage.parsedIncomingMessage.Message
            }

            try {
                incomingMessage = await handleNotification(incomingMessage)
            } catch (e) {
                if (incomingMessage) {
                    incomingMessage.error = e
                    incomingMessage.chatPostMessageArguments = {
                        channel: queueMessage.parsedIncomingMessage.channel.id,
                        text: e.message || "Say what?"
                    }
                }
            }
        }

        await sendMessageToSlackChannel(incomingMessage)
        return {message: "Message correctly sent to Slack channel.", preserveMessage: false}
    }
}
