import {ClientConfiguration} from 'aws-sdk/clients/dynamodb'
import {ReceiveMessageRequest} from 'aws-sdk/clients/sqs'
import * as pino from 'pino'

class Config {
    static token = process.env.SLACK_BOT_TOKEN || 'unset'
    static logger = pino({
        name: 'main logger',
        level: process.env.LOG_LEVEL || 'trace'
    })
    static deadLettersQueueURL = process.env.DEAD_LETTERS_QUEUE_URL

    static getQueueParameters(): ReceiveMessageRequest {
        return {
            AttributeNames: [
                'ApproximateReceiveCount',
                'MessageGroupId'
            ],
            MaxNumberOfMessages: parseInt(process.env.MAX_MESSAGES_PER_REQUEST, 10),
            MessageAttributeNames: [
                'All'
            ],
            QueueUrl: process.env.MAIN_QUEUE_URL,
            VisibilityTimeout: parseInt(process.env.VISIBILITY_TIMEOUT, 10),
            WaitTimeSeconds: parseInt(process.env.WAIT_TIME_SECONDS, 10)
        }
    }

    private static dynamoDBOptions: ClientConfiguration = {}

    static getDynamoOptions(): ClientConfiguration {
        if (process.env.DYNAMODB_ENDPOINT) {
            this.dynamoDBOptions.apiVersion = '2012-08-10'
            this.dynamoDBOptions.endpoint = process.env.DYNAMODB_ENDPOINT
            this.dynamoDBOptions.region = 'eu-central-1'
        }
        return this.dynamoDBOptions
    }

    static getDynamoTableName(): string {
        return process.env.DYNAMODB_TABLENAME
    }
}

export {Config}
