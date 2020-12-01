import {WebClient} from '@slack/web-api'
import * as AWS from 'aws-sdk'
import {QueueMessage} from "./interfaces/MessageInterfaces"

import {Config} from './config'
import {EventHandler, EventHandlerFactory} from "./eventHandlers/EventHandler";
import {parseQueueMessage} from "./utils/messageUtils";
import {moveMessageToDeadLettersQueue, removeMessageFromQueue} from "./utils/sqsUtils";

const logger = Config.logger

AWS.config.update({
    region: process.env.AWS_REGION
})

const sqs = new AWS.SQS({
    apiVersion: '2012-11-05'
})

const web = new WebClient(Config.token);


logger.info({
    queue: process.env.MAIN_QUEUE_URL,
    dlq: process.env.DEAD_LETTERS_QUEUE_URL,
    maxMessagesPerRequest: process.env.MAX_MESSAGES_PER_REQUEST,
    visibilityTimeout: process.env.VISIBILITY_TIMEOUT,
    waitTimeSeconds: process.env.WAIT_TIME_SECONDS,
    logLevel: process.env.LOG_LEVEL
}, 'env values')

export const pollForMessages = () => {
    // logger.debug(`Starting a poll cycle for messages on queue ${Config.mainQueueParams.QueueUrl}`)
    sqs.receiveMessage(Config.getQueueParameters(), function (err, data) {
        if (err) {
            logger.error(err, 'Error in polling data from SQS')
        } else {
            // logger.debug(data, 'Obtained a response from SQS')
            if (data.Messages) {
                logger.debug(`I received ${data.Messages.length} messages`)
                logger.debug(data.Messages[0].Body, 'Actual content')
                return processMessage(data)
            } else
                // logger.debug(`No messages retrieved from queue ${Config.mainQueueParams.QueueUrl}, starting another loop`)
                return pollForMessages()
        }
    })
}

const processMessage = async (data) => {
    await Promise.allSettled(data.Messages.map(async (message) => {
        return await manageMessage(message)
    }))
    // logger.debug(`Promise.all has finished`)
    return pollForMessages()
}

export const manageMessage = async (message) => {
    let queueMessage: QueueMessage
    try {
        queueMessage = parseQueueMessage(message)
    } catch (e) {
        logger.error(message, `Message Body is not a valid JSON string, sending message to dead letters queue`)
        await moveMessageToDeadLettersQueue(message)
        return
    }

    let eventHandler: EventHandler = EventHandlerFactory.createEventHandler(queueMessage.parsedMessageBody.headers)
    try {
        let outcome = await eventHandler.handleMessage(queueMessage)
        logger.info(outcome, `Response from Handler`)
        if (!outcome.preserveMessage) {
            logger.info(`Work has been done on message ${message.MessageId}, removing it from the queue`)
            await removeMessageFromQueue(message.ReceiptHandle)
        }
    } catch (e) {
        /**
         * We don't manage the retries explicitly here:
         * There's a dead-letter queue with a policy on redirection
         * Numero massimo di messaggi ricevuti    3
         * Coda DLQ    milkbot-dlq.fifo
         */
        logger.warn(e, "Error on sending to the remote side")
    }
    return
}


if (process.env.PROFILE && process.env.PROFILE.match(/test/i)) {
    logger.warn('Using TEST profile set to test, not starting bot')
} else {
    logger.info('Starting the bot, one step closer to world domination YAY!')
    logger.info(`Starting polling for messages`)
    pollForMessages()
}
