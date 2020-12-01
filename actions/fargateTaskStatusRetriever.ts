import * as AWS from 'aws-sdk'
import * as pino from "pino"
import {Block} from '@slack/web-api'

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})

AWS.config.update({
    region: process.env.AWS_REGION
})

const ecs = new AWS.ECS({
    apiVersion: '2014-11-13'
})

const listTasks = async (cluster: string, service: string): Promise<void | AWS.ECS.ListTasksResponse> => {

    //TODO test this and remove the return new Promise
    return new Promise((resolve, reject) => {
        let params = {
            cluster: cluster
        }

        logger.info('Retrieving list of tasks of ' + cluster)
        let taskList = ecs.listTasks(params)

        taskList.on('success', function (response) {
            return resolve(response.data)
        })
        taskList.on('error', function (response) {
            return reject(response)
        })

        taskList.send()
    })
}

const describeTasks = async (cluster: string, tasks: AWS.ECS.StringList): Promise<void | AWS.ECS.DescribeTasksResponse> => {

    //TODO test this and remove the return new Promise
    return new Promise((resolve, reject) => {
        let params = {
            cluster: cluster,
            tasks: tasks
        }

        logger.info('Retrieving description of tasks of ')

        let taskList = ecs.describeTasks(params)

        taskList.on('success', function (response) {
            return resolve(response.data)
        })
        taskList.on('error', function (response) {
            return reject(response)
        })

        taskList.send()
    })
}

export async function retrieveStatus(cluster: string, service?: string): Promise<Block[]> {
    const listTasksResponse = await listTasks(cluster, service)

    let blocks = []

    const emptyBlock = {
        type: "section",
        text: {
            type: "plain_text",
            text: "It was not possible to retrieve status data.",
            emoji: true
        }
    }

    if (!listTasksResponse) {
        blocks.push(emptyBlock)
        return blocks
    }

    const taskList = listTasksResponse.taskArns

    const describeTaskResponse = await describeTasks(cluster, taskList)
    if (!describeTaskResponse) {
        blocks.push(emptyBlock)
        return blocks
    }

    describeTaskResponse.tasks.reduce((acc, t) => {

        let taskDefArn = t.taskDefinitionArn
        let taskDefName = '*' + taskDefArn.split('/').pop() + '*';

        let containersStatus = ''

        containersStatus = t.containers.reduce((acc, container) => {
            let statusIcon = container.lastStatus === 'RUNNING' ? ':green_circle:' : ':red_circle:'
            acc += '\n\t' + statusIcon + ' ' + container.name + ' → *' + container.lastStatus + '*'
            return acc
        }, containersStatus)

        let section = {
            type: "section",
            text: {
                type: "mrkdwn",
                text: taskDefName + containersStatus,
            }
        }

        acc.push(section)

        return acc
    }, blocks)


    const divider = {
        type: "divider"
    }

    blocks.push(divider)

    return blocks
}


