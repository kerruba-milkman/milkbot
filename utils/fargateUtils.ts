import * as AWS from "aws-sdk";
import * as pino from "pino";

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})

export async function listServices(cluster?: string, region?: string, ecs?: AWS.ECS): Promise<void | AWS.ECS.ListServicesResponse> {
    if (!ecs)
        ecs = new AWS.ECS({
            apiVersion: '2014-11-13',
            region: region ? region : process.env.AWS_REGION
        })

    return new Promise(async (resolve, reject) => {
        let params = {
            cluster: cluster ? cluster : undefined,
            maxResults: 100
        }

        logger.info('Retrieving list of services of ' + cluster)
        let serviceList = ecs.listServices(params)

        await serviceList.promise().then((response) => {
            return resolve(response)
        }).catch((error) => {
            logger.error(error)
            return reject(error)
        })
    })
}

export async function describeServices(cluster: string, services: AWS.ECS.StringList, region?: string, ecs?: AWS.ECS): Promise<void | AWS.ECS.DescribeServicesResponse> {
    if (!ecs)
        ecs = new AWS.ECS({
            apiVersion: '2014-11-13',
            region: region ? region : process.env.AWS_REGION
        })

    return new Promise(async (resolve, reject) => {
        let params = {
            cluster,
            services
        }

        logger.info('Retrieving description of services of ')

        let taskList = ecs.describeServices(params)

        await taskList.promise().then((response) => {
            return resolve(response)
        }).catch((error) => {
            logger.error(error)
            return reject(error)
        })
    })
}

export async function updateService(params: AWS.ECS.UpdateServiceRequest, region?: string, ecs?: AWS.ECS): Promise<void | AWS.ECS.UpdateServiceResponse> {
    if (!ecs)
        ecs = new AWS.ECS({
            apiVersion: '2014-11-13',
            region: region ? region : process.env.AWS_REGION
        })

    return new Promise(async (resolve, reject) => {
        logger.info('Updating service')

        let taskList = ecs.updateService(params)

        await taskList.promise().then((response) => {
            return resolve(response)
        }).catch((error) => {
            logger.error(error)
            return reject(error)
        })
    })
}
