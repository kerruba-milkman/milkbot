import * as AWS from 'aws-sdk'
import * as AWS_QA_ENV from 'aws-sdk'
import {CodeBuild} from 'aws-sdk'
import {Block} from '@slack/web-api'
import * as consts from '../consts'
import {ListServicesResponse} from "aws-sdk/clients/ecs";
import {AwsBuild} from "../utils/codeBuildUtils";
import {assumeRole} from "../utils/stsUtils";
import {listServices, updateService} from "../utils/fargateUtils";
import {Config} from '../config'

const logger = Config.logger

AWS.config.update({
    region: process.env.AWS_REGION
})
AWS_QA_ENV.config.update({
    region: process.env.AWS_QA_ENV_REGION
})

function getTagToDeployFromArguments(args: string): string {
    //get args array in format ['Key1=Value1', 'Key2=Value2']
    let splittedArgs = args.split(",")

    for (let i = 0; i < splittedArgs.length; i++) {
        let keyValue = splittedArgs[i].split('=')
        if (keyValue[0] === consts.MILKBOT_ECR_TAG_ARG_NAME) {
            return keyValue[1]
        }
    }
    return undefined
}

const deployInQAEnv = async (service: string, commitHash: string, args: string): Promise<string> => {

    let tag = getTagToDeployFromArguments(args);


    if (!tag) {
        throw new Error('Tag parameter is missing')
    }

    if (!consts.CODEBUILD_TO_FARGATE_SERVICE.hasOwnProperty(service)) {
        throw new Error('Service ' + service + ' is not managed by this bot')
    }

    if (!consts.MANAGED_ENV.hasOwnProperty(tag)) {
        throw new Error('Tag ' + tag + ' is not managed by this bot')
    }

    logger.info('Deploying of ' + commitHash + ' for service ' + service + ' for tag ' + tag)

    try {
        let options: CodeBuild.Types.StartBuildInput = {
            projectName: service,
            sourceVersion: commitHash,
            buildspecOverride: 'arn:aws:s3:::milkman-instances/buildspecs/' +
                consts.CODEBUILD_TO_FARGATE_SERVICE[service].buildspecFolder +
                '/buildspec.yml',
            environmentVariablesOverride: [
                {
                    name: "ENV_TAG",
                    value: tag
                }
            ]
        }

        let buildCommand = new AwsBuild()
        await buildCommand.startBuild(options)
        await buildCommand.waitCompletion()

        await restartService(service, tag)

        return `Build done with tag "${tag}" and service "${service}" has been restarted, please check logs`
    } catch (err) {
        logger.error("Error during the deploying process", err)
        return `Error during the deploying process: ${err}`
    }
}

function getServiceNameToRestart(listServicesResponse: ListServicesResponse, serviceToRestart: string): string {
    for (let i = 0; i < listServicesResponse.serviceArns.length; i++) {
        if (listServicesResponse.serviceArns[i].includes(serviceToRestart)) {
            serviceToRestart = listServicesResponse.serviceArns[i]
            //get only the name of the service, ARN is not needed
            return serviceToRestart.slice(serviceToRestart.lastIndexOf('/') + 1);
        }
    }
    throw 'No service name found to restart that match the string ' + serviceToRestart
}

async function restartService(service: string, tag: string): Promise<void> {
    //we must choose the role for restart using the tag

    for (let i = 0; i < consts.MANAGED_ENV[tag].length; ++i) {
        let environment = consts.MANAGED_ENV[tag][i]

        let assumedRole = await assumeRole(environment.deployRole)

        let assumedRoleCredentials = assumedRole['Credentials']

        let ecs = new AWS.ECS({
            apiVersion: '2014-11-13',
            accessKeyId: assumedRoleCredentials['AccessKeyId'],
            secretAccessKey: assumedRoleCredentials['SecretAccessKey'],
            sessionToken: assumedRoleCredentials['SessionToken'],
            region: environment.region
        })

        const listServicesResponse = await listServices(
            environment.cluster,
            environment.region,
            ecs)

        let serviceToRestart = consts.CODEBUILD_TO_FARGATE_SERVICE[service].serviceToRestart

        if (!listServicesResponse) {
            throw "can't find services"
        }

        let updateServiceParams = {
            forceNewDeployment: true,
            service: getServiceNameToRestart(listServicesResponse, serviceToRestart),
            cluster: environment.cluster
        }

        await updateService(updateServiceParams, environment.region, ecs)
    }
}

export async function deployForQA(service: string, commitHash: string, args): Promise<Block[]> {
    const buildStatus = await deployInQAEnv(service, commitHash, args)

    let blocks = []

    const block = {
        type: "section",
        text: {
            type: "plain_text",
            text: buildStatus,
            emoji: true
        }
    }

    blocks.push(block)

    const divider = {
        type: "divider"
    }

    blocks.push(divider)

    return blocks
}
