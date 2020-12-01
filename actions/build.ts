import {Block} from '@slack/web-api'
import {AwsBuild} from "../utils/codeBuildUtils";
import * as consts from '../consts'
import {CodeBuild} from "aws-sdk";

export async function build(service: string, commitHash: string, args): Promise<Block[]> {
    let blocks = []
    const tag = getTagToDeployFromArguments(args)

    let buildStatus = ''

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
        buildStatus = ':green_circle: Build successfully completed!'
    } catch (e) {
        buildStatus = `:red_circle: Error during build: ${e.message}`
    }

    const block = {
        type: 'section',
        text: {
            type: 'plain_text',
            text: buildStatus,
        }
    }
    const divider = {
        type: 'divider'
    }

    blocks.push(block)
    blocks.push(divider)

    return blocks
}

function getTagToDeployFromArguments(args: string): string {
    //get args array in format ['Key1=Value1', 'Key2=Value2']
    let splitArgs = args.split(",")

    for (let i = 0; i < splitArgs.length; i++) {
        let keyValue = splitArgs[i].split('=')
        if (keyValue[0] === consts.MILKBOT_ECR_TAG_ARG_NAME) {
            return keyValue[1]
        }
    }
    return undefined
}
