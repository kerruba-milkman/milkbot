import {Config} from "../config";
import * as AWS from "aws-sdk";
import {SQS} from "aws-sdk";

const logger = Config.logger
const sqs = new AWS.SQS({
    apiVersion: '2012-11-05'
})

export const removeMessageFromQueue = async (receiptHandle: string) => {
    const params = {
        QueueUrl: Config.getQueueParameters().QueueUrl,
        ReceiptHandle: receiptHandle
    }

    try {
        let data = await sqs.deleteMessage(params).promise()
        logger.info(data, `Deleted the message from the queue ${Config.getQueueParameters().QueueUrl}`)
        return data
    } catch (err) {
        logger.error(err)
        throw err
    }
}
export const addMessageToQueue = async (message) => {
    let targetQueue = Config.getQueueParameters().QueueUrl
    const params = {
        QueueUrl: targetQueue,
        MessageBody: JSON.stringify(message)
    }

    try {
        let data = await sqs.sendMessage(params).promise()
        logger.info(`Sent message to the queue ${targetQueue}`)
        return data
    } catch (err) {
        logger.error(err)
        throw err

    }
}

export const sendMessageToDeadLettersQueue = async (message: SQS.Types.Message) => {
    const params = {
        QueueUrl: Config.deadLettersQueueURL,
        MessageBody: JSON.stringify(message),
        MessageGroupId: 'bot'
    }

    try {
        let data = sqs.sendMessage(params).promise()
        logger.info(data, `Sent message message to deadLettersQueue ${Config.deadLettersQueueURL}`)
        return data
    } catch (err) {
        logger.error(err)
        throw err
    }

}
export const moveMessageToDeadLettersQueue = async (message: SQS.Types.Message) => {
    await removeMessageFromQueue(message.ReceiptHandle)
    await sendMessageToDeadLettersQueue(message)
}

export async function updateMessageVisibility(receiptHandle: string, visibilityTimeout: number) {

    let req = {
        QueueUrl: Config.getQueueParameters().QueueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeout
    }

    return sqs.changeMessageVisibility(req).promise()
}
