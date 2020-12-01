import * as AWS from 'aws-sdk'
import * as pino from "pino"
import {Block} from '@slack/web-api'
import {DescribeServicesResponse} from 'aws-sdk/clients/ecs'
import {describeServices, listServices} from "../utils/fargateUtils";
import {chunk} from "../utils/arrayUtils";

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})

AWS.config.update({
    region: process.env.AWS_REGION
})

export async function retrieveStatus(cluster: string, service?: string): Promise<Block[]> {

    const listServicesResponse = await listServices(cluster)

    let blocks = []

    const emptyBlock = {
        type: "section",
        text: {
            type: "plain_text",
            text: "It was not possible to retrieve status data.",
            emoji: true
        }
    }

    if (!listServicesResponse) {
        blocks.push(emptyBlock)
        return blocks
    }

    const servicesList = listServicesResponse.serviceArns

    const servicesListChunks = chunk(servicesList, 10)

    let describeServicesResponse = await Promise.all(servicesListChunks.map(async (chunk) => {
        return await describeServices(cluster, chunk)
    }));

    if (!describeServicesResponse) {
        blocks.push(emptyBlock)
        return blocks
    }


    describeServicesResponse.map((response: DescribeServicesResponse) => {

        if (!response || !response.services) {
            blocks.push(emptyBlock)
            return blocks
        }

        response.services.reduce((acc, service) => {

            let serviceName = '*' + service.serviceName + '*';

            let statusIcon: string = ''

            if (service.runningCount >= 1 && service.desiredCount.toString() === service.runningCount.toString()) {
                statusIcon = ':green_circle:'
            } else if (service.pendingCount > 1) {
                statusIcon = ':yellow_circle:'
            } else {
                statusIcon = ':red_circle:'
            }

            let serviceCounters = "\n\tDesired: \t" + service.desiredCount
            serviceCounters += "\tPending: \t" + service.pendingCount
            serviceCounters += "\tRunning: \t" + service.runningCount

            let section = {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: statusIcon + " " + serviceName + serviceCounters,
                }
            }

            acc.push(section)

            return acc
        }, blocks)
    })


    const divider = {
        type: "divider"
    }

    blocks.push(divider)

    return blocks
}


